import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { PageHeader } from '@/components/ui';
import { formatBRL } from '@/lib/utils';
import { Copy, Link2, MousePointer, ShoppingCart, TrendingUp, Users } from 'lucide-react';

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
              <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  {e.productImage && (
                    <img src={e.productImage} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="font-semibold text-text truncate">{e.productName}</div>
                    <div className="text-xs text-text3 truncate">{e.offerName}</div>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="badge-blue text-xs">{e.commissionBps / 100}% comissão</span>
                      {e.priceCents != null && (
                        <span className="text-[11px] text-text3">
                          Produto: <strong className="text-text2">{formatBRL(e.priceCents)}</strong>
                        </span>
                      )}
                      {e.commissionPerSaleCents != null && e.commissionPerSaleCents > 0 && (
                        <span className="text-[11px] text-green-400">
                          Você ganha <strong>{formatBRL(e.commissionPerSaleCents)}</strong> por venda
                        </span>
                      )}
                    </div>
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

              {(() => {
                // Link de checkout (cliente compra)
                const checkoutLink = e.offerSlug && e.affiliateCode
                  ? `${window.location.origin}/checkout/${e.offerSlug}?ref=${e.affiliateCode}`
                  : e.link;
                // Link de indicação de outros afiliados (pirâmide — vira co-produtor se houver venda)
                const inviteLink = e.offerSlug && e.affiliateCode
                  ? `${window.location.origin}/afiliar/${e.offerSlug}?upline=${e.affiliateCode}`
                  : null;
                return (
                  <div className="space-y-2">
                    <div>
                      <div className="text-[10px] text-text3 uppercase mb-1">Link de venda (para clientes)</div>
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-bg3 border border-border">
                        <span className="text-xs text-text3 font-mono flex-1 truncate">{checkoutLink}</span>
                        <button
                          className={`btn-sm ${copied === e.id ? 'btn-success' : 'btn-secondary'}`}
                          onClick={() => copyLink(checkoutLink, e.id)}
                        >
                          <Copy size={12} />
                          {copied === e.id ? 'Copiado!' : 'Copiar'}
                        </button>
                      </div>
                    </div>
                    {inviteLink && (
                      <div>
                        <div className="text-[10px] text-text3 uppercase mb-1 flex items-center gap-1">
                          <Users size={10} />
                          Link de indicação (vira co-produtor se afiliados indicados venderem)
                        </div>
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-bg3 border border-border">
                          <span className="text-xs text-text3 font-mono flex-1 truncate">{inviteLink}</span>
                          <button
                            className={`btn-sm ${copied === e.id + '-invite' ? 'btn-success' : 'btn-secondary'}`}
                            onClick={() => copyLink(inviteLink, e.id + '-invite')}
                          >
                            <Copy size={12} />
                            {copied === e.id + '-invite' ? 'Copiado!' : 'Copiar'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}