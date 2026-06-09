import { useQuery } from '@tanstack/react-query';
import { Trophy } from 'lucide-react';
import api from '@/lib/api';
import { formatBRL } from '@/lib/utils';

/**
 * Barra de progressão de nível (Bronze/Prata/Ouro/Diamante) baseada no volume
 * de vendas. Usada no painel do AFILIADO e do PRODUTOR — o backend
 * (/affiliates/my-stats) calcula o tier tanto para vendas próprias quanto de
 * afiliação, então funciona para os dois perfis.
 *
 * Defaults garantem que a barra SEMPRE renderiza (Bronze 0%), independente de
 * data de cadastro ou de a conta ter ou não vendas.
 */
const TIER_COLOR: Record<string, string> = {
  Bronze  : '#CD7F32',
  Prata   : '#A8A9AD',
  Ouro    : '#FFD700',
  Diamante: '#7DD3FC',
};
const TIER_BG: Record<string, string> = {
  Bronze  : 'rgba(205,127,50,0.12)',
  Prata   : 'rgba(168,169,173,0.12)',
  Ouro    : 'rgba(255,215,0,0.12)',
  Diamante: 'rgba(125,211,252,0.12)',
};

export default function TierBadge() {
  const { data: stats } = useQuery({
    queryKey : ['affiliate-stats'],
    queryFn  : () => api.get('/affiliates/my-stats').then(r => r.data),
    staleTime: 1000 * 60,
  });

  const tier         = stats?.tier         || 'Bronze';
  const tierProgress = stats?.tierProgress || 0;
  const tierNextGoal = stats?.tierNextGoal || null;
  const tierColor    = TIER_COLOR[tier] || '#CD7F32';
  const tierBg       = TIER_BG[tier]    || 'rgba(205,127,50,0.12)';

  return (
    <div className="mx-3 mt-3 mb-1 px-3 py-2.5 rounded-[8px] border" style={{ background: tierBg, borderColor: `${tierColor}30` }}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <Trophy size={12} style={{ color: tierColor }} />
          <span className="text-[11px] font-bold" style={{ color: tierColor }}>{tier}</span>
        </div>
        <span className="text-[10px] text-text3">{tierProgress}%</span>
      </div>
      <div className="w-full h-1 rounded-full bg-bg3 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${tierProgress}%`, background: tierColor }}
        />
      </div>
      {tierNextGoal && (
        <div className="text-[9px] text-text3 mt-1">
          Próxima meta: {formatBRL(tierNextGoal)}
        </div>
      )}
    </div>
  );
}
