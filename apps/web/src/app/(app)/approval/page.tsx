'use client';

import React, { useState } from 'react';

interface ActionItem {
  id: string;
  title: string;
  type: string;
  risk: 'LOW' | 'MED' | 'HIGH';
  target: string;
  blast: number;
  why: string;
  citation: string;
  riskReason: string;
  dryAge: string;
  dryHash: string;
  rollbackRef: string;
  rollback: string;
  blastCards: Array<{ v: string; l: string }>;
  diff: Array<{ sign: string; text: string; style: string }>;
}

const ACTIONS_DATA: ActionItem[] = [
  {
    id: 'ACT-01',
    title: 'Purge expired KYC records past 5-yr retention',
    type: 'delete.records',
    risk: 'MED',
    target: 'pg.prod · kyc_documents',
    blast: 1840,
    why: 'Retention control fails — KYC docs held beyond the 5-year statutory limit with no lawful basis to retain.',
    citation: 'DPDP Act §8(7) · Rule 8 · Ctrl RET-03',
    riskReason:
      'Deletes production rows. Reversible from sealed pre-state snapshot; non-cascading; no downstream FK dependents.',
    dryAge: '8 min ago',
    dryHash: 'a3f0…9c1',
    rollbackRef: 'RB-118a',
    rollback:
      'Restore the 1,840 deleted rows from the sealed pre-state snapshot (evidence e-8841) into kyc_documents, preserving original primary keys and timestamps.',
    blastCards: [
      { v: '1,840', l: 'records' },
      { v: '1', l: 'system' },
      { v: '0', l: 'users affected' },
    ],
    diff: [
      {
        sign: '-',
        text: 'kyc_documents: 1,840 rows WHERE created_at < 2021-08-01',
        style: 'bg-[#FCEEEC] text-[#a03734]',
      },
      {
        sign: ' ',
        text: 'retained rows: 42,110 (unchanged)',
        style: 'text-[#5b6270]',
      },
      {
        sign: '+',
        text: 'evidence e-8841: pre-state snapshot sealed (WORM)',
        style: 'bg-[#E5FAF7] text-[#0a6b61]',
      },
    ],
  },
  {
    id: 'ACT-02',
    title: 'Deploy purpose-based consent notice v3 (EN + HI)',
    type: 'config.publish',
    risk: 'LOW',
    target: 'cmp.notice_config',
    blast: 1,
    why: 'Notice control fails — current consent notice lacks itemised purposes and a Hindi rendering required at launch.',
    citation: 'DPDP Act §5 · Rule 3 · Ctrl NOT-01',
    riskReason:
      'Config publish, no data mutation. Instantly reversible by re-pointing to prior notice version.',
    dryAge: '8 min ago',
    dryHash: '7b22…4de',
    rollbackRef: 'RB-118b',
    rollback:
      'Re-point cmp.notice_config to notice v2 (previous published version); no principal records touched.',
    blastCards: [
      { v: '1', l: 'config object' },
      { v: '0', l: 'records' },
      { v: 'all', l: 'future consents' },
    ],
    diff: [
      {
        sign: '~',
        text: 'notice.version: v2 → v3',
        style: 'bg-[#FBF3DF] text-[#8a6d10]',
      },
      {
        sign: '+',
        text: 'notice.purposes: +6 itemised purposes',
        style: 'bg-[#E5FAF7] text-[#0a6b61]',
      },
      {
        sign: '+',
        text: 'notice.lang: +hi (Hindi)',
        style: 'bg-[#E5FAF7] text-[#0a6b61]',
      },
    ],
  },
  {
    id: 'ACT-03',
    title: 'Revoke over-broad S3 read grant on pii-exports bucket',
    type: 'iam.scope',
    risk: 'MED',
    target: 'aws.s3 · pii-exports',
    blast: 14,
    why: 'Least-privilege control fails — 14 IAM principals hold read on a bucket containing exported personal data.',
    citation: 'DPDP Act §8(4) · Ctrl SEC-06',
    riskReason:
      'Removes access for 14 principals. Some may be legitimate; scoped to a reviewed allowlist. Fully reversible.',
    dryAge: '9 min ago',
    dryHash: 'c910…22a',
    rollbackRef: 'RB-118c',
    rollback:
      'Re-attach the prior bucket policy document (versioned in evidence e-8843) restoring all 14 grants.',
    blastCards: [
      { v: '14', l: 'IAM principals' },
      { v: '1', l: 'bucket' },
      { v: '0', l: 'objects' },
    ],
    diff: [
      {
        sign: '-',
        text: 's3:GetObject removed for 11 of 14 principals',
        style: 'bg-[#FCEEEC] text-[#a03734]',
      },
      {
        sign: ' ',
        text: '3 principals retained (reviewed allowlist)',
        style: 'text-[#5b6270]',
      },
      {
        sign: '+',
        text: 'bucket policy prev-version sealed e-8843',
        style: 'bg-[#E5FAF7] text-[#0a6b61]',
      },
    ],
  },
  {
    id: 'ACT-04',
    title: 'Anonymize archived telemetry in cold warehouse',
    type: 'mask.fields',
    risk: 'LOW',
    target: 'bq.analytics · raw_logs_2022',
    blast: 95000,
    why: 'Direct identifier retention limit exceeded — IP and device UUIDs unmasked past statutory need.',
    citation: 'DPDP Act §8(7) · Ctrl RET-02',
    riskReason:
      'In-place SHA-256 HMAC pseudonymization with salt stored in KMS. Non-production analytical views updated.',
    dryAge: '11 min ago',
    dryHash: '5e41…8f2',
    rollbackRef: 'RB-118d',
    rollback: 'Revert to cold snapshot table snapshot_2022_pre_anon in BigQuery dataset.',
    blastCards: [
      { v: '95,000', l: 'rows' },
      { v: '2', l: 'columns' },
      { v: '0', l: 'production impact' },
    ],
    diff: [
      {
        sign: '-',
        text: 'ip_address: raw IPv4 string → sha256(ip + salt)',
        style: 'bg-[#FCEEEC] text-[#a03734]',
      },
      {
        sign: '+',
        text: 'device_uuid: raw UUID → hmac_sha256(uuid, kms_key)',
        style: 'bg-[#E5FAF7] text-[#0a6b61]',
      },
    ],
  },
  {
    id: 'ACT-05',
    title: 'Enforce AES-256 column encryption on aadhaar_vault',
    type: 'crypto.encrypt',
    risk: 'HIGH',
    target: 'pg.prod · identity_store',
    blast: 4200,
    why: 'Statutory mandate for encryption at rest of national identity identifiers.',
    citation: 'DPDP Act §8(4) · Rule 6 · Ctrl SEC-01',
    riskReason:
      'Column rewrites require schema lock and re-indexing. Scheduled during maintenance window.',
    dryAge: '14 min ago',
    dryHash: '8b19…3aa',
    rollbackRef: 'RB-118e',
    rollback: 'Decryption script verified against test harness; KMS decrypt grant pre-validated.',
    blastCards: [
      { v: '4,200', l: 'records' },
      { v: '1', l: 'table' },
      { v: '0', l: 'downtime' },
    ],
    diff: [
      {
        sign: '-',
        text: 'aadhaar_number: plaintext VARCHAR(12)',
        style: 'bg-[#FCEEEC] text-[#a03734]',
      },
      {
        sign: '+',
        text: 'aadhaar_number: BYTEA encrypted using AWS KMS arn:aws:kms:ap-south-1:...',
        style: 'bg-[#E5FAF7] text-[#0a6b61]',
      },
    ],
  },
  {
    id: 'ACT-06',
    title: 'Register Data Protection Board breach webhook notification template',
    type: 'webhook.register',
    risk: 'LOW',
    target: 'gateway.alerts · dpb_incident_relay',
    blast: 1,
    why: 'Rule 11 compliance — 72-hour statutory notification mechanism readiness.',
    citation: 'DPDP Act §8(6) · Rule 11 · Ctrl BRC-01',
    riskReason: 'Readiness registration only; no alerts dispatched.',
    dryAge: '15 min ago',
    dryHash: '3d90…1bb',
    rollbackRef: 'RB-118f',
    rollback: 'Disable webhook endpoint flag in gateway.alerts configuration.',
    blastCards: [
      { v: '1', l: 'endpoint' },
      { v: '0', l: 'data changes' },
      { v: '100%', l: 'verified' },
    ],
    diff: [
      {
        sign: '+',
        text: 'dpb_alert_endpoint: https://api.dpb.gov.in/v1/incidents/report',
        style: 'bg-[#E5FAF7] text-[#0a6b61]',
      },
      {
        sign: '+',
        text: 'payload_schema: dpdpa_schema_v2.json',
        style: 'bg-[#E5FAF7] text-[#0a6b61]',
      },
    ],
  },
];

type ActionStatus =
  'pending' | 'approved' | 'executing' | 'executed' | 'verified' | 'rejected' | 'deferred';

export default function ApprovalConsolePage() {
  const [selected, setSelected] = useState<Record<string, boolean>>({ 'ACT-01': true });
  const [statuses, setStatuses] = useState<Record<string, ActionStatus>>({});
  const [selId, setSelId] = useState<string>('ACT-01');

  const selectedAction = ACTIONS_DATA.find((a) => a.id === selId) || ACTIONS_DATA[0]!;

  const selectedIds = Object.keys(selected).filter((id) => selected[id]);
  const selectedCount = selectedIds.length;
  const allSelected = ACTIONS_DATA.every((a) => selected[a.id]);

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelected({});
    } else {
      const next: Record<string, boolean> = {};
      for (const a of ACTIONS_DATA) {
        if ((statuses[a.id] || 'pending') === 'pending') {
          next[a.id] = true;
        }
      }
      setSelected(next);
    }
  };

  const setActionStatus = (ids: string[], st: ActionStatus) => {
    setStatuses((prev) => {
      const next = { ...prev };
      for (const id of ids) next[id] = st;
      return next;
    });
  };

  const runExecution = (ids: string[]) => {
    setActionStatus(ids, 'approved');
    setTimeout(() => setActionStatus(ids, 'executing'), 450);
    setTimeout(() => setActionStatus(ids, 'executed'), 1600);
    setTimeout(() => {
      setActionStatus(ids, 'verified');
      setSelected({});
    }, 2700);
  };

  const approveSelected = () => {
    if (selectedIds.length) runExecution(selectedIds);
  };

  const approveAll = () => {
    const ids = ACTIONS_DATA.filter((a) => (statuses[a.id] || 'pending') === 'pending').map(
      (a) => a.id,
    );
    if (ids.length) runExecution(ids);
  };

  const rejectSelected = () => {
    if (selectedIds.length) {
      setActionStatus(selectedIds, 'rejected');
      setSelected({});
    }
  };

  const deferSelected = () => {
    if (selectedIds.length) {
      setActionStatus(selectedIds, 'deferred');
      setSelected({});
    }
  };

  const riskBadgeStyle = (r: 'LOW' | 'MED' | 'HIGH') => {
    if (r === 'HIGH') return 'bg-[#FCEEEC] text-[#D9534F]';
    if (r === 'MED') return 'bg-[#FBF3DF] text-[#8a6d10]';
    return 'bg-[#E5FAF7] text-[#0a8d80]';
  };

  const statusBadge = (st: ActionStatus) => {
    switch (st) {
      case 'approved':
        return (
          <span className="bg-[#E5FAF7] text-[#0a8d80] px-1.5 py-0.5 rounded text-[8.5px] font-bold">
            APPROVED
          </span>
        );
      case 'executing':
        return (
          <span className="bg-[#FBF3DF] text-[#8a6d10] px-1.5 py-0.5 rounded text-[8.5px] font-bold animate-pulse">
            EXECUTING…
          </span>
        );
      case 'executed':
        return (
          <span className="bg-[#1E2A4A] text-white px-1.5 py-0.5 rounded text-[8.5px] font-bold">
            EXECUTED
          </span>
        );
      case 'verified':
        return (
          <span className="bg-[#0FB5A5] text-white px-1.5 py-0.5 rounded text-[8.5px] font-bold">
            ✓ VERIFIED
          </span>
        );
      case 'rejected':
        return (
          <span className="bg-[#FCEEEC] text-[#D9534F] px-1.5 py-0.5 rounded text-[8.5px] font-bold">
            REJECTED
          </span>
        );
      case 'deferred':
        return (
          <span className="bg-[#F4F6F8] text-[#5b6270] px-1.5 py-0.5 rounded text-[8.5px] font-bold">
            DEFERRED
          </span>
        );
      default:
        return null;
    }
  };

  const approvedTotal = ACTIONS_DATA.filter((a) =>
    ['approved', 'executing', 'executed', 'verified'].includes(statuses[a.id] || ''),
  ).length;

  return (
    <div className="mx-auto max-w-[1240px] space-y-4">
      {/* Plan Header Card */}
      <div className="flex flex-wrap items-center justify-between gap-6 rounded-2xl border border-[#e4e8ee] bg-white p-5 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="font-heading text-xl font-bold text-[#1E2A4A]">
              Retention & erasure remediation
            </h1>
            <span className="rounded-md bg-[#F4F6F8] px-2 py-0.5 font-mono text-[10.5px] text-[#5b6270]">
              PLN-2026-08 · v3
            </span>
          </div>
          <div className="text-xs text-[#8a909b]">
            Planned by <b className="text-[#2F3542]">Sudhaar</b> · Closes 4 RET controls · rollback
            plan generated for every action · Sudhaar holds no write access
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="text-center">
            <div className="font-heading text-2xl font-bold text-[#1E2A4A]">
              {approvedTotal}/{ACTIONS_DATA.length}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-[#8a909b]">approved</div>
          </div>
          <div className="text-center">
            <div className="font-heading text-2xl font-bold text-[#2F3542]">1,855</div>
            <div className="text-[10px] uppercase tracking-wider text-[#8a909b]">
              records in scope
            </div>
          </div>
          <div className="text-center">
            <div className="font-heading text-2xl font-bold text-[#E0A82E]">Production</div>
            <div className="text-[10px] uppercase tracking-wider text-[#8a909b]">environment</div>
          </div>
        </div>
      </div>

      {/* Main Approval Grid: Left List + Right Action Detail */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[420px_minmax(0,1fr)]">
        {/* Left: Action List */}
        <div className="overflow-hidden rounded-2xl border border-[#e4e8ee] bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-[#e4e8ee] bg-[#F4F6F8] px-4 py-3">
            <span className="text-xs font-semibold text-[#2F3542]">
              {ACTIONS_DATA.length} typed actions
            </span>
            <button
              onClick={toggleSelectAll}
              className="text-xs font-semibold text-[#0a8d80] hover:underline"
            >
              {allSelected ? 'Deselect all' : 'Select all pending'}
            </button>
          </div>

          <div className="max-h-[580px] divide-y divide-[#eef1f5] overflow-y-auto">
            {ACTIONS_DATA.map((a) => {
              const st = statuses[a.id] || 'pending';
              const isSel = !!selected[a.id];
              const isCur = a.id === selId;
              const locked = st !== 'pending';

              return (
                <div
                  key={a.id}
                  onClick={() => setSelId(a.id)}
                  className={`flex cursor-pointer items-start gap-3 p-3.5 transition-colors ${
                    isCur
                      ? 'border-l-[3px] border-[#0FB5A5] bg-[#F4F6F8]'
                      : 'border-l-[3px] border-transparent hover:bg-[#F4F6F8]/60'
                  }`}
                >
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!locked) {
                        setSelected((prev) => ({ ...prev, [a.id]: !prev[a.id] }));
                      }
                    }}
                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] font-bold text-white transition-colors ${
                      isSel ? 'border-[#0FB5A5] bg-[#0FB5A5]' : 'border-[#c4ccd8] bg-white'
                    } ${locked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                  >
                    {isSel && '✓'}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[9.5px] text-[#8a909b]">{a.id}</span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[8.5px] font-semibold ${riskBadgeStyle(
                          a.risk,
                        )}`}
                      >
                        {a.risk}
                      </span>
                      {statusBadge(st)}
                    </div>
                    <div className="mt-1 truncate text-xs font-semibold text-[#2F3542]">
                      {a.title}
                    </div>
                    <div className="mt-0.5 text-[10.5px] text-[#8a909b]">
                      {a.target} · {a.blast} records
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Action Detail Card */}
        <div className="overflow-hidden rounded-2xl border border-[#e4e8ee] bg-white shadow-sm">
          <div className="border-b border-[#e4e8ee] p-5">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-[#8a909b]">{selectedAction.id}</span>
              <span
                className={`rounded px-2 py-0.5 text-[9px] font-semibold ${riskBadgeStyle(
                  selectedAction.risk,
                )}`}
              >
                {selectedAction.risk} RISK
              </span>
              <span className="rounded bg-[#F4F6F8] px-2 py-0.5 text-[9px] font-semibold text-[#5b6270]">
                {selectedAction.type}
              </span>
            </div>
            <h2 className="mt-2 font-heading text-xl font-bold text-[#1E2A4A]">
              {selectedAction.title}
            </h2>
          </div>

          <div className="space-y-5 p-5">
            {/* Why + How Risky */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-[#8a909b]">
                  Why — gap it closes
                </div>
                <div className="text-xs leading-relaxed text-[#2F3542]">{selectedAction.why}</div>
                <div className="font-mono text-[10.5px] text-[#0a8d80]">
                  {selectedAction.citation}
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-[#8a909b]">
                  How risky · why
                </div>
                <div className="text-xs leading-relaxed text-[#2F3542]">
                  {selectedAction.riskReason}
                </div>
              </div>
            </div>

            {/* Blast Radius */}
            <div className="flex gap-3">
              {selectedAction.blastCards.map((b, i) => (
                <div key={i} className="flex-1 rounded-xl bg-[#F4F6F8] p-3">
                  <div className="font-heading text-xl font-bold text-[#1E2A4A]">{b.v}</div>
                  <div className="text-[10.5px] text-[#8a909b]">{b.l}</div>
                </div>
              ))}
            </div>

            {/* Dry-run diff */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-[#8a909b]">
                  What changes — dry-run diff
                </div>
                <span className="text-[10.5px] font-semibold text-[#0a8d80]">
                  ✓ dry-run passed {selectedAction.dryAge} · hash {selectedAction.dryHash}
                </span>
              </div>
              <div className="divide-y divide-[#eef1f5] overflow-hidden rounded-xl border border-[#e4e8ee] font-mono text-xs">
                {selectedAction.diff.map((d, i) => (
                  <div key={i} className={`flex items-start gap-2 p-2.5 ${d.style}`}>
                    <span className="w-3 text-center text-[#8a909b]">{d.sign}</span>
                    <span className="flex-1">{d.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Rollback Plan */}
            <div className="rounded-xl border border-[#bfe8e3] bg-[#E5FAF7] p-4">
              <div className="mb-1.5 flex items-center gap-2">
                <span>↺</span>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#0a8d80]">
                  How to undo — generated rollback plan
                </span>
              </div>
              <p className="text-xs leading-relaxed text-[#2F3542]">{selectedAction.rollback}</p>
              <div className="mt-2 font-mono text-[10.5px] text-[#0a8d80]">
                rollback validated executable · dry-run-able · {selectedAction.rollbackRef}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Approval Bar */}
      <div className="sticky bottom-4 z-20 flex flex-wrap items-center gap-3 rounded-2xl border border-[#e4e8ee] bg-white p-4 shadow-xl">
        <div className="flex-1 text-xs text-[#5b6270]">
          <b className="text-[#1E2A4A]">{selectedCount} selected</b> · Approval issues a signed,
          scope-bound, single-use token validated per action —{' '}
          <span className="text-[#8a909b]">execution is architecturally impossible without it</span>
        </div>

        <button
          onClick={rejectSelected}
          disabled={selectedCount === 0}
          className="rounded-lg border border-[#D9534F] px-4 py-2 text-xs font-semibold text-[#D9534F] transition-colors hover:bg-[#FCEEEC] disabled:opacity-40"
        >
          Reject with reason
        </button>

        <button
          onClick={deferSelected}
          disabled={selectedCount === 0}
          className="rounded-lg border border-[#e4e8ee] px-4 py-2 text-xs font-semibold text-[#5b6270] transition-colors hover:bg-[#F4F6F8] disabled:opacity-40"
        >
          Defer
        </button>

        <button
          onClick={approveSelected}
          disabled={selectedCount === 0}
          className="rounded-lg bg-[#0FB5A5] px-4 py-2 text-xs font-bold text-white shadow-md transition-all hover:bg-[#0a8d80] disabled:opacity-40"
        >
          Approve selected → Karya executes
        </button>

        <button
          onClick={approveAll}
          className="rounded-lg bg-[#1E2A4A] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#182238]"
        >
          Approve all {ACTIONS_DATA.length}
        </button>
      </div>
    </div>
  );
}
