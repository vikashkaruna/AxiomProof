'use client';

import React from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

export interface LedgerFiltersProps {
  totalCount: number;
  filteredCount: number;
}

const AGENTS = [
  { value: 'drishti', label: 'Drishti · Discovery' },
  { value: 'vibhaag', label: 'Vibhaag · Classification' },
  { value: 'parikshan', label: 'Parikshan · Assessment' },
  { value: 'saakshi', label: 'Saakshi · Evidence' },
  { value: 'sudhaar', label: 'Sudhaar · Remediation' },
  { value: 'karya', label: 'Karya · Execution' },
  { value: 'lekha', label: 'Lekha · Audit' },
  { value: 'nazar', label: 'Nazar · RegWatch' },
  { value: 'prativedan', label: 'Prativedan · Reports' },
  { value: 'sanket', label: 'Sanket · Signal' },
  { value: 'human', label: 'Human Approver' },
  { value: 'system', label: 'System Engine' },
];

const ACTION_CATEGORIES = [
  { value: 'discovery', label: 'Discovery actions' },
  { value: 'classification', label: 'Classification actions' },
  { value: 'assessment', label: 'Assessment actions' },
  { value: 'evidence', label: 'Evidence actions' },
  { value: 'plan', label: 'Plan & blueprint' },
  { value: 'approval', label: 'Approval tokens' },
  { value: 'execution', label: 'Execution actions' },
  { value: 'verification', label: 'Verification checks' },
  { value: 'dsar', label: 'DSAR actions' },
  { value: 'breach', label: 'Breach operations' },
];

const RESULTS = [
  { value: 'success', label: 'Success' },
  { value: 'failure', label: 'Failure' },
  { value: 'pending', label: 'Pending / Running' },
  { value: 'rolled_back', label: 'Rolled back' },
  { value: 'skipped', label: 'Skipped' },
];

export function LedgerFilters({ totalCount, filteredCount }: LedgerFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentAgent = searchParams.get('agent') ?? '';
  const currentAction = searchParams.get('action') ?? '';
  const currentResult = searchParams.get('result') ?? '';
  const currentQ = searchParams.get('q') ?? '';

  const hasActiveFilters = Boolean(currentAgent || currentAction || currentResult || currentQ);

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const clearAllFilters = () => {
    router.push(pathname);
  };

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const q = (formData.get('q') as string) || '';
    updateParam('q', q.trim());
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
      {/* Primary Filter Bar */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Search Query Input */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[220px]">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            type="text"
            name="q"
            defaultValue={currentQ}
            placeholder="Search by Seq #, correlation ID, target ref…"
            className="h-9 w-full rounded-lg border border-slate-300 bg-slate-50/50 pl-9 pr-8 text-xs text-slate-800 placeholder-slate-400 transition-colors focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
          {currentQ && (
            <button
              type="button"
              onClick={() => updateParam('q', '')}
              className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-xs text-slate-400 hover:text-slate-700"
              title="Clear search"
            >
              ✕
            </button>
          )}
        </form>

        {/* Agent / Actor Selector */}
        <div className="relative min-w-[150px]">
          <select
            value={currentAgent}
            onChange={(e) => updateParam('agent', e.target.value)}
            className="h-9 w-full rounded-lg border border-slate-300 bg-slate-50/50 px-2.5 text-xs font-medium text-slate-700 transition-colors hover:bg-white focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
            aria-label="Filter by Actor"
          >
            <option value="">All actors ({AGENTS.length})</option>
            {AGENTS.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </div>

        {/* Action Category Selector */}
        <div className="relative min-w-[150px]">
          <select
            value={currentAction}
            onChange={(e) => updateParam('action', e.target.value)}
            className="h-9 w-full rounded-lg border border-slate-300 bg-slate-50/50 px-2.5 text-xs font-medium text-slate-700 transition-colors hover:bg-white focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
            aria-label="Filter by Action Type"
          >
            <option value="">All action chains</option>
            {ACTION_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* Result Status Selector */}
        <div className="relative min-w-[130px]">
          <select
            value={currentResult}
            onChange={(e) => updateParam('result', e.target.value)}
            className="h-9 w-full rounded-lg border border-slate-300 bg-slate-50/50 px-2.5 text-xs font-medium text-slate-700 transition-colors hover:bg-white focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
            aria-label="Filter by Result"
          >
            <option value="">All results</option>
            {RESULTS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearAllFilters}
            className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
          >
            Reset
          </button>
        )}
      </div>

      {/* Active Filter Chips & Match Count */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2.5 text-[11px] text-slate-500">
        <div className="flex flex-wrap items-center gap-1.5">
          <span>Showing</span>
          <strong className="font-semibold text-slate-800">{filteredCount}</strong>
          <span>of {totalCount} total entries</span>

          {hasActiveFilters && (
            <div className="ml-2 flex flex-wrap items-center gap-1.5">
              {currentQ && (
                <span className="inline-flex items-center gap-1 rounded-md bg-mist-100 px-2 py-0.5 font-medium text-slate-700">
                  Search: <code className="font-mono text-[10px]">{currentQ}</code>
                  <button
                    type="button"
                    onClick={() => updateParam('q', '')}
                    className="hover:text-ember-600"
                  >
                    ✕
                  </button>
                </span>
              )}
              {currentAgent && (
                <span className="inline-flex items-center gap-1 rounded-md bg-teal-50 px-2 py-0.5 font-medium text-teal-800 border border-teal-200">
                  Actor: {currentAgent}
                  <button
                    type="button"
                    onClick={() => updateParam('agent', '')}
                    className="hover:text-ember-600"
                  >
                    ✕
                  </button>
                </span>
              )}
              {currentAction && (
                <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 font-medium text-indigo-800 border border-indigo-200">
                  Chain: {currentAction}
                  <button
                    type="button"
                    onClick={() => updateParam('action', '')}
                    className="hover:text-ember-600"
                  >
                    ✕
                  </button>
                </span>
              )}
              {currentResult && (
                <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-800">
                  Result: {currentResult}
                  <button
                    type="button"
                    onClick={() => updateParam('result', '')}
                    className="hover:text-ember-600"
                  >
                    ✕
                  </button>
                </span>
              )}
            </div>
          )}
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearAllFilters}
            className="text-teal-700 hover:text-teal-900 font-medium hover:underline"
          >
            Clear all filters
          </button>
        )}
      </div>
    </div>
  );
}
