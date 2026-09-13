'use client';

import React from 'react';

export interface ModuleCardRow {
  t: string;
  v: string;
  dot: string;
}

export interface ModuleCard {
  h: string;
  rows: ModuleCardRow[];
}

export interface GenericModuleMeta {
  title: string;
  hi: string;
  phase: string;
  agent?: string;
  autonomy: string;
  moduleId: string;
  desc: string;
  cards: ModuleCard[];
}

export function GenericModuleView({ meta }: { meta: GenericModuleMeta }) {
  return (
    <div className="mx-auto max-w-[1120px] space-y-5">
      {/* Banner */}
      <div className="rounded-2xl bg-gradient-to-br from-[#1E2A4A] to-[#243356] p-7 text-white shadow-sm">
        <div className="mb-2.5 flex items-center gap-2.5">
          <span className="rounded bg-[#0FB5A5] px-2 py-0.5 text-[9px] font-bold text-[#04322d]">
            {meta.phase}
          </span>
          {meta.agent && (
            <span className="text-xs font-semibold text-[#0FB5A5]">Agent · {meta.agent}</span>
          )}
          <span className="text-xs text-[#8a97b8]">Autonomy {meta.autonomy}</span>
        </div>

        <div className="flex items-baseline gap-3">
          <h1 className="font-heading text-2xl font-bold text-white">{meta.title}</h1>
          <span className="font-heading text-lg text-[#0FB5A5]">{meta.hi}</span>
        </div>

        <p className="mt-2 max-w-3xl text-xs leading-relaxed text-[#c7cfe0]">{meta.desc}</p>

        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] text-white">
          <span className="text-[#C9A227]">◆</span> Sold standalone or bundled · module {meta.moduleId}
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {meta.cards.map((c, idx) => (
          <div key={idx} className="rounded-2xl border border-[#e4e8ee] bg-white p-5 shadow-sm">
            <h2 className="mb-3 font-heading text-sm font-semibold text-[#1E2A4A]">{c.h}</h2>
            <div className="divide-y divide-[#eef1f5]">
              {c.rows.map((r, rIdx) => (
                <div key={rIdx} className="flex items-center gap-2.5 py-2.5">
                  <span
                    style={{ backgroundColor: r.dot }}
                    className="h-1.5 w-1.5 shrink-0 rounded-sm"
                  />
                  <span className="flex-1 text-xs text-[#2F3542]">{r.t}</span>
                  <span className="font-mono text-xs text-[#8a909b]">{r.v}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Status Note */}
      <div className="rounded-xl border border-[#ecdca8] bg-[#FBF6E7] p-4 text-xs text-[#7a5f10]">
        Fully hi-fi build of this module is staged — the marquee flows (Dashboard, Approval Console)
        are complete; this module screen carries live mock data and its final structure.
      </div>
    </div>
  );
}
