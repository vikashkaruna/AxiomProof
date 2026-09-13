'use client';

import React, { useState } from 'react';
import { AgentIcon } from '@axiom/ui';

interface Purpose {
  id: string;
  en: string;
  hi: string;
  req: boolean;
  enabled: boolean;
}

export default function ConsentPage() {
  const [lang, setLang] = useState<'en' | 'hi'>('en');
  const [purposes, setPurposes] = useState<Purpose[]>([
    {
      id: 'p1',
      en: 'Core platform authentication & account services',
      hi: 'मुख्य प्लेटफ़ॉर्म प्रमाणीकरण और खाता सेवाएँ',
      req: true,
      enabled: true,
    },
    {
      id: 'p2',
      en: 'Security audit logging & fraud prevention',
      hi: 'सुरक्षा ऑडिट लॉगिंग और धोखाधड़ी रोकथाम',
      req: true,
      enabled: true,
    },
    {
      id: 'p3',
      en: 'Statutory compliance reporting under DPDP Act',
      hi: 'डीपीडीपी अधिनियम के तहत वैधानिक अनुपालन रिपोर्टिंग',
      req: true,
      enabled: true,
    },
    {
      id: 'p4',
      en: 'Personalized product recommendations & updates',
      hi: 'वैयक्तिकृत उत्पाद सिफ़ारिशें और अपडेट',
      req: false,
      enabled: true,
    },
    {
      id: 'p5',
      en: 'Third-party credit risk assessment sharing',
      hi: 'तृतीय-पक्ष क्रेडिट जोखिम मूल्यांकन साझाकरण',
      req: false,
      enabled: false,
    },
  ]);

  const togglePurpose = (id: string) => {
    setPurposes((prev) =>
      prev.map((p) => {
        if (p.id === id && !p.req) {
          return { ...p, enabled: !p.enabled };
        }
        return p;
      }),
    );
  };

  const isEn = lang === 'en';

  return (
    <div className="mx-auto max-w-[1180px] space-y-5 animate-in fade-in-0 duration-200">
      {/* ============================================================ */}
      {/* 1. HERO BANNER                                               */}
      {/* ============================================================ */}
      <div className="rounded-2xl bg-gradient-to-br from-[#1E2A4A] via-[#1E2A4A] to-[#243356] p-6 md:p-7 text-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex-1 min-w-[280px]">
            <div className="mb-2 flex items-center gap-2">
              <span className="rounded bg-[#0FB5A5] px-2 py-0.5 text-[9px] font-bold text-[#04322d] uppercase tracking-wider">
                P3 · M3.8
              </span>
              <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-[#0FB5A5]">
                <span>Agent ·</span>
                <span className="inline-flex items-center gap-1">
                  <AgentIcon agent="lekha" size="xs" variant="on-dark" state="working" />
                  <span>Lekha</span>
                </span>
                <span className="text-[#0FB5A5]/70">+</span>
                <span className="inline-flex items-center gap-1">
                  <AgentIcon agent="consent" size="xs" variant="on-dark" state="idle" />
                  <span>Consent</span>
                </span>
              </div>
              <span className="text-xs text-[#8a97b8]">Autonomy L2</span>
              <span className="rounded bg-white/10 px-2 py-0.5 font-mono text-[10px] text-[#C9A227]">
                DPDPA §5 & §6 Multilingual Notice
              </span>
            </div>
            <div className="flex items-baseline gap-3">
              <h1 className="font-heading text-2xl md:text-[26px] font-bold text-white tracking-tight">
                Consent Manager
              </h1>
              <span className="font-heading text-lg text-[#0FB5A5] font-normal">सहमति प्रबंधन</span>
            </div>
            <p className="mt-2 max-w-2xl text-xs leading-relaxed text-[#c7cfe0]">
              Cookie + purpose-based consent capture, consent ledger with 7-year retention and
              withdrawal workflow. English + Hindi at launch.
            </p>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. EXACT CARDS: CONSENT LEDGER & PURPOSES                     */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-[#e4e8ee] bg-white p-5 shadow-2xs">
          <h2 className="font-heading text-sm font-semibold text-[#1E2A4A] mb-3">Consent ledger</h2>
          <div className="divide-y divide-[#eef1f5]">
            <div className="flex items-center gap-2.5 py-2.5">
              <span className="h-1.5 w-1.5 rounded-sm bg-[#0FB5A5]" />
              <span className="flex-1 text-xs text-[#2F3542] font-medium">Active consents</span>
              <span className="font-mono text-xs font-semibold text-[#1E2A4A]">182,400</span>
            </div>
            <div className="flex items-center gap-2.5 py-2.5">
              <span className="h-1.5 w-1.5 rounded-sm bg-[#C9A227]" />
              <span className="flex-1 text-xs text-[#2F3542] font-medium">Withdrawals (30d)</span>
              <span className="font-mono text-xs font-semibold text-[#1E2A4A]">1,204</span>
            </div>
            <div className="flex items-center gap-2.5 py-2.5">
              <span className="h-1.5 w-1.5 rounded-sm bg-[#C9A227]" />
              <span className="flex-1 text-xs text-[#2F3542] font-medium">Retention</span>
              <span className="font-mono text-xs font-semibold text-[#1E2A4A]">7 years</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#e4e8ee] bg-white p-5 shadow-2xs">
          <h2 className="font-heading text-sm font-semibold text-[#1E2A4A] mb-3">Purposes</h2>
          <div className="divide-y divide-[#eef1f5]">
            <div className="flex items-center gap-2.5 py-2.5">
              <span className="h-1.5 w-1.5 rounded-sm bg-[#1E2A4A]" />
              <span className="flex-1 text-xs text-[#2F3542] font-medium">Registered purposes</span>
              <span className="font-mono text-xs font-semibold text-[#1E2A4A]">11</span>
            </div>
            <div className="flex items-center gap-2.5 py-2.5">
              <span className="h-1.5 w-1.5 rounded-sm bg-[#1E2A4A]" />
              <span className="flex-1 text-xs text-[#2F3542] font-medium">Languages</span>
              <span className="font-mono text-xs font-semibold text-[#1E2A4A]">EN · HI</span>
            </div>
            <div className="flex items-center gap-2.5 py-2.5">
              <span className="h-1.5 w-1.5 rounded-sm bg-slate-400" />
              <span className="flex-1 text-xs text-[#2F3542] font-medium">Notice version</span>
              <span className="font-mono text-xs font-semibold text-[#1E2A4A]">v3</span>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. 2-COLUMN LAYOUT: LEDGER EVENTS + NOTICE PREVIEW           */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_420px] items-start">
        {/* Left: Stats + Immutable Consent Ledger */}
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-[#e4e8ee] bg-white p-3.5 shadow-2xs">
              <div className="font-heading text-xl font-bold text-[#0FB5A5]">182,400</div>
              <div className="text-[11px] text-[#8a909b]">active consents</div>
            </div>
            <div className="rounded-xl border border-[#e4e8ee] bg-white p-3.5 shadow-2xs">
              <div className="font-heading text-xl font-bold text-[#8a6d10]">1,204</div>
              <div className="text-[11px] text-[#8a909b]">withdrawals (30d)</div>
            </div>
            <div className="rounded-xl border border-[#e4e8ee] bg-white p-3.5 shadow-2xs">
              <div className="font-heading text-xl font-bold text-[#C9A227]">7 yrs</div>
              <div className="text-[11px] text-[#8a909b]">WORM retention</div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[#e4e8ee] bg-white shadow-2xs">
            <div className="border-b border-[#e4e8ee] bg-[#F4F6F8] px-5 py-3 text-xs font-semibold text-[#2F3542]">
              Consent ledger — recent events (immutable, 7-yr retention)
            </div>
            <div className="divide-y divide-[#eef1f5] font-mono text-xs">
              <div className="flex items-center justify-between px-5 py-3 hover:bg-slate-50/60 transition-colors">
                <span className="text-[#2F3542]">
                  p-77213 · <b className="text-[#0FB5A5]">GRANTED</b> · p1,p2,p3,p4 · notice v3
                </span>
                <span className="text-[#8a909b]">11:40:02</span>
              </div>
              <div className="flex items-center justify-between px-5 py-3 hover:bg-slate-50/60 transition-colors">
                <span className="text-[#D9534F]">
                  p-77198 · <b>WITHDRAWN</b> · p4 marketing
                </span>
                <span className="text-[#8a909b]">11:22:51</span>
              </div>
              <div className="flex items-center justify-between px-5 py-3 hover:bg-slate-50/60 transition-colors">
                <span className="text-[#2F3542]">
                  p-77190 · <b className="text-[#0FB5A5]">GRANTED</b> · p1,p2,p3 · notice v3 · hi
                </span>
                <span className="text-[#8a909b]">10:58:14</span>
              </div>
              <div className="flex items-center justify-between px-5 py-3 hover:bg-slate-50/60 transition-colors">
                <span className="text-[#8a6d10]">
                  p-77181 · <b>WITHDRAWN</b> → erasure queued (RTS-04)
                </span>
                <span className="text-[#8a909b]">10:31:09</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Live Interactive Consent Notice Preview (Sticky) */}
        <div className="overflow-hidden rounded-2xl border border-[#e4e8ee] bg-white shadow-2xs sticky top-4">
          <div className="flex items-center justify-between bg-[#1E2A4A] px-5 py-3.5 text-white">
            <span className="text-xs font-semibold">Consent notice · live preview</span>
            <div className="flex rounded-md bg-white/10 p-0.5">
              <button
                type="button"
                onClick={() => setLang('en')}
                className={`rounded px-2.5 py-0.5 text-xs font-semibold transition-colors ${
                  isEn ? 'bg-white text-[#1E2A4A]' : 'text-white/70 hover:text-white'
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLang('hi')}
                className={`rounded px-2.5 py-0.5 text-xs font-semibold transition-colors ${
                  !isEn ? 'bg-white text-[#1E2A4A]' : 'text-white/70 hover:text-white'
                }`}
              >
                हिन्दी
              </button>
            </div>
          </div>

          <div className="p-5 space-y-4">
            <div>
              <h2 className="font-heading text-base font-bold text-[#1E2A4A]">
                {isEn
                  ? 'Notice for Processing of Personal Data'
                  : 'व्यक्तिगत डेटा प्रसंस्करण हेतु सूचना'}
              </h2>
              <p className="mt-1 text-xs text-[#8a909b] leading-relaxed">
                {isEn
                  ? 'In compliance with Section 5 of the DPDP Act 2023, please review and select the purposes for which you consent to your personal data being processed.'
                  : 'डीपीडीपी अधिनियम 2023 की धारा 5 के अनुपालन में, कृपया उन उद्देश्यों की समीक्षा करें और चुनें जिनके लिए आप अपने व्यक्तिगत डेटा के प्रसंस्करण की सहमति देते हैं।'}
              </p>
            </div>

            <div className="divide-y divide-[#eef1f5]">
              {purposes.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-3 gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-[#2F3542]">{isEn ? p.en : p.hi}</div>
                    <div className="text-[10px] text-[#8a909b]">
                      {p.req
                        ? isEn
                          ? 'Statutory requirement · non-revocable'
                          : 'वैधानिक आवश्यकता · अनिवार्य'
                        : isEn
                          ? 'Optional · revocable anytime'
                          : 'वैकल्पिक · कभी भी वापस लेने योग्य'}
                    </div>
                  </div>

                  <div
                    onClick={() => togglePurpose(p.id)}
                    className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                      p.enabled ? 'bg-[#0FB5A5]' : 'bg-[#cfd6e0]'
                    } ${p.req ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'}`}
                  >
                    <span
                      className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                        p.enabled ? 'left-[18px]' : 'left-0.5'
                      }`}
                    />
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => alert('Consent preferences updated and written to Lekha WORM ledger.')}
              className="w-full rounded-lg bg-[#0FB5A5] py-2.5 text-center text-xs font-bold text-white shadow-xs transition-all hover:bg-[#0a8d80]"
            >
              {isEn ? 'Save consent preferences' : 'सहमति प्राथमिकताएं सहेजें'}
            </button>
            <div className="text-center font-mono text-[9.5px] text-[#8a909b]">
              every grant/withdrawal → consent ledger · Lekha
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
