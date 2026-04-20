import { useState } from 'react';
import { Calendar, X, ChevronRight } from 'lucide-react';

export interface DateRange {
  startDate: string; // YYYY-MM-DD
  endDate  : string; // YYYY-MM-DD
  label    : string;
}

// MANTIDO: PRESETS preservado integralmente
const PRESETS: { label: string; days: number }[] = [
  { label: 'Hoje',     days: 0 },
  { label: '7 dias',   days: 7 },
  { label: '15 dias',  days: 15 },
  { label: '30 dias',  days: 30 },
  { label: '90 dias',  days: 90 },
];

// MANTIDO: todas as funções de build preservadas integralmente
function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function buildRange(days: number, label: string): DateRange {
  const end   = new Date();
  const start = new Date();
  if (days > 0) start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);
  return { startDate: toISO(start), endDate: toISO(end), label };
}

function buildOntem(): DateRange {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const iso = toISO(d);
  return { startDate: iso, endDate: iso, label: 'Ontem' };
}

function buildSemanaPassada(): DateRange {
  const today     = new Date();
  const dayOfWeek = today.getDay();
  const lastSun   = new Date(today);
  lastSun.setDate(today.getDate() - dayOfWeek - 7);
  const lastSat   = new Date(lastSun);
  lastSat.setDate(lastSun.getDate() + 6);
  return { startDate: toISO(lastSun), endDate: toISO(lastSat), label: 'Semana passada' };
}

function buildTudo(): DateRange {
  return { startDate: '2020-01-01', endDate: toISO(new Date()), label: 'Tudo' };
}

// MANTIDO: interface Props e getDefaultRange preservadas integralmente
interface Props {
  value   : DateRange;
  onChange: (range: DateRange) => void;
}

export function getDefaultRange(): DateRange {
  return buildRange(30, '30 dias');
}

const ABSOLUTE_PRESETS = [
  { label: 'Ontem',          build: buildOntem },
  { label: 'Semana passada', build: buildSemanaPassada },
  { label: 'Tudo',           build: buildTudo },
];

const KNOWN_LABELS = [
  ...PRESETS.map(p => p.label),
  ...ABSOLUTE_PRESETS.map(p => p.label),
];

export default function DateFilter({ value, onChange }: Props) {
  const [open, setOpen]               = useState(false);
  const [customStart, setCustomStart] = useState(value.startDate);
  const [customEnd, setCustomEnd]     = useState(value.endDate);

  const isCustom = !KNOWN_LABELS.includes(value.label);

  function apply(range: DateRange) {
    onChange(range);
    setOpen(false);
  }

  function applyCustom() {
    if (!customStart || !customEnd) return;
    const fmtStart = new Date(customStart + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const fmtEnd   = new Date(customEnd   + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    apply({ startDate: customStart, endDate: customEnd, label: `${fmtStart} a ${fmtEnd}` });
  }

  return (
    <>
      {/* Botão de abertura — mostra label ativo */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-bg3 text-text2 hover:text-text hover:bg-bg3/80 transition-colors border border-border"
      >
        <Calendar size={12} className="text-text3" />
        <span>{value.label}</span>
        <ChevronRight size={11} className="text-text3" />
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-bg2 rounded-2xl shadow-xl w-full max-w-sm border border-border flex flex-col">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-accent" />
                <h2 className="text-sm font-semibold text-text">Filtrar por data</h2>
              </div>
              <button onClick={() => setOpen(false)} className="text-text3 hover:text-text">
                <X size={15} />
              </button>
            </div>

            <div className="p-5 space-y-5">

              {/* Presets relativos */}
              <div>
                <p className="text-[10px] font-semibold text-text3 uppercase tracking-wide mb-2">
                  Periodo relativo
                </p>
                <div className="grid grid-cols-3 gap-1.5">
                  {PRESETS.map(p => (
                    <button
                      key={p.label}
                      onClick={() => apply(buildRange(p.days, p.label))}
                      className={`py-2 rounded-xl text-[11px] font-medium transition-colors border ${
                        value.label === p.label
                          ? 'bg-accent border-accent text-white'
                          : 'border-border bg-bg3 text-text3 hover:border-accent/40 hover:text-text2'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Presets absolutos */}
              <div>
                <p className="text-[10px] font-semibold text-text3 uppercase tracking-wide mb-2">
                  Periodo fixo
                </p>
                <div className="grid grid-cols-3 gap-1.5">
                  {ABSOLUTE_PRESETS.map(p => (
                    <button
                      key={p.label}
                      onClick={() => apply(p.build())}
                      className={`py-2 rounded-xl text-[11px] font-medium transition-colors border ${
                        value.label === p.label
                          ? 'bg-accent border-accent text-white'
                          : 'border-border bg-bg3 text-text3 hover:border-accent/40 hover:text-text2'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Personalizado */}
              <div>
                <p className="text-[10px] font-semibold text-text3 uppercase tracking-wide mb-2">
                  Personalizado
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={customStart}
                    onChange={e => setCustomStart(e.target.value)}
                    className="input py-1.5 px-2 text-[11px] flex-1"
                  />
                  <span className="text-text3 text-[11px] flex-shrink-0">a</span>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={e => setCustomEnd(e.target.value)}
                    className="input py-1.5 px-2 text-[11px] flex-1"
                  />
                </div>
                {isCustom && (
                  <p className="text-[10px] text-accent mt-1.5">
                    Ativo: {value.label}
                  </p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-2 px-5 pb-5">
              <button
                onClick={applyCustom}
                disabled={!customStart || !customEnd}
                className="btn-primary flex-1 text-[12px] disabled:opacity-40"
              >
                Aplicar periodo
              </button>
              <button onClick={() => setOpen(false)} className="btn-secondary text-[12px]">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
