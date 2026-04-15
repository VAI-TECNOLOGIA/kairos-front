import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { PageHeader } from '@/components/ui';
import { formatBRL } from '@/lib/utils';
import { Copy, Link2, MousePointer, ShoppingCart, TrendingUp } from 'lucide-react';

export default function AffiliateLinks() {
  const [copied, setCopied] = useState<string | null>(null);

  const { data: enrollments, isLoading } = useQuery({
    queryKey: ['affiliate-enrollments'],
    queryFn : () => api.get('/affiliates/my-enrollments').then(r => r.data),
  });

  const copyLink = (link: string, id: string) => {
    navigator.clipboard.writeText(link);
    setCopied(id);
    toast.success('Link copiado!');
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div>
      <PageHeader
        title="Meus Links"
        sub="Links de afiliado para cada oferta que você promove"
      />

      {isLoading ? (
        <div className="text-text2 text-sm">Carregando...</div>
      ) : (enrollments || []).length === 0 ? (
        <div className="card flex flex-col items-center py-12 gap-3 text-center">
          <Link2 size={32} className="text-text2" />
          <p className="text-text2">Nenhum link ainda.</p>
          <p className="text-text3 text-sm">Acesse o Marketplace para se inscrever em ofertas.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {(enrollments || []).map((e: any) => (
            <div key={e.id} className="card">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  {e.productImage && (
                    <img src={e.productImage} alt="" className="w-12 h-12 rounded-lg object-cover" />
                  )}
                  <div>
                    <div className="font-semibold text-text">{e.productName}</div>
                    <div className="text-xs text-text3">{e.offerName}</div>
                    <span className="badge-blue text-xs mt-1 inline-block">{e.commissionBps / 100}% comissão</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm text-text2 flex-shrink-0">
                  
                  <div className="flex items-center gap-1">
                    <ShoppingCart size={13} />
                    {e.conversions} vendas
                  </div>
                  <div className="flex items-center gap-1 text-accent font-medium">
                    <TrendingUp size={13} />
                    {formatBRL(e.revenueCents)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-lg bg-bg3 border border-border">
                <span className="text-xs text-text3 font-mono flex-1 truncate">{e.link}</span>
                <button
                  className={`btn-sm ${copied === e.id ? 'btn-success' : 'btn-secondary'}`}
                  onClick={() => copyLink(e.link, e.id)}
                >
                  <Copy size={12} />
                  {copied === e.id ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}