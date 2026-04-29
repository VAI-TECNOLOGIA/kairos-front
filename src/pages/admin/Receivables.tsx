import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/ui';
import api from '@/lib/api';
import { formatBRL } from '@/lib/utils';
import { format, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, DollarSign, Percent, Users, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Data {
  date          : string;
  totalCents    : number;
  acquirerCents : number;
  producersCents: number;
  platformCents : number;
  netCents      : number;
  profitPct     : number;
  recordCount   : number;
}

export default function AdminReceivables() {
  const [refDate, setRefDate] = useState(new Date());
  const [selected, setSelected] = useState(new Date());
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  const { data } = useQuery<Data>({
    queryKey: ['admin-receivables', selected.toISOString().slice(0, 10)],
    queryFn : () => api.get('/admin/receivables', { params: { date: selected.toISOString().slice(0, 10) } }).then(r => r.data),
  });

  const days = useMemo(() => {
    const start = startOfMonth(refDate);
    const end   = endOfMonth(addMonths(refDate, 1));
    return eachDayOfInterval({ start, end });
  }, [refDate]);

  return (
    <div>
      <PageHeader
        title="Recebimentos"
        sub="Visualize o total recebido por dia, taxas da adquirente e taxas dos produtores"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Calendário */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => setRefDate(addMonths(refDate, -1))} className="btn-ghost btn-sm p-1 min-w-[44px] min-h-[44px]" aria-label="Mês anterior">
              <ChevronLeft size={16} />
            </button>
            <div className="flex gap-8 text-sm font-semibold text-text">
              <span>{format(refDate, 'MMMM yyyy', { locale: ptBR })}</span>
              <span>{format(addMonths(refDate, 1), 'MMMM yyyy', { locale: ptBR })}</span>
            </div>
            <button onClick={() => setRefDate(addMonths(refDate, 1))} className="btn-ghost btn-sm p-1 min-w-[44px] min-h-[44px]" aria-label="Próximo mês">
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-[11px] text-text3 mb-1">
            {['S','M','T','W','T','F','S'].map((d, i) => <div key={i} className="text-center">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map(d => {
              const isSel = isSameDay(d, selected);
              const dim   = !isSameMonth(d, refDate) && !isSameMonth(d, addMonths(refDate, 1));
              return (
                <button
                  key={d.toISOString()}
                  onClick={() => setSelected(d)}
                  className={cn(
                    'aspect-square rounded-full text-xs flex items-center justify-center transition-colors',
                    isSel ? 'bg-accent text-white font-bold' :
                    isToday(d) ? 'bg-bg3 text-text font-semibold' :
                    dim ? 'text-text3/50' : 'text-text2 hover:bg-bg3',
                  )}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>
        </div>

        {/* KPIs do dia */}
        <div className="card p-4">
          <div className="text-sm text-text3 mb-1">Resumo dos recebimentos do período selecionado</div>
          <div className="text-base font-bold text-text mb-4">
            {(() => {
              const f = format(selected, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });
              return f.charAt(0).toUpperCase() + f.slice(1);
            })()}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
            <div className="border-l-2 border-green pl-3">
              <div className="flex items-center gap-2 text-xs text-text3"><DollarSign size={12} /> Total a receber</div>
              <div className="text-lg font-bold text-text">{formatBRL(data?.totalCents || 0)}</div>
              <div className="text-[10px] text-text3">Valor total das vendas liberadas no período</div>
            </div>
            <div className="border-l-2 border-red pl-3">
              <div className="flex items-center gap-2 text-xs text-text3"><Percent size={12} /> Taxas Adquirente</div>
              <div className="text-lg font-bold text-text">{formatBRL(data?.acquirerCents || 0)}</div>
              <div className="text-[10px] text-text3">Taxas de antecipação e operação paga às adquirentes</div>
            </div>
            <div className="border-l-2 border-amber pl-3">
              <div className="flex items-center gap-2 text-xs text-text3"><Users size={12} /> Valores dos produtores</div>
              <div className="text-lg font-bold text-text">{formatBRL(data?.producersCents || 0)}</div>
              <div className="text-[10px] text-text3">Valor líquido a ser transferido para os produtores</div>
            </div>
          </div>

          <div className="bg-bg3 rounded-[7px] p-3 mb-3">
            <div className="text-sm font-semibold text-text mb-2">Informações adicionais</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-text3">Líquido (sua receita):</div>
                <div className="text-base font-bold text-green">{formatBRL(data?.netCents || 0)}</div>
                <div className="text-text3">Valor total recebido menos taxas da adquirente e valor enviado para os produtores</div>
              </div>
              <div>
                <div className="text-text3">Percentual lucro:</div>
                <div className="text-base font-bold text-amber">{data?.profitPct.toFixed(2) || '0.00'}%</div>
                <div className="text-text3">Percentual do valor total que fica para a plataforma como receita</div>
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowHowItWorks(v => !v)}
            className="w-full text-left flex items-center justify-between text-sm text-text2 py-2 border-t border-border"
          >
            Como é calculado
            <ChevronDown size={14} className={cn('transition-transform', showHowItWorks && 'rotate-180')} />
          </button>
          {showHowItWorks && (
            <div className="text-xs text-text3 leading-relaxed pb-2">
              O total a receber é a soma dos splits que foram liberados no dia selecionado.
              A taxa da adquirente é estimada em ~1.1% (mantendo padrão Pagar.me).
              O valor dos produtores é o que será transferido pra eles via split.
              O líquido é a sua parte (plataforma) menos a taxa adquirente.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
