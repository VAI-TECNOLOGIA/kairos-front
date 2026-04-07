import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { PageHeader, Modal, Loading, EmptyState } from '@/components/ui';
import { formatBRL, formatDate, productStatusVariant, PRODUCT_TYPE_LABEL } from '@/lib/utils';
import { Package, Image as ImageIcon, CheckCircle, XCircle, ExternalLink, Tag, Calendar, User } from 'lucide-react';

const PLATFORM_FEE = 0.05; // 5%

const STATUS_TABS = ['Todos', 'Pendentes', 'Aprovados', 'Rejeitados'];
const STATUS_MAP: Record<string, string | undefined> = {
  'Pendentes' : 'PENDING',
  'Aprovados' : 'APPROVED',
  'Rejeitados': 'REJECTED',
};

export default function AdminProducts() {
  const qc = useQueryClient();
  const [tab, setTab]         = useState('Todos');
  const [selected, setSelected] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-products', tab],
    queryFn : () => {
      const status = STATUS_MAP[tab];
      return api.get(`/products/admin/all${status ? `?status=${status}` : ''}`).then(r => r.data);
    },
  });

  const approve = useMutation({
    mutationFn: (id: string) => api.post(`/products/${id}/approve`),
    onSuccess  : () => {
      toast.success('Produto aprovado!');
      qc.invalidateQueries({ queryKey: ['admin-products'] });
      setSelected((prev: any) => prev ? { ...prev, status: 'APPROVED' } : null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erro'),
  });

  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.post(`/products/${id}/reject`, { reason }),
    onSuccess: () => {
      toast.success('Produto rejeitado.');
      qc.invalidateQueries({ queryKey: ['admin-products'] });
      setSelected(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erro'),
  });

  const products: any[] = data?.data || [];

  // Melhor preço de oferta do produto
  const bestOffer = (p: any) => {
    const offers = p.offers || [];
    if (!offers.length) return null;
    return offers.reduce((best: any, o: any) =>
      !best || o.priceCents < best.priceCents ? o : best, null);
  };

  const recebeAte = (priceCents: number) =>
    Math.round(priceCents * (1 - PLATFORM_FEE));

  return (
    <div>
      <PageHeader title="Produtos" sub="Catálogo e aprovações" />

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-border">
        {STATUS_TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? 'border-accent text-accent'
                : 'border-transparent text-text3 hover:text-text2'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {isLoading ? <Loading /> : products.length === 0 ? (
        <EmptyState icon={<Package size={32} />} title="Nenhum produto" sub="Nenhum produto encontrado nesta categoria." />
      ) : (
        <div className="grid grid-cols-4 gap-4">
          {products.map((p: any) => {
            const offer  = bestOffer(p);
            const recebe = offer ? recebeAte(offer.priceCents) : null;

            return (
              <div
                key={p.id}
                onClick={() => setSelected(p)}
                className="card p-0 overflow-hidden cursor-pointer hover:border-accent/40 hover:shadow-lg hover:shadow-accent/5 transition-all group"
              >
                {/* Imagem */}
                <div className="relative bg-bg3 aspect-square overflow-hidden">
                  {p.imageUrl ? (
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon size={36} className="text-text3/40" strokeWidth={1} />
                    </div>
                  )}
                  {/* Badge status */}
                  <div className="absolute top-2 right-2">
                    <span className={productStatusVariant(p.status)}>{p.status}</span>
                  </div>
                  {/* Badge tipo */}
                  <div className="absolute top-2 left-2">
                    <span className="badge-gray text-[10px]">{PRODUCT_TYPE_LABEL[p.type] || p.type}</span>
                  </div>
                  {/* Contagem de vendas */}
                  {offer && (
                    <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm rounded-full px-2 py-0.5 flex items-center gap-1">
                      <Tag size={10} className="text-white/60" />
                      <span className="text-[10px] text-white/80">{p.offers?.length || 0} oferta(s)</span>
                    </div>
                  )}
                </div>

                {/* Conteúdo */}
                <div className="p-3">
                  <h3 className="font-semibold text-text text-sm leading-tight truncate mb-1">
                    {p.name}
                  </h3>
                  {p.category && (
                    <p className="text-[10px] text-text3 truncate mb-2">{p.category}</p>
                  )}

                  {recebe !== null ? (
                    <div>
                      <div className="text-[10px] text-text3">Afiliado recebe até</div>
                      <div className="text-base font-bold text-green">
                        {formatBRL(recebe)}
                      </div>
                      <div className="text-[10px] text-text3">
                        de {formatBRL(offer.priceCents)} (–5% plataforma)
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-text3 italic">Sem oferta cadastrada</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de detalhes */}
      {selected && (
        <Modal
          open={!!selected}
          onClose={() => setSelected(null)}
          title="Detalhes do Produto"
          size="lg"
          footer={
            <div className="flex gap-2">
              <button className="btn-ghost" onClick={() => setSelected(null)}>Fechar</button>
              {selected.status === 'PENDING' && (
                <>
                  <button
                    className="btn-danger btn-sm"
                    onClick={() => {
                      const reason = prompt('Motivo da rejeição:');
                      if (reason) reject.mutate({ id: selected.id, reason });
                    }}
                    disabled={reject.isPending}
                  >
                    <XCircle size={14} /> Rejeitar
                  </button>
                  <button
                    className="btn-success btn-sm"
                    onClick={() => approve.mutate(selected.id)}
                    disabled={approve.isPending}
                  >
                    <CheckCircle size={14} /> Aprovar
                  </button>
                </>
              )}
            </div>
          }
        >
          <div className="flex gap-5">
            {/* Imagem */}
            <div className="w-40 flex-shrink-0">
              {selected.imageUrl ? (
                <img src={selected.imageUrl} alt={selected.name} className="w-full rounded-xl object-cover border border-border" style={{ aspectRatio: '1' }} />
              ) : (
                <div className="w-full aspect-square rounded-xl bg-bg3 border border-border flex items-center justify-center">
                  <ImageIcon size={32} className="text-text3/40" strokeWidth={1} />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 space-y-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-lg font-bold text-text">{selected.name}</h2>
                  <span className={productStatusVariant(selected.status)}>{selected.status}</span>
                </div>
                {selected.description && (
                  <p className="text-sm text-text2 leading-relaxed">{selected.description}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  ['Tipo',       PRODUCT_TYPE_LABEL[selected.type] || selected.type],
                  ['Categoria',  selected.category || '—'],
                  ['Cadastro',   formatDate(selected.createdAt)],
                  ['Ofertas',    `${selected.offers?.length || 0} ativa(s)`],
                ].map(([k, v]) => (
                  <div key={k} className="bg-bg3 rounded-[7px] px-3 py-2">
                    <div className="text-[10px] text-text3 uppercase tracking-wide">{k}</div>
                    <div className="text-sm font-medium text-text">{v}</div>
                  </div>
                ))}
              </div>

              {/* Ofertas */}
              {(selected.offers || []).length > 0 && (
                <div>
                  <div className="text-xs text-text3 uppercase tracking-wide mb-2">Ofertas</div>
                  <div className="space-y-1.5">
                    {selected.offers.map((o: any) => (
                      <div key={o.id} className="flex items-center justify-between bg-bg3 rounded-[7px] px-3 py-2">
                        <div>
                          <div className="text-sm font-medium text-text">{o.name}</div>
                          {o.slug && (
                            <a
                              href={`/checkout/${o.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-accent flex items-center gap-1 hover:underline"
                            >
                              /checkout/{o.slug} <ExternalLink size={9} />
                            </a>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-text">{formatBRL(o.priceCents)}</div>
                          <div className="text-[10px] text-green">Recebe {formatBRL(recebeAte(o.priceCents))}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Link digital */}
              {selected.digitalUrl && (
                <div className="flex items-center gap-2 bg-bg3 rounded-[7px] px-3 py-2">
                  <ExternalLink size={13} className="text-accent flex-shrink-0" />
                  <a href={selected.digitalUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-accent hover:underline truncate">
                    {selected.digitalUrl}
                  </a>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}