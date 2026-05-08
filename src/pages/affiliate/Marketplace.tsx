import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { PageHeader } from '@/components/ui';
import { ShoppingBag, CheckCircle, Plus, Network, Tag } from 'lucide-react';

export default function AffiliateMarketplace() {
  const qc = useQueryClient();
  const [searchParams] = useSearchParams();
  // Quando o usuário chega via /afiliado/marketplace?upline=CODIGO_AFILIADO, este enrollment
  // marca o upline como referredBy — vira pirâmide quando esse afiliado vender depois.
  const upline = searchParams.get('upline');

  const { data: offers, isLoading } = useQuery({
    queryKey: ['affiliate-marketplace'],
    queryFn : () => api.get('/affiliates/marketplace').then(r => r.data),
  });

  // Cupons que esse afiliado já tem (pra realçar produtos no marketplace)
  const { data: myCoupons } = useQuery<any[]>({
    queryKey: ['my-coupons'],
    queryFn : () => api.get('/affiliates/my-coupons').then(r => r.data),
  });
  const couponByProduct = (myCoupons || []).reduce((acc: Record<string, any>, c: any) => {
    acc[c.product?.id] = c;
    return acc;
  }, {});

  // Agrupa as ofertas por produto — 1 card por produto, não por oferta.
  // Backend (enrollAffiliateInAllProductOffers) inscreve em todas as ofertas válidas
  // do produto a partir de qualquer offerId, então mandamos a primeira como referência.
  // commissionPct: maior comissão entre as ofertas; myStatus: ACTIVE se alguma já estiver inscrita.
  type Offer = {
    offerId: string; offerName: string;
    productId: string; productName: string; productImage?: string;
    commissionBps: number; commissionPct: number;
    cookieDays: number; description?: string;
    myStatus: 'ACTIVE' | 'BLOCKED' | null;
  };
  type ProductCard = Offer & { offerCount: number };

  const productCards: ProductCard[] = Object.values(
    (offers || []).reduce((acc: Record<string, ProductCard>, o: Offer) => {
      const cur = acc[o.productId];
      if (!cur) {
        acc[o.productId] = { ...o, offerCount: 1 };
      } else {
        cur.offerCount += 1;
        if (o.commissionPct > cur.commissionPct) {
          cur.commissionBps = o.commissionBps;
          cur.commissionPct = o.commissionPct;
          cur.cookieDays    = o.cookieDays;
        }
        if (o.myStatus === 'ACTIVE') cur.myStatus = 'ACTIVE';
      }
      return acc;
    }, {}),
  );

  const enroll = useMutation({
    mutationFn: (offerId: string) => api.post('/affiliates/enroll', {
      offerId,
      ...(upline ? { referrerCode: upline } : {}),
    }),
    onSuccess: (res: any) => {
      const created = (res?.data?.enrollments || []).filter((e: any) => e.created).length;
      const total   = (res?.data?.enrollments || []).length;
      const msg = total > 1
        ? `Inscrito em ${total} oferta(s) deste produto${created > 0 ? ` (${created} novas)` : ''}. Veja em Meus Links.`
        : 'Inscrito com sucesso! Acesse Meus Links para copiar seu link.';
      toast.success(msg);
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

      {upline && (
        <div className="card p-3 mb-4 bg-accent/5 border border-accent/30 flex items-center gap-2 text-sm text-text2">
          <Network size={14} className="text-accent flex-shrink-0" />
          <span>Você foi indicado pelo afiliado <code className="text-accent font-mono">{upline}</code>. Ao se inscrever, ele vira <strong>co-produtor</strong> e ganha % override sobre suas vendas.</span>
        </div>
      )}

      {isLoading ? (
        <div className="text-text2 text-sm">Carregando ofertas...</div>
      ) : productCards.length === 0 ? (
        <div className="card flex flex-col items-center py-12 gap-3 text-center">
          <ShoppingBag size={32} className="text-text2" />
          <p className="text-text2">Nenhuma oferta disponível para afiliação ainda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {productCards.map((p) => (
            <div key={p.productId} className="card flex flex-col gap-3">
              {p.productImage && (
                <img
                  src={p.productImage}
                  alt={p.productName}
                  className="w-full h-36 object-cover rounded-lg"
                />
              )}
              <div className="flex-1">
                <div className="font-semibold text-text">{p.productName}</div>
                {p.description && (
                  <p className="text-sm text-text2 mb-3">{p.description}</p>
                )}
                {couponByProduct[p.productId] && (
                  <div className="bg-accent/10 border border-accent/30 rounded-lg p-2 mb-2 flex items-center gap-2 text-xs">
                    <Tag size={12} className="text-accent flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="text-text">Você tem um cupom para este produto:</div>
                      <div className="font-mono font-bold text-accent">
                        {couponByProduct[p.productId].code} ({(couponByProduct[p.productId].discountBps / 100).toFixed(1)}% off)
                      </div>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="badge-blue text-xs">{p.commissionPct}% comissão</span>
                  <span className="badge text-xs">{p.cookieDays} dias de cookie</span>
                </div>
              </div>

              {p.myStatus === 'ACTIVE' ? (
                <div className="flex items-center gap-2 text-success text-sm font-medium">
                  <CheckCircle size={14} />
                  Inscrito
                </div>
              ) : (
                <button
                  className="btn-primary btn-sm w-full"
                  onClick={() => enroll.mutate(p.offerId)}
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