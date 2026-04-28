import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { PageHeader } from '@/components/ui';
import { formatBRL } from '@/lib/utils';
import { Network, ShoppingBag, TrendingUp } from 'lucide-react';

interface CoproductionOffer {
  offerId      : string;
  offerName    : string;
  productId    : string;
  productName  : string;
  productImage : string | null;
  productStatus: string;
  priceCents   : number;
  myBps        : number;
  myPct        : number;
  salesCount   : number;
}

export default function ProducerCoproductions() {
  const { data, isLoading } = useQuery<{ totalEarningsCents: number; offers: CoproductionOffer[] }>({
    queryKey: ['producer-my-coproductions'],
    queryFn : () => api.get('/offers/my-coproductions').then(r => r.data),
  });

  const offers = data?.offers || [];
  const total  = data?.totalEarningsCents || 0;

  return (
    <div>
      <PageHeader
        title="Onde sou co-produtor"
        sub="Ofertas de outros produtores onde você foi atribuído como co-produtor fixo — você ganha % toda venda."
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="card p-4">
          <div className="text-xs text-text3 mb-1">Ofertas como co-produtor</div>
          <div className="text-2xl font-bold text-text">{offers.length}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-text3 mb-1">Vendas dessas ofertas</div>
          <div className="text-2xl font-bold text-text">
            {offers.reduce((s, o) => s + o.salesCount, 0)}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-text3 mb-1">Total ganho como co-produtor</div>
          <div className="text-2xl font-bold text-accent inline-flex items-center gap-1.5">
            <TrendingUp size={18} /> {formatBRL(total)}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-text3 text-sm">Carregando...</div>
      ) : offers.length === 0 ? (
        <div className="card flex flex-col items-center py-12 gap-3 text-center">
          <Network size={32} className="text-text2" />
          <p className="text-text2">Você ainda não foi atribuído como co-produtor de nenhuma oferta.</p>
          <p className="text-text3 text-sm max-w-md">
            Quando o produtor de outro produto te adicionar como co-produtor fixo (com %), as ofertas aparecem aqui.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {offers.map(o => (
            <div key={o.offerId} className="card flex items-center gap-3 p-4">
              {o.productImage ? (
                <img src={o.productImage} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-bg3 flex items-center justify-center flex-shrink-0">
                  <ShoppingBag size={18} className="text-text3" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-text truncate">{o.productName}</div>
                <div className="text-xs text-text3 truncate">{o.offerName} · {formatBRL(o.priceCents)}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-text3">Sua parte</div>
                <div className="font-bold text-accent">{o.myPct.toFixed(2)}%</div>
                <div className="text-[10px] text-text3 mt-0.5">≈ {formatBRL(Math.floor(o.priceCents * o.myBps / 10000))} / venda</div>
              </div>
              <div className="text-right border-l border-border pl-3">
                <div className="text-xs text-text3">Vendas</div>
                <div className="font-bold text-text">{o.salesCount}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
