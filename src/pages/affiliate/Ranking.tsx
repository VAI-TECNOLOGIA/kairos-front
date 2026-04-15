import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { formatBRL } from '@/lib/utils';
import { Trophy, Star, TrendingUp, Package, AlertCircle } from 'lucide-react';

interface Milestone {
  id         : string;
  name       : string;
  color      : string;
  targetType : 'VALUE' | 'UNITS';
  targetValue: number;
  reward     : string;
  current    : number;
  percentage : number;
  reached    : boolean;
}

interface ProducerGroup {
  producer  : { id: string; name: string };
  milestones: Milestone[];
  summary   : { totalValueCents: number; totalUnits: number };
}

function formatTarget(m: Milestone) {
  return m.targetType === 'VALUE'
    ? formatBRL(m.targetValue)
    : `${m.targetValue.toLocaleString('pt-BR')} unid.`;
}

function formatCurrent(m: Milestone) {
  return m.targetType === 'VALUE'
    ? formatBRL(m.current)
    : `${m.current.toLocaleString('pt-BR')} unid.`;
}

export default function AffiliateRanking() {
  const { data, isLoading } = useQuery<{ data: ProducerGroup[] }>({
    queryKey: ['affiliate-milestones'],
    queryFn : () => api.get('/affiliates/milestones').then(r => r.data),
  });

  const groups = data?.data ?? [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-text flex items-center gap-2">
          <Trophy size={20} className="text-amber" />
          Ranking & Conquistas
        </h1>
        <p className="text-sm text-text3 mt-0.5">
          Metas definidas pelo produtor. Acompanhe sua progressão e desbloqueie recompensas.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card h-28 animate-pulse bg-bg3" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 bg-bg3 rounded-2xl flex items-center justify-center mb-4">
            <AlertCircle size={26} className="text-text3" />
          </div>
          <p className="text-text font-medium mb-1">Nenhum marco definido</p>
          <p className="text-text3 text-sm max-w-xs">
            Os produtores dos programas em que você está inscrito ainda não configuraram marcos de conquista.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map(group => (
            <ProducerSection
              key={group.producer.id}
              group={group}
              showProducerName={groups.length > 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Seção por produtor ─────────────────────────────────────────
function ProducerSection({
  group,
  showProducerName,
}: {
  group           : ProducerGroup;
  showProducerName: boolean;
}) {
  const { producer, milestones, summary } = group;

  const nextIdx          = milestones.findIndex(m => !m.reached);
  const nextMilestone    = nextIdx !== -1 ? milestones[nextIdx] : null;
  const allReached       = milestones.every(m => m.reached);
  const currentMilestone = nextMilestone ?? milestones[milestones.length - 1];

  return (
    <div>
      {/* Nome do produtor — só quando houver vários */}
      {showProducerName && (
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <Trophy size={12} className="text-accent" />
          </div>
          <h2 className="text-sm font-semibold text-text">{producer.name}</h2>
          <div className="flex-1 h-px bg-border" />
        </div>
      )}

      {/* Card de nível atual */}
      {currentMilestone && (
        <div className="card mb-4" style={{ borderColor: `${currentMilestone.color}30` }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Trophy size={18} style={{ color: currentMilestone.color }} />
              <span className="font-semibold text-text text-sm">
                {allReached ? 'Nível máximo atingido!' : 'Nível atual'}
              </span>
            </div>
            <span
              className="text-xs font-bold px-3 py-1 rounded-full border"
              style={{
                color      : currentMilestone.color,
                background : `${currentMilestone.color}15`,
                borderColor: `${currentMilestone.color}40`,
              }}
            >
              {currentMilestone.name}
            </span>
          </div>

          {/* Barra de progresso */}
          <div className="mb-4">
            <div className="flex justify-between text-xs text-text3 mb-1.5">
              <span>
                {currentMilestone.targetType === 'VALUE' ? 'Faturamento gerado' : 'Vendas realizadas'}
              </span>
              <span className="font-semibold text-text">{formatCurrent(currentMilestone)}</span>
            </div>
            <div className="w-full h-3 rounded-full bg-bg3 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${currentMilestone.percentage}%`, background: currentMilestone.color }}
              />
            </div>
            <div className="flex justify-between text-xs text-text3 mt-1.5">
              <span>{currentMilestone.percentage}% concluído</span>
              {allReached
                ? <span style={{ color: currentMilestone.color }}>Todos os níveis atingidos!</span>
                : <span>Meta: {formatTarget(currentMilestone)}</span>
              }
            </div>
          </div>

          {/* Premiação */}
          <div
            className="p-3 rounded-[8px] border"
            style={{ background: `${currentMilestone.color}10`, borderColor: `${currentMilestone.color}25` }}
          >
            <div className="flex items-start gap-2">
              <Star size={13} style={{ color: currentMilestone.color }} className="mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-text2 mb-0.5">Prêmio deste nível</p>
                <p className="text-xs text-text leading-relaxed">{currentMilestone.reward}</p>
              </div>
            </div>
          </div>

          {/* Resumo */}
          <div className="grid grid-cols-2 gap-2 mt-3">
            <div className="bg-bg3 rounded-lg p-2.5">
              <div className="flex items-center gap-1.5 mb-0.5">
                <TrendingUp size={11} className="text-green" />
                <span className="text-[10px] text-text3">Receita total</span>
              </div>
              <p className="text-sm font-bold text-text">{formatBRL(summary.totalValueCents)}</p>
            </div>
            <div className="bg-bg3 rounded-lg p-2.5">
              <div className="flex items-center gap-1.5 mb-0.5">
                <Package size={11} className="text-accent" />
                <span className="text-[10px] text-text3">Vendas aprovadas</span>
              </div>
              <p className="text-sm font-bold text-text">{summary.totalUnits.toLocaleString('pt-BR')}</p>
            </div>
          </div>
        </div>
      )}

      {/* Jornada completa */}
      <div className="card">
        <div className="flex items-center gap-2 mb-5">
          <TrendingUp size={15} className="text-text2" />
          <span className="font-semibold text-text text-sm">Jornada de níveis</span>
        </div>

        <div className="relative">
          <div className="absolute left-5 top-6 bottom-6 w-px bg-border" />

          <div className="space-y-3">
            {milestones.map((m, idx) => {
              const isCurrent = !allReached && idx === nextIdx;
              const isLocked  = !m.reached && !isCurrent;

              return (
                <div
                  key={m.id}
                  className={`relative flex items-start gap-4 p-3.5 rounded-[10px] transition-all ${
                    isCurrent ? 'border' : ''
                  } ${isLocked ? 'opacity-50' : ''}`}
                  style={isCurrent ? { background: `${m.color}0d`, borderColor: `${m.color}35` } : {}}
                >
                  {/* Ícone */}
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 z-10 border-2"
                    style={{
                      background : m.reached ? m.color : 'var(--color-bg2)',
                      borderColor: m.reached ? m.color : 'var(--color-border)',
                    }}
                  >
                    <Trophy size={15} style={{ color: m.reached ? '#000' : 'var(--color-text3)' }} />
                  </div>

                  {/* Conteúdo */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span
                        className="font-semibold text-sm"
                        style={{ color: m.reached ? m.color : 'var(--color-text2)' }}
                      >
                        {m.name}
                      </span>
                      {isCurrent && (
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                          style={{ background: m.color, color: '#000' }}
                        >
                          nível atual
                        </span>
                      )}
                      {m.reached && (
                        <span className="text-[10px] text-green">✓ Concluído</span>
                      )}
                    </div>

                    <p className="text-xs text-text2 mb-1 leading-relaxed line-clamp-2">{m.reward}</p>

                    <p className="text-[11px] text-text3">
                      Meta: {formatTarget(m)}
                      <span className="mx-1">·</span>
                      {m.targetType === 'VALUE' ? 'Receita' : 'Unidades'}
                    </p>

                    {isCurrent && (
                      <div className="mt-2">
                        <div className="w-full h-1.5 rounded-full bg-bg3 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${m.percentage}%`, background: m.color }}
                          />
                        </div>
                        <div className="text-[10px] text-text3 mt-0.5">
                          {formatCurrent(m)} de {formatTarget(m)}
                          {m.targetType === 'VALUE' && m.current < m.targetValue && (
                            <> · Falta {formatBRL(m.targetValue - m.current)}</>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Meta no canto */}
                  <div className="text-right flex-shrink-0">
                    <div
                      className="text-xs font-semibold"
                      style={{ color: m.reached ? m.color : 'var(--color-text3)' }}
                    >
                      {formatTarget(m)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
