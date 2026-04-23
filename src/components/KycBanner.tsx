import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';
import api from '@/lib/api';
import { AlertTriangle, ShieldCheck } from 'lucide-react';

type KycStatus = {
  kycStatus: 'PENDING' | 'DOCUMENTS_SENT' | 'APPROVED' | 'REJECTED';
  canOperate: boolean;
  pagarmeRecipientId: string | null;
  rejectedReason: string | null;
};

/**
 * Banner global no painel do produtor enquanto a conta não tem recebedor Pagar.me ativo.
 * Aparece em todas as rotas /produtor/*. Não mostra na própria página de verificação.
 */
export default function KycBanner() {
  const location = useLocation();
  const { data } = useQuery<KycStatus>({
    queryKey: ['kyc-status'],
    queryFn : () => api.get('/producers/kyc/status').then(r => r.data),
    staleTime: 30_000,
    retry: false,
  });

  if (!data) return null;
  if (location.pathname.endsWith('/verificacao')) return null;
  if (data.canOperate) return null;

  // Legado: kycStatus=APPROVED porém sem recipient — orienta a completar
  const isLegacyApproved = data.kycStatus === 'APPROVED' && !data.pagarmeRecipientId;
  const isPending  = data.kycStatus === 'PENDING' || isLegacyApproved;
  const isSent     = data.kycStatus === 'DOCUMENTS_SENT';
  const isRejected = data.kycStatus === 'REJECTED';

  const color = isRejected ? 'red' : isSent ? 'yellow' : 'accent';

  return (
    <div className={`card mb-4 p-4 flex items-start gap-3 border-l-4 border-${color === 'accent' ? 'accent' : `${color}-500`} bg-${color === 'accent' ? 'accent' : `${color}-500`}/5`}>
      {isSent
        ? <ShieldCheck className={`text-${color}-500 flex-shrink-0 mt-0.5`} size={18} />
        : <AlertTriangle className={`text-${color === 'accent' ? 'accent' : `${color}-500`} flex-shrink-0 mt-0.5`} size={18} />}
      <div className="flex-1">
        {isRejected && (
          <>
            <div className="font-semibold text-text">Cadastro rejeitado</div>
            <div className="text-sm text-text2">{data.rejectedReason || 'Entre em contato com o suporte.'}</div>
          </>
        )}
        {isSent && (
          <>
            <div className="font-semibold text-text">Documentação enviada — aguardando aprovação</div>
            <div className="text-sm text-text2">
              Você pode navegar no painel, mas criar produtos, ofertas, vender e afiliar ainda está bloqueado.
            </div>
          </>
        )}
        {isPending && (
          <>
            <div className="font-semibold text-text">Conta em modo de leitura</div>
            <div className="text-sm text-text2">
              Envie seus documentos em <strong>Verificação</strong> para criarmos seu recebedor no Pagar.me e liberar as operações.
            </div>
          </>
        )}
      </div>
      <Link to="/produtor/verificacao" className="btn-primary btn-sm flex-shrink-0">
        Ir para Verificação
      </Link>
    </div>
  );
}
