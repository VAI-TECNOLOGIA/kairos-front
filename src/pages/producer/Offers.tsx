import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/auth.store";
import { PageHeader, Modal, EmptyState, SplitBarVisual } from "@/components/ui";
import { formatBRL } from "@/lib/utils";
import type { Product } from "@/types";
import { Tag, Plus, Copy, AlertCircle, Lock, Pencil, Users, X } from "lucide-react";

const offerSchema = z.object({ productId: z.string(), name: z.string().min(3), priceCents: z.number().int().positive(), type: z.enum(["STANDARD","UPSELL","ORDERBUMP","SUBSCRIPTION"]) });
type OfferForm = z.infer<typeof offerSchema>;

const editSchema = z.object({ name: z.string().min(3), priceCents: z.number().int().positive(), type: z.enum(["STANDARD","UPSELL","ORDERBUMP","SUBSCRIPTION"]) });
type EditForm = z.infer<typeof editSchema>;

export default function OfferManager() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const isAffiliate = user?.role === 'AFFILIATE';

  const [openOffer, setOpenOffer] = useState(false);
  const [editingOffer, setEditingOffer] = useState<any | null>(null);
  const [coprodOffer, setCoprodOffer] = useState<any | null>(null);
  const [coprodEmail, setCoprodEmail] = useState('');
  const [coprodPct, setCoprodPct]     = useState(10);

  const { data: products } = useQuery({ queryKey:["my-products"], queryFn:()=>api.get("/products").then(r=>r.data) });

  // Taxa da plataforma (vem do admin — não é hardcoded)
  const { data: feeData } = useQuery({
    queryKey: ['platform-fee'],
    queryFn : () => api.get('/admin/platform-fee').then(r => r.data),
  });
  const platformBps     = feeData?.platformBps ?? 500;           // 500 bps = 5%
  const platformPct     = platformBps / 100;                      // 5
  const producerQuotaPct = 100 - platformPct;                     // 95

  const allProducts: Product[] = products?.data || [];

  const { register: ro, handleSubmit: ho, reset: rro, watch: wo } = useForm<OfferForm>({ resolver: zodResolver(offerSchema), defaultValues:{type:"STANDARD"} });
  const watchOfferPrice = wo('priceCents');

  const { register: re, handleSubmit: he, reset: rre, watch: we } = useForm<EditForm>({ resolver: zodResolver(editSchema) });
  const watchEditPrice = we('priceCents');

  const openEdit = (o: any) => {
    setEditingOffer(o);
    rre({ name: o.name, priceCents: o.priceCents, type: o.type });
  };
  const closeEdit = () => { setEditingOffer(null); rre(); };

  const updateOffer = useMutation({
    mutationFn: (d: EditForm) => api.put(`/offers/${editingOffer.id}`, { name: d.name, priceCents: d.priceCents }),
    onSuccess : () => {
      toast.success("Oferta atualizada!");
      qc.invalidateQueries({ queryKey: ["my-products"] });
      closeEdit();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erro ao atualizar'),
  });

  // Refetcha a oferta + splits depois de mexer
  const refreshCoprod = () => qc.invalidateQueries({ queryKey: ["my-products"] });

  const addCoprod = useMutation({
    mutationFn: () => api.post(`/offers/${coprodOffer.id}/coproducer-splits`, {
      email: coprodEmail.trim(),
      basisPoints: Math.round(coprodPct * 100),
    }),
    onSuccess: async () => {
      toast.success('Co-produtor adicionado');
      setCoprodEmail('');
      setCoprodPct(10);
      await refreshCoprod();
      // Atualiza a referência da oferta no estado
      if (coprodOffer) {
        const fresh = await api.get('/products').then(r => r.data);
        const all = (fresh?.data || []).flatMap((p: any) => p.offers || []);
        const updated = all.find((o: any) => o.id === coprodOffer.id);
        if (updated) setCoprodOffer(updated);
      }
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erro'),
  });

  const removeCoprod = useMutation({
    mutationFn: ({ offerId, userId }: { offerId: string; userId: string }) => api.delete(`/offers/${offerId}/coproducer-splits/${userId}`),
    onSuccess: async () => {
      toast.success('Co-produtor removido');
      await refreshCoprod();
      if (coprodOffer) {
        const fresh = await api.get('/products').then(r => r.data);
        const all = (fresh?.data || []).flatMap((p: any) => p.offers || []);
        const updated = all.find((o: any) => o.id === coprodOffer.id);
        if (updated) setCoprodOffer(updated);
      }
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erro'),
  });

  const saveStandardSplit = async (offerId: string) => {
    const { data: fee } = await api.get('/admin/platform-fee');
    const pBps = fee.platformBps || 500;
    const prodBps = 10000 - pBps;
    await api.post(`/offers/${offerId}/splits`, {
      splits: [
        { recipientType: "PLATFORM", recipientId: "platform", basisPoints: pBps, description: `Taxa plataforma ${(pBps / 100).toFixed(2)}%` },
        { recipientType: "PRODUCER", basisPoints: prodBps, description: `Produtor ${(prodBps / 100).toFixed(2)}%` },
      ],
    });
  };

  const createOffer = useMutation({
    mutationFn: async (d: OfferForm) => {
      const offer = await api.post("/offers", d);
      try {
        await saveStandardSplit(offer.data.id);
      } catch (err: any) {
        console.warn('[offers] split padrão não configurado:', err?.message);
      }
      return offer;
    },
    onSuccess: () => {
      toast.success("Oferta criada!");
      qc.invalidateQueries({ queryKey: ["my-products"] });
      setOpenOffer(false);
      rro();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erro ao criar oferta'),
  });

  const fixSplit = useMutation({
    mutationFn: async (offerId: string) => saveStandardSplit(offerId),
    onSuccess: () => {
      toast.success('Split configurado!');
      qc.invalidateQueries({ queryKey: ['my-products'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erro ao configurar split'),
  });

  const copyLink = async (slug: string) => {
    await navigator.clipboard.writeText(`${window.location.origin}/checkout/${slug}`);
    toast.success("Link copiado!");
  };

  return (
    <div>
      <PageHeader
        title="Ofertas & Split Engine"
        sub={isAffiliate ? "Gerencie as ofertas dos seus produtos" : "Crie ofertas e gerencie os links de checkout"}
        actions={<button onClick={()=>setOpenOffer(true)} className="btn-primary btn-sm"><Plus size={14}/> Nova oferta</button>}
      />

      {allProducts.length === 0 ? <EmptyState icon={<Tag size={32}/>} title="Sem produtos" sub="Crie um produto primeiro." /> : (
        <div className="space-y-4">
          {allProducts.map(p => {
            const productStatus = (p as any).status as string | undefined;
            const productApproved = productStatus === 'APPROVED';
            const productRejected = productStatus === 'REJECTED';
            return (
            <div key={p.id} className="card">
              <div className="font-semibold text-text mb-3 flex items-center gap-2 flex-wrap">
                {p.name}
                <span className="badge-gray text-[10px]">{p.type}</span>
                {productStatus && (
                  <span className={
                    productApproved ? 'badge-green text-[10px]'
                    : productRejected ? 'badge-red text-[10px]'
                    : 'badge-amber text-[10px]'
                  }>
                    {productApproved ? 'Aprovado'
                    : productRejected ? 'Recusado'
                    : productStatus === 'PENDING' ? 'Em análise'
                    : productStatus}
                  </span>
                )}
              </div>
              {(p.offers||[]).map(o => {
                const hasSplits   = o.splitRules && o.splitRules.length > 0;
                const canSell     = productApproved && hasSplits;
                return (
                <div key={o.id} className="bg-bg3 rounded-[7px] p-4 mb-2">
                  <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-text">{o.name}</span>
                      <span className="badge-blue text-[10px]">{o.type}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-accent">{formatBRL(o.priceCents)}</span>
                      {/* Link só aparece quando a oferta pode de fato receber pagamento */}
                      {canSell ? (
                        <button onClick={()=>copyLink(o.slug)} className="btn-ghost btn-sm p-1" title="Copiar link de checkout">
                          <Copy size={13}/>
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] text-text3" title="Link indisponível">
                          <Lock size={11} /> Link bloqueado
                        </span>
                      )}
                      <button onClick={()=>setCoprodOffer(o)} className="btn-ghost btn-sm p-1" title="Co-produção (dividir % com sócio)">
                        <Users size={13}/>
                      </button>
                      <button onClick={()=>openEdit(o)} className="btn-ghost btn-sm p-1" title="Editar oferta">
                        <Pencil size={13}/>
                      </button>
                    </div>
                  </div>

                  {/* Alerta — produto recusado */}
                  {productRejected && (
                    <div className="flex items-start gap-2 bg-red/10 border border-red/30 rounded-[6px] p-2.5 text-xs text-red">
                      <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
                      <span>
                        Produto recusado — esta oferta não pode ser comercializada.
                        Revise o cadastro do produto e reenvie para análise.
                      </span>
                    </div>
                  )}

                  {/* Alerta — split não configurado (oferta legada) */}
                  {!productRejected && !hasSplits && (
                    <div className="flex items-start gap-2 bg-amber/10 border border-amber/30 rounded-[6px] p-2.5 text-xs text-amber">
                      <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <strong>Split não configurado.</strong>{' '}
                        Aplica o split padrão ({platformPct}% plataforma + {producerQuotaPct}% você) automaticamente.{' '}
                        <button
                          onClick={() => fixSplit.mutate(o.id)}
                          disabled={fixSplit.isPending}
                          className="underline hover:no-underline font-semibold"
                        >{fixSplit.isPending ? 'Configurando...' : 'Configurar agora'}</button>.
                      </div>
                    </div>
                  )}

                  {/* Alerta — aguardando aprovação */}
                  {!productRejected && hasSplits && !productApproved && (
                    <div className="flex items-start gap-2 bg-bg2 border border-border rounded-[6px] p-2.5 text-xs text-text3">
                      <Lock size={13} className="flex-shrink-0 mt-0.5" />
                      <span>
                        Produto em análise pelo admin. O link ficará disponível após aprovação.
                      </span>
                    </div>
                  )}

                  {hasSplits && (
                    <div className="mt-2">
                      <SplitBarVisual rules={o.splitRules!} priceCents={o.priceCents} />
                    </div>
                  )}
                </div>
                );
              })}
              {(!p.offers||p.offers.length===0) && <p className="text-sm text-text3">Nenhuma oferta — crie a primeira acima</p>}
            </div>
            );
          })}
        </div>
      )}

      {/* Modal nova oferta */}
      <Modal open={openOffer} onClose={()=>setOpenOffer(false)} title="Nova Oferta"
        footer={<><button className="btn-ghost" onClick={()=>setOpenOffer(false)}>Cancelar</button><button className="btn-primary" onClick={ho(d=>createOffer.mutate(d))}>{createOffer.isPending ? 'Criando...' : 'Criar oferta'}</button></>}>
        <div className="space-y-4">
          <div className="form-group"><label className="label">Produto *</label>
            <select {...ro("productId")} className="input">{allProducts.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
          </div>
          <div className="form-group"><label className="label">Nome da oferta *</label><input {...ro("name")} className="input" placeholder="Ex: Oferta Normal"/></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="form-group">
              <label className="label">Preço (em centavos) *</label>
              <input {...ro("priceCents",{valueAsNumber:true})} type="number" className="input" placeholder="9700"/>
              <p className="text-[11px] text-text2 mt-1">Equivale a <strong className="text-accent">{formatBRL(Number(watchOfferPrice) || 0)}</strong></p>
            </div>
            <div className="form-group"><label className="label">Tipo</label><select {...ro("type")} className="input"><option value="STANDARD">Padrão</option><option value="UPSELL">Upsell</option><option value="ORDERBUMP">Order Bump</option></select></div>
          </div>
          {isAffiliate && (
            <div className="bg-bg3 rounded-[8px] p-3 text-xs text-text3">
              O split será configurado automaticamente: <strong className="text-text">5% plataforma + 95% para você</strong>.
            </div>
          )}
        </div>
      </Modal>

      {/* Modal editar oferta */}
      <Modal open={!!editingOffer} onClose={closeEdit} title={`Editar oferta — ${editingOffer?.name || ''}`}
        footer={<><button className="btn-ghost" onClick={closeEdit}>Cancelar</button><button className="btn-primary" onClick={he(d => updateOffer.mutate(d))}>{updateOffer.isPending ? 'Salvando...' : 'Salvar'}</button></>}>
        <div className="space-y-4">
          <div className="form-group"><label className="label">Nome da oferta *</label><input {...re("name")} className="input" /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="form-group">
              <label className="label">Preço (em centavos) *</label>
              <input {...re("priceCents",{valueAsNumber:true})} type="number" className="input" />
              <p className="text-[11px] text-text2 mt-1">Equivale a <strong className="text-accent">{formatBRL(Number(watchEditPrice) || 0)}</strong></p>
            </div>
            <div className="form-group">
              <label className="label">Tipo</label>
              <select {...re("type")} className="input" disabled>
                <option value="STANDARD">Padrão</option><option value="UPSELL">Upsell</option><option value="ORDERBUMP">Order Bump</option><option value="SUBSCRIPTION">Assinatura</option>
              </select>
              <p className="text-[11px] text-text3 mt-1">Tipo não pode ser alterado.</p>
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal: gerenciar co-produção fixa */}
      <Modal open={!!coprodOffer} onClose={() => setCoprodOffer(null)} title={`Co-produção — ${coprodOffer?.name || ''}`}>
        {coprodOffer && (() => {
          const rules = (coprodOffer.splitRules || []) as any[];
          const platform = rules.find((r: any) => r.recipientType === 'PLATFORM');
          const producer = rules.find((r: any) => r.recipientType === 'PRODUCER');
          const coprods  = rules.filter((r: any) => r.recipientType === 'COPRODUCER');
          const platformPct = platform ? (platform.basisPoints / 100) : 0;
          const producerPct = producer ? (producer.basisPoints / 100) : 0;
          const coprodTotalPct = coprods.reduce((s: number, r: any) => s + r.basisPoints, 0) / 100;

          return (
            <div className="space-y-4">
              <div className="bg-bg3 rounded p-3 text-xs">
                <div className="font-semibold text-text mb-2">Distribuição atual da oferta:</div>
                <div className="space-y-1 text-text2">
                  <div className="flex justify-between"><span>Plataforma</span><strong>{platformPct.toFixed(2)}%</strong></div>
                  <div className="flex justify-between"><span>Produtor (você)</span><strong className="text-accent">{producerPct.toFixed(2)}%</strong></div>
                  {coprods.length > 0 && (
                    <div className="flex justify-between text-text3 italic"><span>Co-produtores</span><span>{coprodTotalPct.toFixed(2)}%</span></div>
                  )}
                </div>
                <p className="text-[10px] text-text3 mt-2">
                  Adicionar co-produtor reduz sua parte ({producerPct.toFixed(2)}%). A comissão de afiliado e o override de coprodutor por venda continuam saindo da sua parte.
                </p>
              </div>

              {coprods.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-text">Co-produtores configurados:</div>
                  {coprods.map((c: any) => (
                    <div key={c.id} className="flex items-center justify-between gap-2 bg-bg3 rounded px-3 py-2 text-sm">
                      <div className="min-w-0 flex-1">
                        <div className="text-text truncate">{c.description || c.recipientId}</div>
                        <code className="text-[10px] text-text3 truncate block">{c.recipientId}</code>
                      </div>
                      <span className="badge-blue text-xs">{(c.basisPoints / 100).toFixed(2)}%</span>
                      <button
                        onClick={() => confirm('Remover este co-produtor?') && removeCoprod.mutate({ offerId: coprodOffer.id, userId: c.recipientId })}
                        className="btn-ghost btn-sm text-red"
                        title="Remover"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t border-border pt-3">
                <div className="text-xs font-medium text-text mb-2">Adicionar co-produtor:</div>
                <div className="form-group">
                  <label className="label">Email do co-produtor *</label>
                  <input className="input" type="email" placeholder="email@dominio.com" value={coprodEmail} onChange={e => setCoprodEmail(e.target.value)} />
                  <p className="text-[11px] text-text3 mt-1">Pessoa precisa ter conta na Kairos.</p>
                </div>
                <div className="form-group">
                  <label className="label">% para co-produtor *</label>
                  <input className="input" type="number" min="1" max="50" step="0.5" value={coprodPct} onChange={e => setCoprodPct(Number(e.target.value))} />
                  <p className="text-[11px] text-text3 mt-1">Sai da sua parte ({producerPct.toFixed(2)}%). Mínimo 1%, máximo 50%.</p>
                </div>
                <button
                  className="btn-primary btn-sm w-full justify-center"
                  disabled={addCoprod.isPending || !coprodEmail.trim() || coprodPct < 1}
                  onClick={() => addCoprod.mutate()}
                >
                  {addCoprod.isPending ? 'Adicionando...' : 'Adicionar co-produtor'}
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>

    </div>
  );
}