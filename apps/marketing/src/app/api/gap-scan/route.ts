import { NextResponse } from 'next/server';
import { GapScanSubmitSchema } from '@axiom/types';
import { computeGapScanReport } from '@/lib/gap-scan-scoring';
import { saveGapScanSubmission } from '@/lib/gap-scan-store';
import { createHash, randomUUID } from 'node:crypto';

export const runtime = 'nodejs';

/**
 * Public gap-scan endpoint — anonymous, no auth required.
 * Computes a posture score + estimated exposure against the v0.1.0 control
 * library, persists the response, and returns the report ID.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: 'invalid_body', message: 'Request body must be JSON' } },
      { status: 400 },
    );
  }

  const parsed = GapScanSubmitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: 'validation_failed',
          message: 'Invalid gap-scan submission',
          details: parsed.error.flatten(),
        },
      },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
  const ua = request.headers.get('user-agent') ?? 'unknown';
  const sessionHash = createHash('sha256').update(`${input.sessionId}|${ip}|${ua}`).digest('hex');

  const report = await computeGapScanReport(input.answers);
  const scanId = randomUUID();

  const savedId = await saveGapScanSubmission({
    id: scanId,
    session_id: sessionHash,
    sector: input.sector,
    employee_band: input.employeeBand,
    processes_children_data: input.processesChildrenData,
    is_sdf: input.isSdf,
    answers: input.answers,
    report_snapshot: report,
    library_version: '0.1.0',
    posture_score: report.postureScore,
    estimated_exposure_inr: report.estimatedExposureInr,
    contact_name: input.contactName,
    contact_email: input.contactEmail,
    contact_company: input.contactCompany,
    follow_up_requested: input.followUpRequested,
    marketing_consent: input.marketingConsent,
    created_at: new Date().toISOString(),
  });

  const response = NextResponse.json({
    id: savedId,
    postureScore: report.postureScore,
    estimatedExposureInr: report.estimatedExposureInr,
    findingsCount: report.findings.length,
  });
  const isLocalOrInsecure =
    process.env.ENVIRONMENT === 'local' ||
    process.env.ENVIRONMENT === 'development' ||
    process.env.ENVIRONMENT === 'staging' ||
    process.env.NODE_ENV !== 'production' ||
    !request.url.startsWith('https:');

  response.cookies.set('gap_scan_access', sessionHash, {
    httpOnly: true,
    sameSite: 'lax',
    secure: !isLocalOrInsecure,
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });
  return response;
}
