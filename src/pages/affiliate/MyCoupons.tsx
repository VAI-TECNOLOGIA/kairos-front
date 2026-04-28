import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/ui';
import { Tag, Copy, ShoppingBag } from 'lucide-react';

interface Coupon {
  id          : string;
  code        : string;
  discountBps : number;
  isActive    : boolean;
  usageCount  : number;
  product     : { id: string; name: string; imageUrl: string | null };
}

export default function MyCoupons() {
  const { data: coupons, isLoading } = useQuery<Coupon[]>({
    queryKey: ['my-coupons'],
    queryFn : () => api.get('/affiliates/my-coupons').then(r => r.data),
  });

  const copy = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`Cupom ${code} copiado`);
  };

  return (
    <div>
      <PageHeader
        title="Meus Cupons"
        sub="Cupons exclusivos que produtores te deram. Compartilhe o código com seu público — toda venda usando seu cupom te credita como vendedor."
      />

      {isLoading ? (
        <div className="card p-6 text-text3 text-sm">Carregando...</div>
      ) : (coupons || []).length === 0 ? (
        <div className="card flex flex-col items-center py-12 gap-3 text-center">
          <Tag size={32} className="text-text2" />
          <p className="text-text2">Nenhum cupom ainda.</p>
          <p className="text-text3 text-sm max-w-md">
            Cupons são criados pelo produtor de cada produto. Quando você for escolhido como divulgador exclusivo, ele aparece aqui.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(coupons || []).map(c => (
            <div key={c.id} className="card p-4 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                {c.product.imageUrl ? (
                  <img src={c.product.imageUrl} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-bg3 flex items-center justify-center flex-shrink-0">
                    <ShoppingBag size={18} className="text-text3" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="font-semibold text-text truncate">{c.product.name}</div>
                  <div className="text-xs text-text3">{c.usageCount} {c.usageCount === 1 ? 'uso' : 'usos'}</div>
                </div>
              </div>

              <div className="bg-accent/10 border border-accent/30 rounded-lg p-3 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-text3 uppercase tracking-wide">Seu cupom</div>
                  <div className="font-mono text-lg font-bold text-accent">{c.code}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-text3 uppercase tracking-wide">Desconto</div>
                  <div className="font-bold text-text">{(c.discountBps / 100).toFixed(1)}%</div>
                </div>
              </div>

              <button onClick={() => copy(c.code)} className="btn-primary btn-sm justify-center">
                <Copy size={13} /> Copiar código
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
