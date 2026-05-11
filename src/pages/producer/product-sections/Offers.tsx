import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Modal } from '@/components/ui';
import { formatBRL, cn } from '@/lib/utils';
import { Plus, Copy, Lock, AlertCircle, Trash2, Tag, Pencil, Users } from 'lucide-react';

interface OfferForm {
  productId          : string;
  name               : string;
  priceCents         : number;
  type               : string;
  subscriptionCycle ?: string;
  subscriptionMonths?: number | null;
}

export default function ProductOffersSection() {
  const { product } = useOutletContext<{ product: any }>();
  const qc = useQueryClient();
  const [openNew, setOpenNew] = useState(false);
  const [editingOffer, setEditingOffer] = useState<any | null>(null);
  const [coprodOffer, setCoprodOffer] = useState<any | null>(null);
  const [coprodPct, setCoprodPct]     = useState(10);
  const productApproved = product?.status === 'APPROVED';
  const productRejected = product?.status === 'REJECTED';

  const { register, handleSubmit, reset, watch } = useForm<OfferForm>({
    defaultValues: { productId: product?.id, type: 'STANDARD' },
  });
  const watchType  = watch('type');
  const watchPrice = watch('priceCents');

  const openEdit = (o: any) => {
    setEditingOffer(o);
    reset({
      productId         : product?.id,
      name              : o.name,
      priceCents        : o.priceCents,
      type              : o.type,
      subscriptionCycle : o.subscriptionCycle  || 'MONTHLY',
      subscriptionMonths: o.subscriptionMonths || null,
    });
  };
  const closeEdit = () => {
    setEditingOffer(null);
    reset({ productId: product?.id, type: 'STANDARD', name: '', priceCents: 0 });
  };

  const update = useMutation({
    mutationFn: async (d: OfferForm) => {
      const payload: any = {
        name      : d.name,
        priceCents: d.priceCents,
      };
      if (d.type === 'SUBSCRIPTION') {
        payload.subscriptionCycle  = d.subscriptionCycle;
        payload.subscriptionMonths = d.subscriptionMonths || null;
      }
      return api.put(`/offers/${editingOffer.id}`, payload);
    },
    onSuccess: () => {
      toast.success('Oferta atualizada!');
      qc.invalidateQueries({ queryKey: ['producer-product', product.id] });
      qc.invalidateQueries({ queryKey: ['my-products'] });
      closeEdit();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erro ao atualizar'),
  });

  const create = useMutation({
    mutationFn: async (d: OfferForm) => {
      const payload: any = { ...d, productId: product.id };
      if (d.type !== 'SUBSCRIPTION') {
        delete payload.subscriptionCycle;
        delete payload.subscriptionMonths;
      } else if (!payload.subscriptionMonths) {
        payload.subscriptionMonths = null; // vitalícia
      }
      const offer = await api.post('/offers', payload);
      try {
        const fee = await api.get('/admin/platform-fee');
        const platformBps = fee.data.platformBps || 500;
        await api.post(`/offers/${offer.data.id}/splits`, {
          splits: [
            { recipientType: 'PLATFORM', recipientId: 'platform', basisPoints: platformBps, description: `Taxa plataforma ${(platformBps/100).toFixed(2)}%` },
            { recipientType: 'PRODUCER', basisPoints: 10000 - platformBps, description: `Produtor ${((10000 - platformBps)/100).toFixed(2)}%` },
          ],
        });
      } catch {/* default split fail */}
      return offer;
    },
    onSuccess: () => {
      toast.success('Oferta criada!');
      qc.invalidateQueries({ queryKey: ['producer-product', product.id] });
      qc.invalidateQueries({ queryKey: ['my-products'] });
      setOpenNew(false);
      reset({ productId: product.id, type: 'STANDARD', name: '', priceCents: 0 });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erro ao criar'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/offers/${id}`),
    onSuccess : () => {
      toast.success('Oferta removida');
      qc.invalidateQueries({ queryKey: ['producer-product', product.id] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erro'),
  });

  const saveCoprod = useMutation({
    mutationFn: () => api.put(`/offers/${coprodOffer.id}/coproducer-pool`, {
      basisPoints: Math.round(coprodPct * 100),
    }),
    onSuccess: () => {
      toast.success('Co-produção atualizada');
      qc.invalidateQueries({ queryKey: ['producer-product', product.id] });
      qc.invalidateQueries({ queryKey: ['my-products'] });
      setCoprodOffer(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erro'),
  });

  const offers: any[] = product?.offers || [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-text">Ofertas</h2>
        <button onClick={() => setOpenNew(true)} className="btn-primary btn-sm">
          <Plus size={14} /> Nova oferta
        </button>
      </div>

      {offers.length === 0 ? (
        <div className="card p-8 text-center text-text3">
          <Tag size={32} className="mx-auto mb-2 opacity-40" />
          <p>Nenhuma oferta cadastrada. Crie a primeira.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {offers.map(o => {
            const hasSplits = (o.splitRules || []).length > 0;
            const canSell   = productApproved && hasSplits;
            return (
              <div key={o.id} className="card p-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-text">{o.name}</div>
                    <div className="text-xs text-text3 mt-0.5">{o.type} · {formatBRL(o.priceCents)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {canSell ? (
                      <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/checkout/${o.slug}`); toast.success('Link copiado'); }} className="btn-ghost btn-sm">
                        <Copy size={13} /> Link
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] text-text3"><Lock size={11} />bloqueado</span>
                    )}
                    <button
                      onClick={() => {
                        setCoprodOffer(o);
                        const poolBps = (o.splitRules || [])
                          .filter((r: any) => r.recipientType === 'COPRODUCER' && !r.recipientId)
                          .reduce((s: number, r: any) => s + r.basisPoints, 0);
                        setCoprodPct(poolBps / 100);
                      }}
                      className="btn-ghost btn-sm"
                      title="Co-produção (% liberada)"
                    >
                      <Users size={13} />
                    </button>
                    <button onClick={() => openEdit(o)} className="btn-ghost btn-sm" title="Editar oferta">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => confirm('Remover oferta?') && remove.mutate(o.id)} className="btn-ghost btn-sm text-red" title="Remover oferta">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                {productRejected && (
                  <div className="mt-2 text-xs text-red flex items-start gap-1.5">
                    <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />
                    <span>Produto recusado — esta oferta não pode ser comercializada.</span>
                  </div>
                )}
                {!productRejected && !productApproved && (
                  <div className="mt-2 text-xs text-text3 flex items-start gap-1.5">
                    <Lock size={12} className="flex-shrink-0 mt-0.5" />
                    <span>Produto em análise. Link disponível após aprovação.</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal open={openNew} onClose={() => setOpenNew(false)} title="Nova Oferta"
        footer={<>
          <button className="btn-ghost" onClick={() => setOpenNew(false)}>Cancelar</button>
          <button className="btn-primary" onClick={handleSubmit(d => create.mutate(d))} disabled={create.isPending}>
            {create.isPending ? 'Criando...' : 'Criar oferta'}
          </button>
        </>}
      >
        <div className="space-y-3">
          <div>
            <label className="label">Nome da oferta *</label>
            <input {...register('name', { required: true })} className="input" placeholder="Ex: Oferta Padrão" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Preço (em centavos) *</label>
              <input {...register('priceCents', { valueAsNumber: true, required: true, min: 100 })} type="number" className="input" placeholder="9700" />
              <p className="text-[11px] text-text2 mt-1">
                Equivale a <strong className="text-accent">{formatBRL(Number(watchPrice) || 0)}</strong>
              </p>
            </div>
            <div>
              <label className="label">Tipo</label>
              <select {...register('type')} className="input">
                <option value="STANDARD">Padrão</option>
                <option value="UPSELL">Upsell</option>
                <option value="ORDERBUMP">Order Bump</option>
                <option value="SUBSCRIPTION">Assinatura recorrente</option>
              </select>
            </div>
          </div>

          {watchType === 'SUBSCRIPTION' && (
            <div className="grid grid-cols-2 gap-3 p-3 rounded bg-accent/5 border border-accent/20">
              <div className="col-span-2 text-xs text-accent font-medium">Configuração da assinatura</div>
              <div>
                <label className="label">Frequência *</label>
                <select {...register('subscriptionCycle')} className="input" defaultValue="MONTHLY">
                  <option value="WEEKLY">Semanal</option>
                  <option value="BIWEEKLY">Quinzenal</option>
                  <option value="MONTHLY">Mensal</option>
                  <option value="QUARTERLY">Trimestral</option>
                  <option value="SEMIANNUAL">Semestral</option>
                  <option value="ANNUAL">Anual</option>
                </select>
              </div>
              <div>
                <label className="label">Duração total</label>
                <select
                  {...register('subscriptionMonths', { setValueAs: v => v === '' || v === '0' ? null : Number(v) })}
                  className="input"
                  defaultValue=""
                >
                  <option value="">Vitalícia (até cancelar)</option>
                  <option value="3">3 meses</option>
                  <option value="6">6 meses</option>
                  <option value="12">12 meses</option>
                  <option value="24">24 meses</option>
                  <option value="36">36 meses</option>
                </select>
                <p className="text-[10px] text-text3 mt-1">Se preenchida, a cobrança encerra após o período. Cliente paga × frequência.</p>
              </div>
            </div>
          )}

          <div className={cn('text-xs p-3 rounded bg-bg3 text-text3')}>
            Split padrão automático: 5% plataforma + 95% produtor.
          </div>
        </div>
      </Modal>

      {/* Modal editar oferta */}
      <Modal open={!!editingOffer} onClose={closeEdit} title={`Editar oferta — ${editingOffer?.name || ''}`}
        footer={<>
          <button className="btn-ghost" onClick={closeEdit}>Cancelar</button>
          <button className="btn-primary" onClick={handleSubmit(d => update.mutate(d))} disabled={update.isPending}>
            {update.isPending ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </>}
      >
        <div className="space-y-3">
          <div>
            <label className="label">Nome da oferta *</label>
            <input {...register('name', { required: true })} className="input" />
          </div>
          <div>
            <label className="label">Preço (em centavos) *</label>
            <input {...register('priceCents', { valueAsNumber: true, required: true, min: 100 })} type="number" className="input" />
            <p className="text-[11px] text-text2 mt-1">
              Equivale a <strong className="text-accent">{formatBRL(Number(watchPrice) || 0)}</strong>
            </p>
          </div>

          {watchType === 'SUBSCRIPTION' && (
            <div className="grid grid-cols-2 gap-3 p-3 rounded bg-accent/5 border border-accent/20">
              <div className="col-span-2 text-xs text-accent font-medium">Configuração da assinatura</div>
              <div>
                <label className="label">Frequência *</label>
                <select {...register('subscriptionCycle')} className="input">
                  <option value="WEEKLY">Semanal</option>
                  <option value="BIWEEKLY">Quinzenal</option>
                  <option value="MONTHLY">Mensal</option>
                  <option value="QUARTERLY">Trimestral</option>
                  <option value="SEMIANNUAL">Semestral</option>
                  <option value="ANNUAL">Anual</option>
                </select>
              </div>
              <div>
                <label className="label">Duração total</label>
                <select
                  {...register('subscriptionMonths', { setValueAs: v => v === '' || v === '0' ? null : Number(v) })}
                  className="input"
                >
                  <option value="">Vitalícia (até cancelar)</option>
                  <option value="3">3 meses</option>
                  <option value="6">6 meses</option>
                  <option value="12">12 meses</option>
                  <option value="24">24 meses</option>
                  <option value="36">36 meses</option>
                </select>
              </div>
            </div>
          )}

          <p className="text-[11px] text-text3">
            Tipo da oferta não pode ser alterado depois de criada — gera novo registro se precisar mudar.
          </p>
        </div>
      </Modal>

      {/* Modal: % de co-produção liberada */}
      <Modal open={!!coprodOffer} onClose={() => setCoprodOffer(null)} title={`Co-produção — ${coprodOffer?.name || ''}`}
        footer={
          coprodOffer ? (() => {
            const rules = (coprodOffer.splitRules || []) as any[];
            const platformBps = rules.find(r => r.recipientType === 'PLATFORM')?.basisPoints || 0;
            const namedBps = rules
              .filter(r => r.recipientType === 'COPRODUCER' && r.recipientId)
              .reduce((s: number, r: any) => s + r.basisPoints, 0);
            const availablePct = (10000 - platformBps - namedBps) / 100;
            const maxPct = Math.min(20, availablePct);
            const exceeds = coprodPct > maxPct;
            return (
              <>
                <button className="btn-ghost" onClick={() => setCoprodOffer(null)}>Cancelar</button>
                <button
                  className="btn-primary"
                  disabled={saveCoprod.isPending || coprodPct < 0 || exceeds}
                  onClick={() => saveCoprod.mutate()}
                >
                  {saveCoprod.isPending ? 'Salvando...' : 'Salvar'}
                </button>
              </>
            );
          })() : null
        }>
        {coprodOffer && (() => {
          const rules = (coprodOffer.splitRules || []) as any[];
          const platformBps = rules.find(r => r.recipientType === 'PLATFORM')?.basisPoints || 0;
          const namedCoprods = rules.filter(r => r.recipientType === 'COPRODUCER' && r.recipientId);
          const namedBps = namedCoprods.reduce((s: number, r: any) => s + r.basisPoints, 0);
          const availableBps = 10000 - platformBps - namedBps;
          const availablePct = availableBps / 100;
          const maxPct = Math.min(20, availablePct);
          const yourPct = availablePct - coprodPct;
          const exceeds = coprodPct > maxPct;
          const priceCents = coprodOffer.priceCents || 0;

          return (
            <div className="space-y-4">
              <p className="text-sm text-text2">
                Defina a fatia da oferta destinada a <strong className="text-text">co-produção</strong>. Quem entrar como co-produtor vai dividir essa parte. Sai automaticamente da sua %.
              </p>

              <div className="bg-accent/10 border border-accent/30 rounded-[7px] p-3 flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-text3">Disponível pra co-produção</div>
                  <div className="text-xl font-bold text-accent">{availablePct.toFixed(2)}%</div>
                </div>
                <div className="text-right text-[11px] text-text3 leading-snug">
                  100% − {(platformBps / 100).toFixed(2)}% plataforma
                  {namedBps > 0 && <> − {(namedBps / 100).toFixed(2)}% co-produtores fixos</>}
                </div>
              </div>

              <div className="form-group">
                <label className="label">% liberada para co-produção (pool)</label>
                <input
                  type="number" min="0" max={maxPct} step="0.5"
                  className={`input text-lg font-semibold ${exceeds ? 'border-red' : ''}`}
                  value={coprodPct}
                  onChange={e => setCoprodPct(Number(e.target.value))}
                />
                <p className="text-[11px] text-text3 mt-1">
                  0% = sem co-produção. Máximo nesta oferta: <strong className="text-text2">{maxPct.toFixed(2)}%</strong>.
                </p>
              </div>

              <div className="bg-bg3 rounded p-3 text-xs space-y-1">
                <div className="font-semibold text-text mb-2">Como vai ficar a oferta:</div>
                <div className="flex justify-between"><span className="text-text2">Plataforma</span><span className="text-text">{(platformBps / 100).toFixed(2)}%</span></div>
                {namedCoprods.map((r: any, i: number) => (
                  <div key={i} className="flex justify-between">
                    <span className="text-text2">Co-produtor fixo</span>
                    <span className="text-text">{(r.basisPoints / 100).toFixed(2)}%</span>
                  </div>
                ))}
                <div className="flex justify-between">
                  <span className="text-text2">Você (produtor)</span>
                  <strong className={yourPct < 0 ? 'text-red' : 'text-accent'}>{yourPct.toFixed(2)}%</strong>
                </div>
                {coprodPct > 0 && (
                  <div className="flex justify-between">
                    <span className="text-text2">Co-produção (pool)</span>
                    <strong className="text-text">{coprodPct.toFixed(2)}%</strong>
                  </div>
                )}
                {priceCents > 0 && coprodPct > 0 && (
                  <div className="flex justify-between border-t border-border pt-1.5 mt-1.5">
                    <span className="text-text3">Em R$ por venda</span>
                    <span className="text-text2">≈ R$ {(priceCents * coprodPct / 10000 / 100).toFixed(2).replace('.', ',')}</span>
                  </div>
                )}
              </div>

              {exceeds && (
                <div className="bg-red/10 border border-red/30 rounded p-2 text-xs text-red">
                  Você está pedindo <strong>{coprodPct.toFixed(2)}%</strong>, mas o máximo nesta oferta é <strong>{maxPct.toFixed(2)}%</strong>
                  {maxPct < availablePct
                    ? <> (limite global de co-produção)</>
                    : <> ({availablePct.toFixed(2)}% disponível)</>}. Reduza.
                </div>
              )}
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
