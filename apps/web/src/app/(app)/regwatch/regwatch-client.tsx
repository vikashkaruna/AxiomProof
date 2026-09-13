'use client';

import React, { useState } from 'react';
import { AgentIcon } from '@axiom/ui';

export interface RegulatoryFeed {
  id: string;
  name: string;
  authority: string;
  endpoint: string;
  scope: string;
  lastScan: string;
  status: 'active' | 'synced' | 'polling';
  frequency: string;
  latencyMs: number;
}

export interface CapturedIntelItem {
  id: string;
  title: string;
  authority: string;
  citation: string;
  capturedAt: string;
  whatCaptured: string;
  howImproved: string;
  controls: string[];
  assignee: string;
  status: 'aligned' | 'remediated' | 'verified';
}

const MONITORED_FEEDS: RegulatoryFeed[] = [
  {
    id: 'FEED-MEITY',
    name: 'MeitY Official Gazette Feeds',
    authority: 'Ministry of Electronics & IT',
    endpoint: 'egazette.gov.in & meity.gov.in/notifications',
    scope: 'Notifications under DPDPA §40, Consent Manager Specs, SDF Criteria, Form Rules',
    lastScan: '14 mins ago',
    status: 'synced',
    frequency: 'Continuous Webhook + 15m Poller',
    latencyMs: 142,
  },
  {
    id: 'FEED-DPB',
    name: 'Data Protection Board of India (DPB)',
    authority: 'DPB Adjudications Office',
    endpoint: 'dpb.gov.in/adjudications & dpb.gov.in/guidance',
    scope:
      'Inquiry procedures, Penal determination guidelines, Data Principal rights interpretations',
    lastScan: '28 mins ago',
    status: 'synced',
    frequency: '30m Poller',
    latencyMs: 186,
  },
  {
    id: 'FEED-CERTIN',
    name: 'CERT-In Cyber Security Directions',
    authority: 'Indian Computer Emergency Response Team',
    endpoint: 'cert-in.org.in/advisories',
    scope: '6-Hour Breach Reporting mandates, 365-day WORM log retention, cryptographic guidelines',
    lastScan: '8 mins ago',
    status: 'synced',
    frequency: '10m Poller',
    latencyMs: 98,
  },
  {
    id: 'FEED-COURTS',
    name: 'High Courts & Appellate Tribunals',
    authority: 'Delhi High Court & TDSAT',
    endpoint: 'dhc.nic.in/judgments & tdsat.gov.in/orders',
    scope:
      'Judicial precedents on Data Principal rights, processing proportionality, algorithmic bias',
    lastScan: '1 hour ago',
    status: 'synced',
    frequency: 'Hourly Poller',
    latencyMs: 230,
  },
  {
    id: 'FEED-BIS',
    name: 'Bureau of Indian Standards (BIS)',
    authority: 'BIS Technical Committees',
    endpoint: 'bis.gov.in/standards/it-privacy',
    scope: 'IS/ISO 27701 Privacy Information Management & IS 17428 Data Privacy standards',
    lastScan: '3 hours ago',
    status: 'synced',
    frequency: '6-Hour Poller',
    latencyMs: 310,
  },
];

const INITIAL_INTEL: CapturedIntelItem[] = [
  {
    id: 'INTEL-2026-091',
    title: 'MeitY Notification S.O. 1124(E) — Mandatory Parental Consent Standard for Minors',
    authority: 'MeitY Official Gazette',
    citation: 'DPDPA Section 9(1) & Rule 6',
    capturedAt: '11 Sep 2026, 14:30 IST',
    whatCaptured:
      'Gazetted notification prescribing verifiable parental consent via tokenized Aadhaar or DigiLocker mechanisms before processing any personal data of individuals below 18 years.',
    howImproved:
      'Nazar automatically mapped this notification to controls PRN-02 & CON-04. Sudhaar drafted an automated verification rule in remediation plan v2.4, mitigating potential ₹50 Cr statutory non-compliance exposure.',
    controls: ['PRN-02', 'CON-04'],
    assignee: 'Legal & Identity Ops Team',
    status: 'aligned',
  },
  {
    id: 'INTEL-2026-088',
    title: 'DPB Advisory 04/2026 — Deemed Consent Limits in Employment Processing',
    authority: 'Data Protection Board of India',
    citation: 'DPDPA Section 7(b) & Rule 8',
    capturedAt: '08 Sep 2026, 09:15 IST',
    whatCaptured:
      'Clarification issued by DPB affirming that deemed consent for employment purposes cannot extend to employee biometric or continuous telemetry monitoring without explicit standalone notice.',
    howImproved:
      'Halted proposed biometric attendance caching across client internal HRMS. Replaced with privacy-preserving cryptographic hash tokens and standalone bilingual notice.',
    controls: ['EMP-01', 'NOT-03'],
    assignee: 'People Ops & DPO',
    status: 'remediated',
  },
  {
    id: 'INTEL-2026-084',
    title: 'CERT-In Cyber Advisory 2026-88 — Forensic Evidence WORM Retention Mandate',
    authority: 'CERT-In Directions',
    citation: 'CERT-In Direction §4(2) & DPDPA §8(5)',
    capturedAt: '04 Sep 2026, 18:45 IST',
    whatCaptured:
      'Mandatory direction requiring all fiduciaries to preserve immutable (WORM) audit logs and administrative mutation commands for a minimum of 365 calendar days.',
    howImproved:
      'Validated AWS S3 Object Lock configuration in ap-south-1 Compliance mode. Confirmed append-only PostgreSQL ledger writer permissions (no UPDATE/DELETE granted).',
    controls: ['SEC-09', 'AUD-01'],
    assignee: 'SecOps Platform Architecture',
    status: 'verified',
  },
  {
    id: 'INTEL-2026-079',
    title:
      'Delhi High Court Ruling (W.P.(C) 4192/2026) — Injunction on Overseas Analytics Telemetry',
    authority: 'High Court of Delhi',
    citation: 'DPDPA Section 6(1) Jurisprudence',
    capturedAt: '29 Aug 2026, 11:20 IST',
    whatCaptured:
      'Judicial ruling establishing that background mobile analytics SDKs transmitting persistent device identifiers to non-Indian servers without explicit consent violate Section 6.',
    howImproved:
      'Drishti discovery agent executed automated dependency scan across mobile applications. Removed 2 legacy analytics SDKs, eliminating cross-border data transfer non-compliance.',
    controls: ['SDK-02', 'XBR-01'],
    assignee: 'Mobile Core Engineering',
    status: 'remediated',
  },
  {
    id: 'INTEL-2026-072',
    title: 'MeitY Consent Manager Technical Registry API Specification v2.1',
    authority: 'MeitY Technical Registry',
    citation: 'DPDPA Section 6(7) & Schedule IV',
    capturedAt: '22 Aug 2026, 16:00 IST',
    whatCaptured:
      'Standardized interoperable JSON schema for instantaneous consent revocation webhooks between registered consent managers and data fiduciaries.',
    howImproved:
      'Synchronized Axiom Consent Engine API endpoints; reduced consent revocation propagation time from 4 hours to under 30 seconds, maintaining 100% compliance SLA.',
    controls: ['CON-06'],
    assignee: 'API Platform Team',
    status: 'aligned',
  },
];

export function RegWatchClient({ daysRemaining }: { daysRemaining: number }) {
  const [feeds, setFeeds] = useState<RegulatoryFeed[]>(MONITORED_FEEDS);
  const [intelList, setIntelList] = useState<CapturedIntelItem[]>(INITIAL_INTEL);
  const [scanning, setScanning] = useState(false);
  const [scanStep, setScanStep] = useState<string | null>(null);
  const [scanSuccess, setScanSuccess] = useState<string | null>(null);
  const [filterAuth, setFilterAuth] = useState<string>('all');

  const filteredIntel = intelList.filter((item) => {
    if (filterAuth === 'all') return true;
    return item.authority.toLowerCase().includes(filterAuth.toLowerCase());
  });

  const handleRunScan = () => {
    setScanning(true);
    setScanSuccess(null);
    setScanStep('Connecting to MeitY Official Gazette RSS & Webhook…');

    setTimeout(() => {
      setScanStep('Querying Data Protection Board of India adjudications feed…');
    }, 600);

    setTimeout(() => {
      setScanStep('Parsing CERT-In Cyber Security advisories and compliance directives…');
    }, 1200);

    setTimeout(() => {
      setScanStep('Checking Delhi HC & TDSAT judicial appellate registries…');
    }, 1800);

    setTimeout(() => {
      // Update feeds timestamps
      setFeeds((prev) =>
        prev.map((f) => ({
          ...f,
          lastScan: 'Just now',
          latencyMs: Math.round(80 + Math.random() * 80),
        })),
      );

      // Optionally insert a fresh simulated capture if desired
      setScanning(false);
      setScanStep(null);
      setScanSuccess(
        'Surveillance scan complete. Polled 5 regulatory authorities in 2.3s. Control library v25.11.3 verified — zero statutory drift detected.',
      );
    }, 2400);
  };

  return (
    <div className="mx-auto max-w-[1180px] space-y-6 animate-in fade-in-0 duration-200">
      {/* ============================================================ */}
      {/* 1. HERO BANNER                                               */}
      {/* ============================================================ */}
      <div className="rounded-2xl bg-gradient-to-br from-[#1E2A4A] via-[#1E2A4A] to-[#243356] p-6 md:p-7 text-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex-1 min-w-[280px]">
            <div className="mb-2 flex items-center gap-2 flex-wrap">
              <span className="rounded bg-[#0FB5A5] px-2 py-0.5 text-[9px] font-bold text-[#04322d] uppercase tracking-wider">
                P2 · M2.9
              </span>
              <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-[#0FB5A5]">
                <span>Agent ·</span>
                <span className="inline-flex items-center gap-1">
                  <AgentIcon agent="nazar" size="xs" variant="on-dark" state="working" />
                  <span>Nazar</span>
                </span>
              </div>
              <span className="text-xs text-[#8a97b8]">Automated Regulatory Radar</span>
              <span className="rounded bg-white/10 px-2 py-0.5 font-mono text-[10px] text-[#C9A227]">
                Continuous Surveillance
              </span>
            </div>
            <div className="flex items-baseline gap-3">
              <h1 className="font-heading text-2xl md:text-[26px] font-bold text-white tracking-tight">
                Regulatory Watch & Statutory Intelligence
              </h1>
              <span className="font-heading text-lg text-[#0FB5A5] font-normal">
                नियामक निगरानी
              </span>
            </div>
            <p className="mt-2 max-w-2xl text-xs leading-relaxed text-[#c7cfe0]">
              Nazar continuously monitors MeitY gazette notifications, Data Protection Board
              adjudications, CERT-In cybersecurity directives, and High Court rulings in real-time.
              Every statutory update is automatically mapped to controls and verified for impact.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRunScan}
            disabled={scanning}
            className="rounded-[9px] bg-[#0FB5A5] hover:bg-[#0da294] px-4 py-2.5 text-xs font-bold text-white transition-all shadow-xs cursor-pointer flex items-center gap-2 disabled:opacity-50"
          >
            {scanning ? (
              <>
                <span className="animate-spin">⟳</span> Scanning Feeds…
              </>
            ) : (
              <>
                <span>⚡</span> Run Live Gazette Scan
              </>
            )}
          </button>
        </div>

        {/* Scan Progress Feedback */}
        {scanning && scanStep && (
          <div className="mt-4 rounded-xl bg-white/10 p-3 text-xs text-[#0FB5A5] flex items-center gap-2 animate-pulse">
            <span className="animate-spin">⟳</span>
            <span>{scanStep}</span>
          </div>
        )}

        {/* 3 Metric Mini Cards */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-white/10 pt-5">
          <div className="rounded-xl bg-white/5 p-3.5 backdrop-blur-xs">
            <div className="text-[10px] font-bold text-[#8a97b8] uppercase tracking-wider">
              Enforcement Countdown
            </div>
            <div className="mt-1 font-mono text-xl font-bold text-white">{daysRemaining} Days</div>
            <div className="text-[11px] text-[#c7cfe0]">Target: 13 May 2027 statutory deadline</div>
          </div>
          <div className="rounded-xl bg-white/5 p-3.5 backdrop-blur-xs">
            <div className="text-[10px] font-bold text-[#8a97b8] uppercase tracking-wider">
              Monitored Statutory Authorities
            </div>
            <div className="mt-1 font-mono text-xl font-bold text-[#0FB5A5]">5 Channels Active</div>
            <div className="text-[11px] text-[#c7cfe0]">MeitY, DPB, CERT-In, High Courts, BIS</div>
          </div>
          <div className="rounded-xl bg-white/5 p-3.5 backdrop-blur-xs">
            <div className="text-[10px] font-bold text-[#8a97b8] uppercase tracking-wider">
              Aligned Control Library
            </div>
            <div className="mt-1 font-mono text-xl font-bold text-[#C9A227]">v25.11.3</div>
            <div className="text-[11px] text-[#c7cfe0]">
              0 unmapped drift · 100% statutory coverage
            </div>
          </div>
        </div>
      </div>

      {/* Scan Success Toast */}
      {scanSuccess && (
        <div className="flex items-center justify-between rounded-xl border border-teal-300 bg-[#E5FAF7] p-3 text-xs text-[#04322d] shadow-sm animate-in fade-in-0 duration-150">
          <div className="flex items-center gap-2">
            <span>✓</span>
            <span className="font-semibold">{scanSuccess}</span>
          </div>
          <button
            onClick={() => setScanSuccess(null)}
            className="text-xs font-bold opacity-60 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. MONITORED RADAR FEEDS (WHERE & WHAT WATCHED, LAST SCANS)  */}
      {/* ============================================================ */}
      <div className="rounded-2xl border border-[#e4e8ee] bg-white p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="font-heading text-sm font-bold text-[#1E2A4A] uppercase tracking-wider">
              Monitored Surveillance Radar
            </h2>
            <p className="text-xs text-slate-500">
              Where Nazar watches statutory directives and their real-time telemetry health
            </p>
          </div>
          <span className="rounded-md bg-teal-50 px-2.5 py-1 text-xs font-bold text-teal-800 border border-teal-200">
            5 Feeds Synchronized
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {feeds.map((feed) => (
            <div
              key={feed.id}
              className="rounded-xl border border-slate-200 bg-[#F4F6F8]/60 p-4 space-y-2 hover:border-teal-400 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-bold text-xs text-[#1E2A4A]">{feed.name}</div>
                  <div className="text-[10.5px] text-slate-500">{feed.authority}</div>
                </div>
                <span className="flex items-center gap-1 rounded-full bg-[#E5FAF7] px-2 py-0.5 text-[9px] font-bold text-[#0a8d80]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#0FB5A5] animate-pulse" />
                  LIVE
                </span>
              </div>

              <div className="rounded bg-white p-2 text-[10px] font-mono text-slate-600 border border-slate-200 break-all">
                {feed.endpoint}
              </div>

              <p className="text-[11px] text-slate-600 leading-snug line-clamp-2">{feed.scope}</p>

              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10.5px] text-slate-500">
                <span>
                  Last scan: <strong>{feed.lastScan}</strong>
                </span>
                <span className="font-mono">{feed.latencyMs}ms</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. CAPTURED REGULATORY INTEL FEED (WHAT, WHEN, HOW IMPROVED) */}
      {/* ============================================================ */}
      <div className="rounded-2xl border border-[#e4e8ee] bg-white overflow-hidden shadow-2xs space-y-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-4 border-b border-[#e4e8ee] bg-[#F4F6F8] gap-3">
          <div>
            <h2 className="font-heading text-sm font-bold text-[#1E2A4A] uppercase tracking-wider">
              Captured Regulatory Updates & Compliance Impact ({filteredIntel.length})
            </h2>
            <p className="text-xs text-slate-500">
              Real-time audit log of what was captured, statutory impact, and how compliance was
              improved
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 text-xs">
            {[
              { id: 'all', label: 'All Updates' },
              { id: 'meity', label: 'MeitY' },
              { id: 'dpb', label: 'DPB' },
              { id: 'cert', label: 'CERT-In' },
              { id: 'court', label: 'Courts' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterAuth(tab.id)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                  filterAuth === tab.id
                    ? 'bg-white text-[#1E2A4A] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-[#eef1f5]">
          {filteredIntel.map((item) => (
            <div key={item.id} className="p-5 hover:bg-slate-50/70 transition-colors space-y-3">
              {/* Header: Title, Authority, Timestamp */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <code className="font-mono text-xs font-bold text-[#1E2A4A]">{item.id}</code>
                  <span className="rounded bg-[#1E2A4A] text-white px-2 py-0.5 text-[9px] font-bold uppercase">
                    {item.authority}
                  </span>
                  <span className="font-mono text-xs text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 font-semibold">
                    {item.citation}
                  </span>
                </div>
                <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                  <span>Captured:</span>
                  <strong className="text-slate-700">{item.capturedAt}</strong>
                </div>
              </div>

              <h3 className="text-sm font-bold text-[#1E2A4A]">{item.title}</h3>

              {/* What Captured Card */}
              <div className="rounded-xl bg-[#F4F6F8] p-3 text-xs text-slate-700">
                <strong className="text-slate-800 uppercase tracking-wider text-[10px] block mb-0.5">
                  What Was Captured:
                </strong>
                {item.whatCaptured}
              </div>

              {/* How Improved Compliance Card */}
              <div className="rounded-xl border border-teal-200 bg-[#E5FAF7] p-3 text-xs text-[#04322d]">
                <strong className="text-[#0a6b61] uppercase tracking-wider text-[10px] block mb-0.5">
                  How It Improved / Will Improve Compliance:
                </strong>
                {item.howImproved}
              </div>

              {/* Footer: Controls Affected, Assignee, Status */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium text-slate-500">Impacted Controls:</span>
                  {item.controls.map((ctrl, cIdx) => (
                    <span
                      key={cIdx}
                      className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-700 border border-slate-200"
                    >
                      {ctrl}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-slate-500">
                    Remediation Assigned: <strong>{item.assignee}</strong>
                  </span>
                  <span className="rounded bg-teal-100 text-teal-900 px-2 py-0.5 text-[10px] font-bold">
                    ✓ {item.status.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
