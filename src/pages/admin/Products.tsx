import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { publicOrigin } from '@/lib/share-url';
import { useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { PageHeader, Modal, Loading, EmptyState, DateCell, WhatsAppLink } from '@/components/ui';
import { formatBRL, productStatusVariant, PRODUCT_TYPE_LABEL, dateRelAbs } from '@/lib/utils';
import { Package, Image as ImageIcon, CheckCircle, XCircle, ExternalLink, RotateCcw, Info, Tag as TagIcon, User as UserIcon, Link as LinkIcon, DollarSign } from 'lucide-react';

const PLATFORM_FEE = 0.05; // 5%

const STATUS_TABS = ['Todos', 'Pendentes', 'Em revisão', 'Aprovados', 'Rejeitados'];
const STATUS_MAP: Record<string, string | undefined> = {
  'Pendentes' : 'PENDING',
  'Em revisão': 'REVIEW',
  'Aprovados' : 'APPROVED',
  'Rejeitados': 'REJECTED',
};

type ProductTab = 'info' | 'offers' | 'producer' | 'links' | 'billing';

export default function AdminProducts() {
  const qc = useQueryClient();
  const [tab, setTab]         = useState('Todos');
  const [selected, setSelected] = useState<any>(null);
  const [modalTab, setModalTab] = useState<ProductTab>('info');

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
      setSelected(null);
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

  const requestChanges = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.post(`/products/${id}/request-changes`, { reason }),
    onSuccess: () => {
      toast.success('Solicitação enviada ao produtor.');
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
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
                      <TagIcon size={10} className="text-white/60" />
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
                    <div className="text-xs text-amber italic">Configure sua primeira oferta para esse produto</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de detalhes — 5 abas */}
      {selected && (
        <Modal
          open={!!selected}
          onClose={() => setSelected(null)}
          title={selected.name}
          size="lg"
          footer={
            <div className="flex gap-2 flex-wrap justify-end w-full">
              <button className="btn-ghost btn-sm" onClick={() => setSelected(null)}>Fechar</button>
              {['PENDING', 'REVIEW'].includes(selected.status) && (
                <>
                  <button
                    className="btn-danger btn-sm"
                    onClick={() => {
                      const reason = prompt('Motivo da recusa (mínimo 5 caracteres):');
                      if (reason && reason.length >= 5) reject.mutate({ id: selected.id, reason });
                    }}
                    disabled={reject.isPending}
                  >
                    <XCircle size={14} /> Recusar
                  </button>
                  <button
                    className="btn-amber btn-sm"
                    onClick={() => {
                      const reason = prompt('O que o produtor precisa ajustar? (mínimo 5 caracteres)');
                      if (reason && reason.length >= 5) requestChanges.mutate({ id: selected.id, reason });
                    }}
                    disabled={requestChanges.isPending}
                  >
                    <RotateCcw size={14} /> Solicitar alteração
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
          {/* Header compacto */}
          <div className="flex items-center gap-2 mb-3 -mt-1">
            <span className="text-[10px] font-mono text-text3 truncate">{selected.id}</span>
            <span className={productStatusVariant(selected.status)}>{selected.status}</span>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-4 border-b border-border overflow-x-auto">
            {[
              { id: 'info'    , label: 'Informações', icon: Info },
              { id: 'offers'  , label: 'Ofertas',     icon: TagIcon },
              { id: 'producer', label: 'Produtor',    icon: UserIcon },
              { id: 'links'   , label: 'Links',       icon: LinkIcon },
              { id: 'billing' , label: 'Faturamento', icon: DollarSign },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setModalTab(t.id as ProductTab)}
                className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-1 whitespace-nowrap ${
                  modalTab === t.id ? 'border-accent text-accent' : 'border-transparent text-text3 hover:text-text2'
                }`}
              >
                <t.icon size={12} /> {t.label}
              </button>
            ))}
          </div>

          {/* Aba: Informações */}
          {modalTab === 'info' && (
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="w-32 flex-shrink-0 mx-auto sm:mx-0">
                {selected.imageUrl ? (
                  <img src={selected.imageUrl} alt={selected.name} className="w-full rounded-xl object-cover border border-border" style={{ aspectRatio: '1' }} />
                ) : (
                  <div className="w-full aspect-square rounded-xl bg-bg3 border border-border flex items-center justify-center">
                    <ImageIcon size={28} className="text-text3/40" strokeWidth={1} />
                  </div>
                )}
              </div>
              <dl className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div><dt className="text-[10px] text-text3 uppercase">Nome</dt><dd className="text-text">{selected.name}</dd></div>
                <div><dt className="text-[10px] text-text3 uppercase">Tipo</dt><dd className="text-text">{PRODUCT_TYPE_LABEL[selected.type] || selected.type}</dd></div>
                <div><dt className="text-[10px] text-text3 uppercase">Categoria</dt><dd className="text-text">{selected.category || '—'}</dd></div>
                <div><dt className="text-[10px] text-text3 uppercase">Ofertas</dt><dd className="text-text">{selected.offers?.length || 0}</dd></div>
                <div className="sm:col-span-2"><dt className="text-[10px] text-text3 uppercase">Descrição</dt><dd className="text-text2 text-xs leading-relaxed">{selected.description || <em className="text-text3">Não informado</em>}</dd></div>
                <div><dt className="text-[10px] text-text3 uppercase">Cadastrado</dt><dd>{(() => { const d = dateRelAbs(selected.createdAt); return d && <><div className="text-text">{d.rel}</div><div className="text-[10px] text-text3">{d.abs}</div></>; })()}</dd></div>
                <div><dt className="text-[10px] text-text3 uppercase">Atualizado</dt><dd>{(() => { const d = dateRelAbs(selected.updatedAt); return d && <><div className="text-text">{d.rel}</div><div className="text-[10px] text-text3">{d.abs}</div></>; })()}</dd></div>
                {selected.rejectedReason && (
                  <div className="sm:col-span-2 bg-amber/10 border border-amber/20 rounded p-2 text-xs">
                    <div className="text-[10px] text-amber uppercase font-semibold">Motivo da revisão/rejeição</div>
                    <div className="text-text">{selected.rejectedReason}</div>
                  </div>
                )}
              </dl>
            </div>
          )}

          {/* Aba: Ofertas */}
          {modalTab === 'offers' && (
            <div className="overflow-x-auto">
              <table className="table w-full text-sm">
                <thead><tr><th>Nome</th><th className="text-right">Preço</th><th className="text-right">Produtor recebe</th><th>Slug</th></tr></thead>
                <tbody>
                  {(selected.offers || []).length === 0 ? (
                    <tr><td colSpan={4} className="text-center text-text3 py-4">Sem ofertas cadastradas</td></tr>
                  ) : selected.offers.map((o: any) => (
                    <tr key={o.id}>
                      <td>{o.name}</td>
                      <td className="text-right font-bold">{formatBRL(o.priceCents)}</td>
                      <td className="text-right text-green">{formatBRL(recebeAte(o.priceCents))}</td>
                      <td>
                        <a href={`/checkout/${o.slug}`} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline text-xs flex items-center gap-1">
                          /checkout/{o.slug} <ExternalLink size={9} />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Aba: Produtor */}
          {modalTab === 'producer' && (
            <div className="space-y-2">
              {selected.producer ? (
                <>
                  <div className="flex items-center gap-3">
                    {selected.producer.user?.avatarUrl ? (
                      <img src={selected.producer.user.avatarUrl} alt="" className="w-12 h-12 rounded-full object-cover border border-border" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold">
                        {selected.producer.user?.name?.slice(0, 2).toUpperCase() || '?'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-text">{selected.producer.user?.name}</div>
                      <div className="text-xs text-text3">{selected.producer.user?.email}</div>
                    </div>
                    <WhatsAppLink phone={selected.producer.user?.phone} />
                  </div>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm pt-3 border-t border-border">
                    <div><dt className="text-[10px] text-text3 uppercase">Empresa</dt><dd className="text-text">{selected.producer.companyName || '—'}</dd></div>
                    <div><dt className="text-[10px] text-text3 uppercase">CNPJ/CPF</dt><dd className="text-text">{selected.producer.user?.document || '—'}</dd></div>
                    <div><dt className="text-[10px] text-text3 uppercase">Status KYC</dt><dd className="text-text">{selected.producer.kycStatus || '—'}</dd></div>
                    <div><dt className="text-[10px] text-text3 uppercase">Telefone</dt><dd className="text-text">{selected.producer.user?.phone || '—'}</dd></div>
                  </dl>
                </>
              ) : <div className="text-text3 text-sm">Sem dados do produtor</div>}
            </div>
          )}

          {/* Aba: Links */}
          {modalTab === 'links' && (
            <div className="space-y-2">
              {selected.digitalUrl && (
                <div className="bg-bg3 rounded-[7px] px-3 py-2">
                  <div className="text-[10px] text-text3 uppercase mb-1">Link digital de entrega</div>
                  <a href={selected.digitalUrl} target="_blank" rel="noopener noreferrer" className="text-accent text-xs hover:underline break-all">{selected.digitalUrl}</a>
                </div>
              )}
              <div className="space-y-1">
                {(selected.offers || []).filter((o: any) => o.slug).map((o: any) => {
                  const url = `${publicOrigin()}/checkout/${o.slug}`;
                  return (
                    <div key={o.id} className="bg-bg3 rounded-[7px] px-3 py-2 flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-xs text-text3">{o.name}</div>
                        <div className="text-xs text-text font-mono truncate">{url}</div>
                      </div>
                      <button onClick={() => { navigator.clipboard.writeText(url); toast.success('Link copiado'); }} className="btn-ghost btn-sm">Copiar</button>
                    </div>
                  );
                })}
                {!selected.digitalUrl && (selected.offers || []).every((o: any) => !o.slug) && (
                  <div className="text-text3 text-sm text-center py-4">Sem links disponíveis</div>
                )}
              </div>
            </div>
          )}

          {/* Aba: Faturamento */}
          {modalTab === 'billing' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div className="card p-3">
                <div className="text-[10px] text-text3 uppercase">Vendas totais</div>
                <div className="text-lg font-bold text-text">{selected._count?.orders ?? 0}</div>
              </div>
              <div className="card p-3">
                <div className="text-[10px] text-text3 uppercase">Faturamento bruto</div>
                <div className="text-lg font-bold text-text">{formatBRL(selected.totalRevenueCents || 0)}</div>
              </div>
              <div className="card p-3">
                <div className="text-[10px] text-text3 uppercase">Reembolsos</div>
                <div className="text-lg font-bold text-amber">{formatBRL(selected.totalRefundedCents || 0)}</div>
              </div>
              <div className="sm:col-span-3 text-xs text-text3 text-center pt-2">
                Detalhes financeiros completos em <a href="/admin/relatorios" className="text-accent hover:underline">Relatórios</a>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
