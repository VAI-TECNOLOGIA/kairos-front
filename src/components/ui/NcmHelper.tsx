import { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

// Exemplos comuns no e-commerce brasileiro (suplemento/cosmético/vestuário/livro).
// NCM oficial em: https://portalunico.siscomex.gov.br/classif/#/sumario
const EXAMPLES = [
  { ncm: '21069030', label: 'Suplemento alimentar', hint: 'cápsulas, gomas, pós, whey' },
  { ncm: '33049990', label: 'Cosmético / beleza',   hint: 'creme, sérum, maquiagem' },
  { ncm: '61091000', label: 'Vestuário de algodão', hint: 'camiseta, regata' },
  { ncm: '49019900', label: 'Livro impresso',       hint: 'livro físico' },
];

interface Props {
  onPick: (ncm: string) => void;
}

export function NcmHelper({ onPick }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-1 text-[11px] text-accent hover:underline"
      >
        <HelpCircle size={11} />
        Ver onde seu produto se classifica
        {open ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
      </button>
      {open && (
        <div className="mt-1.5 border border-border rounded-lg bg-bg3 p-2 space-y-1">
          {EXAMPLES.map(ex => (
            <button
              key={ex.ncm}
              type="button"
              onClick={() => { onPick(ex.ncm); setOpen(false); }}
              className="w-full text-left text-[11px] px-2 py-1.5 rounded hover:bg-bg2 flex items-center justify-between gap-2 group"
            >
              <span className="flex-1">
                <span className="font-medium text-text">{ex.label}</span>
                <span className="text-text3 ml-1">— {ex.hint}</span>
              </span>
              <code className="text-[10px] text-accent font-mono">{ex.ncm}</code>
            </button>
          ))}
          <p className="text-[10px] text-text3 px-2 pt-1 border-t border-border">
            São exemplos comuns. Pra encontrar o NCM exato do seu produto, consulte seu contador ou{' '}
            <a href="https://portalunico.siscomex.gov.br/classif/#/sumario" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
              portal do Siscomex
            </a>.
          </p>
        </div>
      )}
    </div>
  );
}
