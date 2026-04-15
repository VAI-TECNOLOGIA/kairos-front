import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { PageHeader } from '@/components/ui';
import { formatBRL } from '@/lib/utils';
import { Trophy, Star, TrendingUp } from 'lucide-react';

const TIERS = [
  { name: 'Bronze',   goal: 0,        next: 2000000,  color: '#CD7F32', bg: 'rgba(205,127,50,0.10)',  prize: 'Acesso a materiais exclusivos'          },
  { name: 'Prata',    goal: 2000000,  next: 5000000,  color: '#A8A9AD', bg: 'rgba(168,169,173,0.10)', prize: 'Mentoria individual + badge especial'    },
  { name: 'Ouro',     goal: 5000000,  next: 10000000, color: '#FFD700', bg: 'rgba(255,215,0,0.10)',   prize: 'Comissão extra + destaque na plataforma'  },
  { name: 'Diamante', goal: 10000000, next: null,     color: '#7DF9FF', bg: 'rgba(125,249,255,0.10)', prize: 'Parceria premium + prêmio especial'       },
];

export default function AffiliateRanking() {
  const { data: stats } = useQuery({
    queryKey: ['affiliate-stats'],
    queryFn : () => api.get('/affiliates/my-stats').then(r => r.data),
  });

  const tier         = stats?.tier         || 'Bronze';
  const tierProgress = stats?.tierProgress || 0;
  const tierNextGoal = stats?.tierNextGoal || null;
  const volumeCents  = stats?.volumeCents  || 0;
  const currentTier  = TIERS.find(t => t.name === tier) || TIERS[0];

  return (
    <div>
      <PageHeader title="Ranking" sub="Seu progresso e jornada de níveis" />

      {/* Card tier atual */}
      <div className="card mb-4" style={{ borderColor: `${currentTier.color}30` }}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Trophy size={20} style={{ color: currentTier.color }} />
            <span className="font-semibold text-text text-base">Seu nível atual</span>
          </div>
          <span className="text-sm font-bold px-3 py-1 rounded-full border"
            style={{ color: currentTier.color, background: currentTier.bg, borderColor: `${currentTier.color}40` }}>
            {tier}
          </span>
        </div>

        <div className="mb-4">
          <div className="flex justify-between text-sm text-text3 mb-2">
            <span>Faturamento gerado</span>
            <span className="font-semibold text-text">{formatBRL(volumeCents)}</span>
          </div>
          <div className="w-full h-3 rounded-full bg-bg3 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${tierProgress}%`, background: currentTier.color }}
            />
          </div>
          <div className="flex justify-between text-xs text-text3 mt-1.5">
            <span>{tierProgress}% concluído</span>
            {tierNextGoal
              ? <span>Próxima meta: {formatBRL(tierNextGoal)}</span>
              : <span style={{ color: currentTier.color }}>Nível máximo atingido!</span>
            }
          </div>
        </div>

        <div className="p-3 rounded-[8px] border" style={{ background: currentTier.bg, borderColor: `${currentTier.color}25` }}>
          <div className="flex items-center gap-2">
            <Star size={14} style={{ color: currentTier.color }} />
            <span className="text-sm text-text2">Prêmio deste nível:</span>
            <span className="text-sm font-medium text-text">{currentTier.prize}</span>
          </div>
        </div>
      </div>

      {/* Jornada completa */}
      <div className="card">
        <div className="flex items-center gap-2 mb-5">
          <TrendingUp size={16} className="text-text2" />
          <span className="font-semibold text-text">Jornada de níveis</span>
        </div>

        <div className="relative">
          {/* Linha vertical conectando os níveis */}
          <div className="absolute left-5 top-6 bottom-6 w-px bg-border" />

          <div className="space-y-4">
            {TIERS.map((t, idx) => {
              const reached   = volumeCents >= t.goal;
              const isCurrent = t.name === tier;
              const isLocked  = !reached;

              return (
                <div key={t.name} className={`relative flex items-start gap-4 p-4 rounded-[10px] transition-all ${isCurrent ? 'border' : ''}`}
                  style={isCurrent ? { background: t.bg, borderColor: `${t.color}35` } : {}}>

                  {/* Ícone do nível */}
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 z-10 border-2"
                    style={{
                      background   : reached ? t.color : 'var(--color-bg2)',
                      borderColor  : reached ? t.color : 'var(--color-border)',
                      color        : reached ? '#000'  : 'var(--color-text3)',
                    }}>
                    <Trophy size={16} />
                  </div>

                  {/* Conteúdo */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-semibold" style={{ color: reached ? t.color : 'var(--color-text2)' }}>
                        {t.name}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                          style={{ background: t.color, color: '#000' }}>
                          nível atual
                        </span>
                      )}
                      {reached && !isCurrent && (
                        <span className="text-[10px] text-green">✓ Concluído</span>
                      )}
                    </div>
                    <div className="text-sm text-text2 mb-1">{t.prize}</div>
                    <div className="text-xs text-text3">
                      {t.goal === 0 ? 'Nível inicial' : `A partir de ${formatBRL(t.goal)} em faturamento`}
                    </div>

                    {/* Barra de progresso no nível atual */}
                    {isCurrent && t.next && (
                      <div className="mt-2">
                        <div className="w-full h-1.5 rounded-full bg-bg3 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${tierProgress}%`, background: t.color }} />
                        </div>
                        <div className="text-[10px] text-text3 mt-0.5">
                          Falta {formatBRL(t.next - volumeCents)} para o próximo nível
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Meta */}
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs font-semibold" style={{ color: reached ? t.color : 'var(--color-text3)' }}>
                      {t.goal === 0 ? 'Início' : formatBRL(t.goal)}
                    </div>
                    {isLocked && (
                      <div className="text-[10px] text-text3 mt-0.5">
                        Falta {formatBRL(t.goal - volumeCents)}
                      </div>
                    )}
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