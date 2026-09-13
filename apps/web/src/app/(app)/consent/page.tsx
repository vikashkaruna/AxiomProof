'use client';

import React, { useState } from 'react';

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
    <div className="mx-auto max-w-[1180px] space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        {/* Left: Stats + Immutable Consent Ledger */}
        <div className="space-y-4">
          {/* Stat Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-[#e4e8ee] bg-white p-4 shadow-sm">
              <div className="font-heading text-2xl font-bold text-[#0FB5A5]">182,400</div>
              <div className="text-xs text-[#8a909b]">active consents</div>
            </div>
            <div className="rounded-xl border border-[#e4e8ee] bg-white p-4 shadow-sm">
              <div className="font-heading text-2xl font-bold text-[#8a6d10]">1,204</div>
              <div className="text-xs text-[#8a909b]">withdrawals (30d)</div>
            </div>
            <div className="rounded-xl border border-[#e4e8ee] bg-white p-4 shadow-sm">
              <div className="font-heading text-2xl font-bold text-[#C9A227]">7 yrs</div>
              <div className="text-xs text-[#8a909b]">ledger retention</div>
            </div>
          </div>

          {/* Consent Ledger Events */}
          <div className="overflow-hidden rounded-2xl border border-[#e4e8ee] bg-white shadow-sm">
            <div className="border-b border-[#e4e8ee] bg-[#F4F6F8] px-5 py-3 text-xs font-semibold text-[#2F3542]">
              Consent ledger — recent events (immutable, 7-yr retention)
            </div>
            <div className="divide-y divide-[#eef1f5] font-mono text-xs">
              <div className="flex items-center justify-between px-5 py-3">
                <span className="text-[#2F3542]">
                  p-77213 · <b className="text-[#0FB5A5]">GRANTED</b> · p1,p2,p3,p4 · notice v3
                </span>
                <span className="text-[#8a909b]">11:40:02</span>
              </div>
              <div className="flex items-center justify-between px-5 py-3">
                <span className="text-[#D9534F]">
                  p-77198 · <b>WITHDRAWN</b> · p4 marketing
                </span>
                <span className="text-[#8a909b]">11:22:51</span>
              </div>
              <div className="flex items-center justify-between px-5 py-3">
                <span className="text-[#2F3542]">
                  p-77190 · <b className="text-[#0FB5A5]">GRANTED</b> · p1,p2,p3 · notice v3 · hi
                </span>
                <span className="text-[#8a909b]">10:58:14</span>
              </div>
              <div className="flex items-center justify-between px-5 py-3">
                <span className="text-[#8a6d10]">
                  p-77181 · <b>WITHDRAWN</b> → erasure queued (RTS-04)
                </span>
                <span className="text-[#8a909b]">10:31:09</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Live Interactive Consent Notice Preview */}
        <div className="overflow-hidden rounded-2xl border border-[#e4e8ee] bg-white shadow-lg sticky top-6">
          <div className="flex items-center justify-between bg-[#1E2A4A] px-5 py-3.5 text-white">
            <span className="text-xs font-semibold">Consent notice · live preview</span>
            <div className="flex rounded-md bg-white/10 p-0.5">
              <button
                onClick={() => setLang('en')}
                className={`rounded px-2.5 py-0.5 text-xs font-semibold transition-colors ${
                  isEn ? 'bg-white text-[#1E2A4A]' : 'text-white/70 hover:text-white'
                }`}
              >
                EN
              </button>
              <button
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

            <button className="w-full rounded-lg bg-[#0FB5A5] py-2.5 text-center text-xs font-bold text-white shadow transition-all hover:bg-[#0a8d80]">
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
