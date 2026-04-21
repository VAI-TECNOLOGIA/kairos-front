import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export interface PlatformFee {
  platformBps: number;
  platformPct: number;
  isCustom   : boolean;
  generalBps : number;
}

/**
 * Retorna a taxa da plataforma aplicável ao usuário logado.
 * Respeita customFeeBps de Producer/Affiliate, caindo para a taxa geral se não definida.
 */
export function usePlatformFee() {
  return useQuery<PlatformFee>({
    queryKey: ['platform-fee'],
    queryFn : () => api.get('/admin/platform-fee').then(r => r.data),
    staleTime: 5 * 60 * 1000, // 5 min
  });
}

/** Multiplicador para cálculo (ex: 0.05 para 5%) */
export function feeMultiplier(fee?: PlatformFee): number {
  if (!fee) return 0;
  return fee.platformBps / 10000;
}
