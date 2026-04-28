import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { PageHeader } from '@/components/ui';
import { formatBRL } from '@/lib/utils';
import { Users, TrendingUp, Network, ShoppingBag } from 'lucide-react';

interface DownlineEntry {
  affiliateId: string;
  affiliateCode: string;
  name: string | null;
  email: string | null;
  offerId: string;
  offerName: string;
  priceCents: number;
  coproducerBps: number;
  enrolledAt: string;
  status: string;
}

interface CoproductionProduct {
  productId: string;
  productName: string;
  productImage: string | null;
  downlineCount: number;
  downline: DownlineEntry[];
}

export default function AffiliateCoproductions() {
  const { data, isLoading } = useQuery<{ products: CoproductionProduct[]; totalEarnedCents: number }>({
    queryKey: ['affiliate-coproductions'],
    queryFn : () => api.get('/affiliates/my-coproductions').then(r => r.data),
  });

  const products = data?.products || [];
  const totalEarned = data?.totalEarnedCents || 0;

  return (
    <div>
      <PageHeader
        title="Minhas Co-produções"
        sub="Produtos onde você indicou outros afiliados — cada venda deles te paga uma % override (pirâmide de 1 nível)"
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="card p-4">
          <div className="text-xs text-text3 mb-1">Produtos com downline</div>
          <div className="text-2xl font-bold text-text">{products.length}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-text3 mb-1">Afiliados indicados</div>
          <div className="text-2xl font-bold text-text">
            {products.reduce((s, p) => s + p.downlineCount, 0)}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-text3 mb-1">Total ganho como co-produtor</div>
          <div className="text-2xl font-bold text-accent inline-flex items-center gap-1.5">
            <TrendingUp size={18} /> {formatBRL(totalEarned)}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-text3 text-sm">Carregando...</div>
      ) : products.length === 0 ? (
        <div className="card flex flex-col items-center py-12 gap-3 text-center">
          <Network size={32} className="text-text2" />
          <p className="text-text2">Nenhum afiliado abaixo de você ainda.</p>
          <p className="text-text3 text-sm max-w-md">
            Para se tornar co-produtor: vá em <strong>Meus Links</strong>, copie o
            <strong> link de indicação</strong> de um produto e compartilhe com pessoas que querem virar afiliadas.
            Quando elas venderem, você ganha uma % override sobre cada venda delas.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {products.map(p => (
            <div key={p.productId} className="card">
              <div className="flex items-center gap-3 mb-3">
                {p.productImage ? (
                  <img src={p.productImage} alt="" className="w-12 h-12 rounded-lg object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-bg3 flex items-center justify-center">
                    <ShoppingBag size={18} className="text-text3" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-text truncate">{p.productName}</div>
                  <div className="text-xs text-text3 inline-flex items-center gap-1 mt-0.5">
                    <Users size={11} /> {p.downlineCount} afiliado{p.downlineCount !== 1 ? 's' : ''} abaixo
                  </div>
                </div>
              </div>

              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Afiliado</th>
                      <th>Email</th>
                      <th>Código</th>
                      <th>Oferta</th>
                      <th>Preço</th>
                      <th>% override</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {p.downline.map(d => (
                      <tr key={`${d.affiliateId}-${d.offerId}`}>
                        <td className="font-medium text-text">{d.name || '—'}</td>
                        <td className="text-text2">{d.email || '—'}</td>
                        <td><code className="text-xs bg-bg3 px-2 py-0.5 rounded text-accent">{d.affiliateCode}</code></td>
                        <td className="text-text2">{d.offerName}</td>
                        <td className="text-text2">{formatBRL(d.priceCents)}</td>
                        <td>
                          {d.coproducerBps > 0 ? (
                            <span className="badge-blue text-xs">
                              {(d.coproducerBps / 100).toFixed(1)}% = {formatBRL(Math.floor(d.priceCents * d.coproducerBps / 10000))}/venda
                            </span>
                          ) : (
                            <span className="text-xs text-text3">—</span>
                          )}
                        </td>
                        <td>
                          <span className={d.status === 'BLOCKED' ? 'badge-red' : 'badge-green'}>{d.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
