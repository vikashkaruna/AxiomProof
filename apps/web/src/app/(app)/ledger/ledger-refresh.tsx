'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@axiom/ui';

interface LedgerRefreshProps {
  runningCount: number;
}

export function LedgerRefresh({ runningCount }: LedgerRefreshProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  // Auto-refresh while agents are running
  useEffect(() => {
    if (runningCount <= 0) return;

    const interval = setInterval(() => {
      startTransition(() => {
        router.refresh();
        setLastRefreshed(new Date());
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [runningCount, router]);

  function handleManualRefresh() {
    startTransition(() => {
      router.refresh();
      setLastRefreshed(new Date());
    });
  }

  return (
    <div className="flex items-center gap-2">
      {runningCount > 0 ? (
        <span className="flex items-center gap-1.5 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-700 border border-teal-200">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500" />
          </span>
          Live streaming ({runningCount} active)
        </span>
      ) : (
        <span className="text-xs text-slate-400">
          Updated {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
      )}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleManualRefresh}
        disabled={isPending}
        className="text-xs text-slate-600 hover:text-slate-900"
      >
        {isPending ? 'Refreshing…' : '↻ Refresh'}
      </Button>
    </div>
  );
}
