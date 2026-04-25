import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Modal } from '@/components/ui';
import { formatBRL, cn } from '@/lib/utils';
import { Plus, Copy, Lock, AlertCircle, Trash2, Tag } from 'lucide-react';

interface OfferForm {
  productId  : string;
  name       : string;
  priceCents : number;
  type       : string;
}

export default function ProductOffersSection() {
  const { product } = useOutletContext<{ product: any }>();
  const qc = useQueryClient();
  const [openNew, setOpenNew] = useState(false);
  const productApproved = product?.status === 'APPROVED';
  const productRejected = product?.status === 'REJECTED';

  const { register, handleSubmit, reset } = useForm<OfferForm>({
    defaultValues: { productId: product?.id, type: 'STANDARD' },
  });

  const create = useMutation({
    mutationFn: async (d: OfferForm) => {
      const offer = await api.post('/offers', { ...d, productId: product.id });
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
                    <button onClick={() => confirm('Remover oferta?') && remove.mutate(o.id)} className="btn-ghost btn-sm text-red">
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
              <label className="label">Preço (centavos) *</label>
              <input {...register('priceCents', { valueAsNumber: true, required: true, min: 100 })} type="number" className="input" placeholder="9700" />
            </div>
            <div>
              <label className="label">Tipo</label>
              <select {...register('type')} className="input">
                <option value="STANDARD">Padrão</option>
                <option value="UPSELL">Upsell</option>
                <option value="ORDERBUMP">Order Bump</option>
              </select>
            </div>
          </div>
          <div className={cn('text-xs p-3 rounded bg-bg3 text-text3')}>
            Split padrão automático: 5% plataforma + 95% produtor.
          </div>
        </div>
      </Modal>
    </div>
  );
}
