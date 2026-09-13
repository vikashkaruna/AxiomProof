'use client';

import React, { useState } from 'react';

interface ExportLedgerButtonProps {
  tenantId?: string;
  tenantName?: string;
  tenantSlug?: string;
  totalCount?: number;
}

export function ExportLedgerButton({
  tenantId,
  tenantName,
  tenantSlug = 'meridian',
  totalCount = 0,
}: ExportLedgerButtonProps) {
  const [status, setStatus] = useState<'idle' | 'exporting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleExport = async () => {
    if (status === 'exporting') return;
    setStatus('exporting');
    setErrorMessage(null);

    try {
      const params = new URLSearchParams({
        export: 'true',
      });
      if (tenantId) {
        params.set('tenantId', tenantId);
      }

      const res = await fetch(`/api/ledger?${params.toString()}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Export failed with status ${res.status}`);
      }

      const data = await res.json();
      const jsonBlob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const downloadUrl = URL.createObjectURL(jsonBlob);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.href = downloadUrl;
      const dateStr = new Date().toISOString().slice(0, 10);
      downloadAnchor.download = `axiom-ledger-audit-${tenantSlug}-${dateStr}.json`;
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      document.body.removeChild(downloadAnchor);
      URL.revokeObjectURL(downloadUrl);

      setStatus('success');
      setTimeout(() => {
        setStatus('idle');
      }, 3500);
    } catch (err: any) {
      console.error('Ledger export error:', err);
      setErrorMessage(err.message || 'Export failed');
      setStatus('error');
      setTimeout(() => {
        setStatus('idle');
        setErrorMessage(null);
      }, 4000);
    }
  };

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onClick={handleExport}
        disabled={status === 'exporting'}
        className={`rounded-lg border px-3.5 py-1.5 text-xs font-semibold transition-all shadow-2xs inline-flex items-center gap-2 ${
          status === 'success'
            ? 'border-teal-300 bg-teal-50 text-teal-800'
            : status === 'error'
              ? 'border-red-300 bg-red-50 text-red-800'
              : status === 'exporting'
                ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
        }`}
        title={
          status === 'exporting'
            ? 'Generating cryptographic audit bundle...'
            : `Export verified statutory audit trail for ${tenantName || 'auditor'}`
        }
      >
        {status === 'exporting' && (
          <>
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
            <span>Generating audit bundle...</span>
          </>
        )}
        {status === 'success' && (
          <>
            <span className="text-teal-600 font-bold">✓</span>
            <span>Export downloaded ({totalCount} records)</span>
          </>
        )}
        {status === 'error' && (
          <>
            <span className="text-red-500 font-bold">⚠</span>
            <span>{errorMessage || 'Export failed'}</span>
          </>
        )}
        {status === 'idle' && (
          <>
            <span>⬇</span>
            <span>Export ledger for auditor</span>
          </>
        )}
      </button>
    </div>
  );
}
