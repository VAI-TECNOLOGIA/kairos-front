import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/ui';
import { formatBRL } from '@/lib/utils';
import { Calculator } from 'lucide-react';

export default function FeeCalculator() {
  const [feePctMonth, setFeePctMonth] = useState<number>(3.5);
  const [valueReais , setValueReais ] = useState<number>(100);

  const rows = useMemo(() => {
    const out: { n: number; clientPays: number; perInstallment: number; feeReais: number; feePct: number }[] = [];
    for (let n = 1; n <= 12; n++) {
      // taxa composta de parcelamento — fórmula price (PMT)
      const i = feePctMonth / 100;
      let clientPays: number;
      if (n === 1 || i === 0) {
        clientPays = valueReais;
      } else {
        const factor = i / (1 - Math.pow(1 + i, -n));
        const pmt = valueReais * factor;
        clientPays = pmt * n;
      }
      const perInstallment = clientPays / n;
      const feeReais = clientPays - valueReais;
      const feePct = (feeReais / valueReais) * 100;
      out.push({ n, clientPays, perInstallment, feeReais, feePct });
    }
    return out;
  }, [feePctMonth, valueReais]);

  return (
    <div>
      <PageHeader
        title="Calculadora de taxas"
        sub="Simule as taxas de parcelamento a serem repassadas para os clientes"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div className="card p-3">
          <label className="label">Taxa ao mês (%)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={feePctMonth}
            onChange={e => setFeePctMonth(Number(e.target.value) || 0)}
            className="input"
          />
        </div>
        <div className="card p-3">
          <label className="label">Valor total da venda (R$)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={valueReais}
            onChange={e => setValueReais(Number(e.target.value) || 0)}
            className="input"
          />
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="table w-full">
          <thead>
            <tr>
              <th>Parcelas</th>
              <th className="text-right">Valor pago pelo cliente</th>
              <th className="text-right">Valor / parcela</th>
              <th className="text-right">Taxa parcelamento</th>
              <th className="text-right">Taxa parcelamento (%)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.n}>
                <td className="font-medium">{r.n}x</td>
                <td className="text-right">{formatBRL(Math.round(r.clientPays * 100))}</td>
                <td className="text-right">{formatBRL(Math.round(r.perInstallment * 100))}</td>
                <td className="text-right text-amber">{formatBRL(Math.round(r.feeReais * 100))}</td>
                <td className="text-right text-amber">{r.feePct.toFixed(2)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-xs text-text3 flex items-start gap-2">
        <Calculator size={13} className="flex-shrink-0 mt-0.5" />
        <span>
          Cálculo via fórmula PRICE (PMT) — usado pela maioria das adquirentes.
          O cliente paga o valor parcelado x número de parcelas; a taxa é a diferença vs o valor original.
        </span>
      </div>
    </div>
  );
}
