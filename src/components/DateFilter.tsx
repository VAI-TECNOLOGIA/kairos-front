import { useState } from 'react';
import { Calendar } from 'lucide-react';

export interface DateRange {
  startDate: string; // YYYY-MM-DD
  endDate  : string; // YYYY-MM-DD
  label    : string;
}

const PRESETS: { label: string; days: number }[] = [
  { label: 'Hoje',     days: 0 },
  { label: '7 dias',   days: 7 },
  { label: '15 dias',  days: 15 },
  { label: '30 dias',  days: 30 },
  { label: '90 dias',  days: 90 },
];

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

interface Props {
  value   : DateRange;
  onChange: (range: DateRange) => void;
}

export function getDefaultRange(): DateRange {
  return buildRange(30, '30 dias');
}

export default function DateFilter({ value, onChange }: Props) {
  const [showCustom, setShowCustom] = useState(false);
  const [customStart, setCustomStart] = useState(value.startDate);
  const [customEnd, setCustomEnd]     = useState(value.endDate);

  const isPreset = PRESETS.some(p => p.label === value.label);
  const isCustom = !isPreset;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <Calendar size={13} className="text-text3" />

      {PRESETS.map(p => (
        <button
          key={p.label}
          onClick={() => {
            onChange(buildRange(p.days, p.label));
            setShowCustom(false);
          }}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
            value.label === p.label
              ? 'bg-accent text-white'
              : 'bg-bg3 text-text3 hover:text-text2 hover:bg-bg3/80'
          }`}
        >
          {p.label}
        </button>
      ))}

      {/* Custom toggle */}
      <button
        onClick={() => setShowCustom(!showCustom)}
        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
          isCustom
            ? 'bg-accent text-white'
            : 'bg-bg3 text-text3 hover:text-text2 hover:bg-bg3/80'
        }`}
      >
        {isCustom ? value.label : 'Personalizado'}
      </button>

      {/* Custom date inputs */}
      {showCustom && (
        <div className="flex items-center gap-1.5 ml-1">
          <input
            type="date"
            value={customStart}
            onChange={e => setCustomStart(e.target.value)}
            className="input py-1 px-2 text-[11px] w-[120px]"
          />
          <span className="text-text3 text-[11px]">a</span>
          <input
            type="date"
            value={customEnd}
            onChange={e => setCustomEnd(e.target.value)}
            className="input py-1 px-2 text-[11px] w-[120px]"
          />
          <button
            onClick={() => {
              if (customStart && customEnd) {
                const fmtStart = new Date(customStart + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                const fmtEnd   = new Date(customEnd   + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                onChange({ startDate: customStart, endDate: customEnd, label: `${fmtStart} a ${fmtEnd}` });
              }
            }}
            className="btn-primary py-1 px-2.5 text-[11px]"
          >
            Aplicar
          </button>
        </div>
      )}
    </div>
  );
}
