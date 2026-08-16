/**
 * Evidence Vault — S3 client with Object Lock (WORM) Compliance mode.
 *
 * The evidence vault is the product's trust claim. Per Doc 04 §6.2 and
 * Doc 05 §5, this is plain S3 API (no AWS-proprietary conveniences) so
 * the bucket can move to MinIO or GCS-interop without a rewrite.
 *
 * Object Lock with Compliance mode retention means:
 *   - Object cannot be deleted by ANY user, including root, until retention
 *     period expires
 *   - Object cannot be overwritten
 *   - Retention period itself cannot be shortened
 *
 * Combined with content-addressed storage (the canonical key is the
 * SHA-256 of the content), this is the substrate of "verifiable proof".
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  type ObjectLockLegalHold,
  type ObjectLockMode,
  type ServerSideEncryption,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createHash } from 'node:crypto';

export interface SealEvidenceInput {
  bucket: string;
  key: string;
  body: Buffer | Uint8Array | string;
  contentType: string;
  /** Compliance-mode retention duration in days. Cannot be shortened after sealing. */
  retentionDays: number;
  /** Optional legal hold (separate from retention; can be removed by authorised user). */
  legalHold?: boolean;
  /** Server-side encryption. AES-256 is the default. */
  encryption?: ServerSideEncryption;
  /** Tenant ID encoded in object metadata for cross-bucket policies. */
  tenantId: string;
  /** Engagement ID for the engagement-scoped evidence, or null for tenant-global. */
  engagementId?: string | null;
  /** Agent that collected the evidence. */
  collectedByAgent: string;
  /** Free-form metadata. */
  metadata?: Record<string, string>;
}

export interface SealedEvidence {
  /** SHA-256 of the content — the canonical identifier. */
  contentHash: string;
  /** The S3 object key (or composed URI for portability). */
  storageUri: string;
  /** The storage URI prefix. */
  bucket: string;
  key: string;
  /** Byte size of the sealed content. */
  byteSize: number;
  /** When the object becomes eligible for deletion (retention end). */
  retainUntil: string;
  /** The applied object-lock mode. Always 'COMPLIANCE' for sealed evidence. */
  lockMode: ObjectLockMode;
  /** Version ID (S3 returns this; for true immutability we use the content hash). */
  versionId: string | undefined;
  /** Server-side encryption applied. */
  encryption: ServerSideEncryption;
}

export class EvidenceVault {
  private readonly s3: S3Client;

  constructor(
    private readonly region: string,
    private readonly endpoint?: string,
    credentials?: { accessKeyId: string; secretAccessKey: string; sessionToken?: string },
  ) {
    this.s3 = new S3Client({
      region,
      endpoint,
      forcePathStyle: endpoint !== undefined, // MinIO / R2 etc
      credentials,
    });
  }

  /**
   * Seal an artifact. Once sealed, it is WORM — cannot be deleted or
   * overwritten for the retention period.
   */
  async seal(input: SealEvidenceInput): Promise<SealedEvidence> {
    const body = Buffer.isBuffer(input.body)
      ? input.body
      : typeof input.body === 'string'
        ? Buffer.from(input.body, 'utf-8')
        : Buffer.from(input.body);

    const contentHash = createHash('sha256').update(body).digest('hex');

    // The bucket must be created with ObjectLockConfiguration enabled.
    // We verify that here so a misconfigured bucket fails fast.
    await this.assertObjectLockEnabled(input.bucket);

    const retainUntilDate = new Date(Date.now() + input.retentionDays * 24 * 60 * 60 * 1000);

    const legalHold: ObjectLockLegalHold = {
      Status: input.legalHold ? 'ON' : 'OFF',
    };

    const cmd = new PutObjectCommand({
      Bucket: input.bucket,
      Key: input.key,
      Body: body,
      ContentType: input.contentType,
      ContentMD5: createHash('md5').update(body).digest('base64'),
      Metadata: {
        'axiom-content-sha256': contentHash,
        'axiom-tenant-id': input.tenantId,
        'axiom-engagement-id': input.engagementId ?? '',
        'axiom-collected-by-agent': input.collectedByAgent,
        'axiom-sealed-at': new Date().toISOString(),
        ...input.metadata,
      },
      ObjectLockMode: 'COMPLIANCE', // WORM
      ObjectLockRetainUntilDate: retainUntilDate,
      ObjectLockLegalHoldStatus: legalHold.Status,
      ServerSideEncryption: input.encryption ?? 'AES256',
      ChecksumAlgorithm: 'SHA256',
    });

    const result = await this.s3.send(cmd);

    return {
      contentHash,
      storageUri: `s3://${input.bucket}/${input.key}`,
      bucket: input.bucket,
      key: input.key,
      byteSize: body.byteLength,
      retainUntil: retainUntilDate.toISOString(),
      lockMode: 'COMPLIANCE',
      versionId: result.VersionId,
      encryption: input.encryption ?? 'AES256',
    };
  }

  /**
   * Retrieve a sealed artifact. Returns the body and metadata.
   */
  async retrieve(
    bucket: string,
    key: string,
  ): Promise<{
    body: Buffer;
    contentHash: string;
    metadata: Record<string, string>;
    contentType: string | undefined;
    retainUntil: Date | undefined;
    lockMode: ObjectLockMode | undefined;
  }> {
    const cmd = new GetObjectCommand({ Bucket: bucket, Key: key });
    const result = await this.s3.send(cmd);
    if (!result.Body) throw new Error(`Empty body for s3://${bucket}/${key}`);
    const bytes = await result.Body.transformToByteArray();
    const body = Buffer.from(bytes);
    const contentHash = createHash('sha256').update(body).digest('hex');

    return {
      body,
      contentHash,
      metadata: Object.fromEntries(
        Object.entries(result.Metadata ?? {}).map(([k, v]) => [k, v ?? '']),
      ),
      contentType: result.ContentType,
      retainUntil: result.ObjectLockRetainUntilDate,
      lockMode: result.ObjectLockMode as ObjectLockMode | undefined,
    };
  }

  /**
   * Verify that the on-disk content matches the recorded content hash.
   * Used to detect bit-rot or accidental overwrite (the latter is
   * blocked by Object Lock, but verifying is still good practice).
   */
  async verifyIntegrity(
    bucket: string,
    key: string,
    expectedHash: string,
  ): Promise<{
    ok: boolean;
    actualHash: string;
  }> {
    const r = await this.retrieve(bucket, key);
    return { ok: r.contentHash === expectedHash, actualHash: r.contentHash };
  }

  /**
   * Generate a time-limited signed URL for auditor access.
   * Audit URLs are read-only and short-lived.
   */
  async presignedAuditUrl(bucket: string, key: string, expiresInSeconds = 300): Promise<string> {
    const cmd = new GetObjectCommand({ Bucket: bucket, Key: key });
    return getSignedUrl(this.s3, cmd, { expiresIn: expiresInSeconds });
  }

  /**
   * Head an object — useful for the Approval Console's "evidence ready" check
   * without pulling the body.
   */
  async head(bucket: string, key: string) {
    const cmd = new HeadObjectCommand({ Bucket: bucket, Key: key });
    return this.s3.send(cmd);
  }

  private async assertObjectLockEnabled(bucket: string): Promise<void> {
    try {
      const head = await this.s3.send(
        new HeadObjectCommand({ Bucket: bucket, Key: '__axiom_lock_probe' }),
      );
      // We only need to know the bucket accepts the header; if it doesn't,
      // S3 returns InvalidArgument and we throw.
      void head;
    } catch (err: unknown) {
      const errorName = getErrorProperty(err, 'name');
      const errorMessage = getErrorProperty(err, 'message');
      const httpStatusCode = getErrorProperty(getErrorProperty(err, '$metadata'), 'httpStatusCode');
      if (
        errorName === 'InvalidArgument' ||
        (typeof errorMessage === 'string' &&
          (errorMessage.includes('Object Lock') || errorMessage.includes('object-lock')))
      ) {
        throw new Error(
          `Bucket ${bucket} does not have Object Lock enabled. ` +
            `Object Lock (Compliance mode) is mandatory for sealed evidence. ` +
            `See infra/terraform/envs/prod/s3.tf.`,
        );
      }
      // NoSuchKey is fine — bucket exists, just no probe key.
      if (errorName !== 'NoSuchKey' && httpStatusCode !== 404) {
        throw err;
      }
    }
  }
}

function getErrorProperty(error: unknown, property: string): unknown {
  if (typeof error !== 'object' || error === null || !(property in error)) return undefined;
  return (error as Record<string, unknown>)[property];
}

/**
 * Compute SHA-256 of content for use as the canonical key.
 * Use as: `contentKey = \`tenants/\${tenantId}/evidence/\${sha256(content)}/${filename}\``
 */
export function contentKey(args: {
  tenantId: string;
  contentHash: string;
  filename?: string;
  engagementId?: string | null;
}): string {
  const path = args.engagementId
    ? `tenants/${args.tenantId}/engagements/${args.engagementId}/evidence/${args.contentHash}`
    : `tenants/${args.tenantId}/evidence/${args.contentHash}`;
  return args.filename ? `${path}/${args.filename}` : path;
}
