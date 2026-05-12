import { Eye, EyeOff } from 'lucide-react';

interface Props {
  value: string;
  sub?: string;
  label?: string;
}

export function KairosWithdrawCard({ value, sub, label = 'Total sacado' }: Props) {
  return (
    <div className="kw-card">
      <div className="kw-shine" />

      {/* topo: label + olho + KAIROS */}
      <div className="relative z-10 flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wider text-white/70 font-medium">
          {label}
        </span>
        <div className="flex items-center gap-2">
          <span className="kw-eye-wrap" aria-hidden>
            <EyeOff size={14} className="kw-eye kw-eye-off" />
            <Eye size={14} className="kw-eye kw-eye-on" />
          </span>
          <span className="kw-brand">KAIROS</span>
        </div>
      </div>

      {/* valor: hidden por padrão, real no hover */}
      <div className="kw-value-wrap">
        <span className="kw-value kw-value-hidden">••••••</span>
        <span className="kw-value kw-value-real">{value}</span>
      </div>

      {sub && <div className="relative z-10 mt-0.5 text-[10px] text-white/55">{sub}</div>}

      {/* tubarão SVG detalhado */}
      <svg
        className="kw-shark"
        viewBox="0 0 140 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        {/* corpo */}
        <path
          d="M8 44 Q 28 28 64 30 Q 100 32 122 38 L 134 28 Q 138 34 134 44 L 138 58 Q 134 62 126 56 L 122 50 Q 100 54 64 54 Q 28 56 8 44 Z"
          fill="currentColor"
          fillOpacity="0.92"
        />
        {/* nadadeira dorsal */}
        <path d="M58 30 L 70 10 L 84 32 Z" fill="currentColor" fillOpacity="0.95" />
        {/* nadadeira peitoral (inferior) */}
        <path d="M54 52 Q 64 72 80 56 Z" fill="currentColor" fillOpacity="0.85" />
        {/* brilho barriga */}
        <path
          d="M14 48 Q 64 56 118 47"
          stroke="rgba(255,255,255,0.28)"
          strokeWidth="0.9"
          fill="none"
        />
        {/* olho */}
        <circle cx="20" cy="39" r="2.2" fill="#02030B" />
        <circle cx="20.6" cy="38.4" r="0.7" fill="#ffffff" />
        {/* brânquias */}
        <path d="M30 37 Q 32 43 30 48" stroke="#02030B" strokeWidth="0.8" strokeOpacity="0.55" fill="none" strokeLinecap="round" />
        <path d="M34 37 Q 36 43 34 48" stroke="#02030B" strokeWidth="0.8" strokeOpacity="0.55" fill="none" strokeLinecap="round" />
        <path d="M38 37 Q 40 43 38 48" stroke="#02030B" strokeWidth="0.8" strokeOpacity="0.55" fill="none" strokeLinecap="round" />
        {/* boca */}
        <path d="M9 45 L 19 48" stroke="#02030B" strokeWidth="1" strokeOpacity="0.65" fill="none" strokeLinecap="round" />
        {/* highlight contorno superior cabeça */}
        <path d="M8 44 Q 14 36 24 35" stroke="rgba(255,255,255,0.22)" strokeWidth="0.6" fill="none" />
      </svg>

      {/* bolhinhas */}
      <div className="kw-bubble kw-bubble-1" />
      <div className="kw-bubble kw-bubble-2" />
      <div className="kw-bubble kw-bubble-3" />

      <style>{`
        .kw-card {
          position: relative;
          overflow: hidden;
          border-radius: 12px;
          padding: 14px 16px;
          background: linear-gradient(135deg, #02030B 0%, #051a4d 45%, #0055FE 110%);
          border: 1px solid rgba(0, 85, 254, 0.35);
          box-shadow: 0 4px 18px rgba(0, 85, 254, 0.18), inset 0 1px 0 rgba(255,255,255,0.07);
          transition: transform .35s cubic-bezier(.34,1.56,.64,1), box-shadow .35s ease;
          min-height: 96px;
        }
        .kw-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 28px rgba(0, 85, 254, 0.38);
        }
        .kw-shine {
          position: absolute; inset: 0;
          background: linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.12) 50%, transparent 70%);
          transform: translateX(-110%);
          transition: transform 1.1s ease;
          pointer-events: none;
        }
        .kw-card:hover .kw-shine { transform: translateX(110%); }

        /* ── olho ── */
        .kw-eye-wrap {
          position: relative;
          width: 14px; height: 14px;
          display: inline-flex;
          color: rgba(255,255,255,0.65);
        }
        .kw-eye {
          position: absolute;
          inset: 0;
          transition: opacity .3s ease, transform .3s ease;
        }
        .kw-eye-off { opacity: 1; transform: scale(1); }
        .kw-eye-on  { opacity: 0; transform: scale(0.85); }
        .kw-card:hover .kw-eye-off { opacity: 0; transform: scale(0.85); }
        .kw-card:hover .kw-eye-on  { opacity: 1; transform: scale(1); color: #9ec8ff; }

        /* ── KAIROS ── */
        .kw-brand {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 2.5px;
          color: rgba(255,255,255,0.85);
          opacity: 0;
          transform: translateX(6px);
          transition: opacity .35s ease, transform .35s ease;
        }
        .kw-card:hover .kw-brand {
          opacity: 1;
          transform: translateX(0);
        }

        /* ── valor: crossfade hidden ↔ real ── */
        .kw-value-wrap {
          position: relative;
          z-index: 1;
          margin-top: 8px;
          min-height: 32px;
        }
        .kw-value {
          position: absolute;
          left: 0; top: 0;
          font-size: 24px;
          font-weight: 700;
          color: #ffffff;
          line-height: 32px;
          transition: opacity .35s ease, transform .35s ease;
        }
        .kw-value-hidden { opacity: 1; letter-spacing: 4px; }
        .kw-value-real   { opacity: 0; transform: translateY(4px); }
        .kw-card:hover .kw-value-hidden { opacity: 0; transform: translateY(-4px); }
        .kw-card:hover .kw-value-real   { opacity: 1; transform: translateY(0); }

        /* ── tubarão ── */
        .kw-shark {
          position: absolute;
          right: -10px; bottom: -8px;
          width: 110px; height: 60px;
          color: #9ec8ff;
          opacity: 0;
          transform: translateX(20px);
          animation: kwSwim 4.5s ease-in-out infinite;
          transition: opacity .4s ease, color .4s ease;
          pointer-events: none;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.25));
        }
        .kw-card:hover .kw-shark {
          opacity: 0.7;
          color: #cfe2ff;
          animation: kwSwimIn .5s ease-out forwards, kwSwim 4.5s ease-in-out 0.5s infinite;
        }
        @keyframes kwSwim {
          0%, 100% { transform: translateY(0)   rotate(0deg); }
          50%      { transform: translateY(-4px) rotate(-3deg); }
        }
        @keyframes kwSwimIn {
          0%   { transform: translateX(20px) translateY(0); opacity: 0; }
          100% { transform: translateX(0)    translateY(0); opacity: 0.7; }
        }

        /* ── bolhas ── */
        .kw-bubble {
          position: absolute;
          border-radius: 999px;
          background: rgba(255,255,255,0.45);
          pointer-events: none;
          opacity: 0;
        }
        .kw-card:hover .kw-bubble {
          animation: kwBubble 5.5s ease-in 0.6s infinite;
        }
        .kw-bubble-1 { width: 4px;   height: 4px;   right: 28px; bottom: 16px; animation-delay: 0.6s !important; }
        .kw-bubble-2 { width: 3px;   height: 3px;   right: 44px; bottom: 12px; animation-delay: 1.8s !important; }
        .kw-bubble-3 { width: 2.5px; height: 2.5px; right: 18px; bottom: 20px; animation-delay: 3.0s !important; }

        @keyframes kwBubble {
          0%   { transform: translateY(0)    scale(0.6); opacity: 0; }
          20%  { opacity: 0.9; }
          100% { transform: translateY(-50px) scale(1);   opacity: 0; }
        }

        @media (prefers-reduced-motion: reduce) {
          .kw-card, .kw-shine, .kw-shark, .kw-bubble, .kw-value, .kw-eye, .kw-brand {
            transition: none; animation: none;
          }
        }
      `}</style>
    </div>
  );
}
