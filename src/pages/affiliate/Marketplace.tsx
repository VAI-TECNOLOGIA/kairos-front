import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { PageHeader } from '@/components/ui';
import { ShoppingBag, CheckCircle, Plus } from 'lucide-react';

export default function AffiliateMarketplace() {
  const qc = useQueryClient();

  const { data: offers, isLoading } = useQuery({
    queryKey: ['affiliate-marketplace'],
    queryFn : () => api.get('/affiliates/marketplace').then(r => r.data),
  });

  const enroll = useMutation({
    mutationFn: (offerId: string) => api.post('/affiliates/enroll', { offerId }),
    onSuccess: () => {
      toast.success('Inscrito com sucesso! Acesse Meus Links para copiar seu link.');
      qc.invalidateQueries({ queryKey: ['affiliate-marketplace'] });
      qc.invalidateQueries({ queryKey: ['affiliate-enrollments'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erro ao se inscrever'),
  });

  return (
    <div>
      <PageHeader
        title="Marketplace"
        sub="Escolha produtos para promover e ganhar comissões"
      />

      {isLoading ? (
        <div className="text-text2 text-sm">Carregando ofertas...</div>
      ) : (offers || []).length === 0 ? (
        <div className="card flex flex-col items-center py-12 gap-3 text-center">
          <ShoppingBag size={32} className="text-text2" />
          <p className="text-text2">Nenhuma oferta disponível para afiliação ainda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {(offers || []).map((offer: any) => (
            <div key={offer.offerId} className="card flex flex-col gap-3">
              {offer.productImage && (
                <img
                  src={offer.productImage}
                  alt={offer.productName}
                  className="w-full h-36 object-cover rounded-lg"
                />
              )}
              <div className="flex-1">
                <div className="font-semibold text-text">{offer.productName}</div>
                <div className="text-xs text-text3 mb-2">{offer.offerName}</div>
                {offer.description && (
                  <p className="text-sm text-text2 mb-3">{offer.description}</p>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="badge-blue text-xs">{offer.commissionPct}% comissão</span>
                  <span className="badge text-xs">{offer.cookieDays} dias de cookie</span>
                </div>
              </div>

              {offer.myStatus === 'ACTIVE' ? (
                <div className="flex items-center gap-2 text-success text-sm font-medium">
                  <CheckCircle size={14} />
                  Inscrito
                </div>
              ) : (
                <button
                  className="btn-primary btn-sm w-full"
                  onClick={() => enroll.mutate(offer.offerId)}
                  disabled={enroll.isPending}
                >
                  <Plus size={14} />
                  Quero promover
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}