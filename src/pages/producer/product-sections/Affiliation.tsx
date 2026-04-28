import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { DateCell, WhatsAppLink } from '@/components/ui';
import { cn } from '@/lib/utils';
import { Copy, Users, Info, Lock, UserMinus } from 'lucide-react';

type Tab = 'config' | 'affiliates';

interface ConfigForm {
  commissionPct        : number;
  coproducerCommissionPct: number;  // override para "co-produtor" (afiliado upline)
  cookieDays           : number;
  affiliateDescription : string;
  showInMarketplace    : boolean;
}

export default function ProductAffiliationSection() {
  const { product } = useOutletContext<{ product: any }>();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('config');
  const isApproved = product?.status === 'APPROVED';

  // Pega a primeira oferta como referência (concorrente trata afiliação por produto;
  // nosso modelo é por oferta, então sincronizamos todas as ofertas com a mesma config)
  const offers: any[] = product?.offers || [];
  const firstOffer    = offers[0];
  const currentConfig = firstOffer?.affiliateConfig;

  const { register, handleSubmit, reset, watch } = useForm<ConfigForm>({
    defaultValues: {
      commissionPct          : currentConfig?.commissionBps ? currentConfig.commissionBps / 100 : 0,
      coproducerCommissionPct: currentConfig?.coproducerCommissionBps ? currentConfig.coproducerCommissionBps / 100 : 0,
      cookieDays             : currentConfig?.cookieDays || 30,
      affiliateDescription   : product?.affiliateDescription || '',
      showInMarketplace      : product?.showInMarketplace || false,
    },
  });

  useEffect(() => {
    reset({
      commissionPct          : currentConfig?.commissionBps ? currentConfig.commissionBps / 100 : 0,
      coproducerCommissionPct: currentConfig?.coproducerCommissionBps ? currentConfig.coproducerCommissionBps / 100 : 0,
      cookieDays             : currentConfig?.cookieDays || 30,
      affiliateDescription   : product?.affiliateDescription || '',
      showInMarketplace      : product?.showInMarketplace || false,
    });
  }, [currentConfig?.commissionBps, currentConfig?.coproducerCommissionBps, currentConfig?.cookieDays, product?.affiliateDescription, product?.showInMarketplace, reset]);

  const save = useMutation({
    mutationFn: async (d: ConfigForm) => {
      // Atualiza affiliate config para TODAS as ofertas (sincronizado por produto)
      await Promise.all(offers.map(o => api.post(`/affiliates/offers/${o.id}/config`, {
        enabled                : d.commissionPct > 0,
        commissionBps          : Math.round(d.commissionPct * 100),
        coproducerCommissionBps: Math.round((d.coproducerCommissionPct || 0) * 100),
        cookieDays             : d.cookieDays,
        description            : d.affiliateDescription,
      })));
      // Atualiza descrição e flag marketplace no produto.
      // Vitrine força false se produto não APPROVED (backend também valida).
      await api.patch(`/products/${product.id}`, {
        affiliateDescription: d.affiliateDescription || null,
        showInMarketplace   : isApproved ? d.showInMarketplace : false,
      });
    },
    onSuccess: () => {
      toast.success('Afiliação salva!');
      qc.invalidateQueries({ queryKey: ['producer-product', product.id] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erro ao salvar'),
  });

  // Lista de afiliados que se inscreveram em qualquer oferta deste produto
  const { data: enrollments } = useQuery<any[]>({
    queryKey: ['product-affiliates', product?.id],
    queryFn : async () => {
      const all = await Promise.all(offers.map(o =>
        api.get(`/affiliates/offers/${o.id}/enrollments`).then(r => r.data).catch(() => [])
      ));
      const flat = all.flat();
      const seen = new Set<string>();
      return flat.filter((e: any) => {
        const key = e.affiliate?.id || e.affiliateId;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    },
    enabled: tab === 'affiliates' && offers.length > 0,
  });

  const blockAffiliate = useMutation({
    mutationFn: (affiliateId: string) => api.post(`/affiliates/products/${product.id}/affiliates/${affiliateId}/block`),
    onSuccess : () => {
      toast.success('Afiliado removido — link não comissiona mais e re-inscrição bloqueada');
      qc.invalidateQueries({ queryKey: ['product-affiliates', product?.id] });
    },
    onError   : (e: any) => toast.error(e?.response?.data?.message || 'Erro ao remover'),
  });

  const askBlock = (e: any) => {
    const name = e.affiliate?.user?.name || 'este afiliado';
    if (window.confirm(
      `Remover ${name} desta oferta?\n\n` +
      `O link de afiliação dele para de comissionar e ele não poderá se inscrever novamente em nenhuma oferta deste produto.`
    )) {
      blockAffiliate.mutate(e.affiliate?.id || e.affiliateId);
    }
  };

  const inviteSlug = firstOffer?.slug;
  const inviteUrl  = inviteSlug ? `${window.location.origin}/afiliar/${inviteSlug}` : null;

  return (
    <div className="space-y-3">
      {/* Sub-tabs */}
      <div className="flex gap-1 border-b border-border">
        {[
          { id: 'config'    , label: 'Configurações' },
          { id: 'affiliates', label: 'Afiliados', count: (enrollments?.length || 0) },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as Tab)}
            className={cn(
              'px-3 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5',
              tab === t.id ? 'border-accent text-accent' : 'border-transparent text-text3 hover:text-text2'
            )}
          >
            {t.label}
            {(t as any).count > 0 && (
              <span className="bg-bg3 text-text2 text-[10px] px-1.5 py-0.5 rounded-full">{(t as any).count}</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'config' && (
        <form onSubmit={handleSubmit(d => save.mutate(d))} className="space-y-4">
          {!isApproved && (
            <div className="card p-3 bg-amber/10 border border-amber/30 flex items-start gap-2 text-sm text-amber">
              <Lock size={14} className="flex-shrink-0 mt-0.5" />
              <div>
                <strong>Aguardando aprovação</strong> — Você pode configurar a comissão, mas o link de afiliação e a vitrine só ficam disponíveis após o admin aprovar este produto.
              </div>
            </div>
          )}
          <div className="card p-4 space-y-4">
            {offers.length === 0 ? (
              <div className="bg-amber/10 border border-amber/30 rounded p-3 text-sm text-amber flex items-start gap-2">
                <Info size={14} className="flex-shrink-0 mt-0.5" />
                <span>Crie uma oferta antes de configurar afiliação.</span>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="label">Comissão do afiliado *</label>
                    <div className="relative">
                      <input
                        {...register('commissionPct', { valueAsNumber: true, min: 0, max: 50 })}
                        type="number"
                        step="0.5"
                        className="input pr-10"
                        placeholder="0"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text3 text-sm">%</span>
                    </div>
                    <p className="text-[10px] text-text3 mt-1">Comissão para o afiliado direto. Use 0 para desabilitar.</p>
                  </div>
                  <div>
                    <label className="label">% Co-produtor (afiliado upline)</label>
                    <div className="relative">
                      <input
                        {...register('coproducerCommissionPct', { valueAsNumber: true, min: 0, max: 20 })}
                        type="number"
                        step="0.5"
                        className="input pr-10"
                        placeholder="0"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text3 text-sm">%</span>
                    </div>
                    <p className="text-[10px] text-text3 mt-1">Override pago ao afiliado que indicou o vendedor (pirâmide de 1 nível).</p>
                  </div>
                  <div>
                    <label className="label">Cookie (dias) *</label>
                    <input {...register('cookieDays', { valueAsNumber: true, min: 1, max: 90 })} type="number" className="input" />
                    <p className="text-[10px] text-text3 mt-1">Janela de rastreamento da indicação.</p>
                  </div>
                </div>

                <div>
                  <label className="label">Descrição para afiliados *</label>
                  <textarea {...register('affiliateDescription')} rows={3} className="input resize-y" placeholder="O que motiva o afiliado a divulgar este produto?" />
                </div>

                <div className={`flex items-center gap-3 ${!isApproved ? 'opacity-50' : ''}`}>
                  <label className={`relative inline-flex items-center ${isApproved ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                    <input type="checkbox" {...register('showInMarketplace')} disabled={!isApproved} className="sr-only peer" />
                    <div className="w-11 h-6 bg-bg3 rounded-full peer-checked:bg-accent transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-transform peer-checked:after:translate-x-5"></div>
                  </label>
                  <span className="text-sm text-text">Exibir produto na vitrine</span>
                  {!isApproved && <span className="text-[10px] text-amber inline-flex items-center gap-1"><Lock size={10} /> Requer aprovação</span>}
                </div>

                {inviteUrl && watch('commissionPct') > 0 && (
                  <div className={`bg-bg3 rounded p-3 ${!isApproved ? 'opacity-60' : ''}`}>
                    <div className="text-[10px] text-text3 uppercase mb-1 flex items-center gap-1">
                      Link de convite direto
                      {!isApproved && <span className="text-amber inline-flex items-center gap-1 normal-case ml-1"><Lock size={10} /> bloqueado até aprovação</span>}
                    </div>
                    {isApproved ? (
                      <div className="flex items-center justify-between gap-2">
                        <code className="text-xs text-text font-mono truncate">{inviteUrl}</code>
                        <button type="button" onClick={() => { navigator.clipboard.writeText(inviteUrl); toast.success('Link copiado'); }} className="btn-ghost btn-sm flex-shrink-0">
                          <Copy size={12} />
                        </button>
                      </div>
                    ) : (
                      <div className="text-xs text-text3 italic">
                        O link só pode ser compartilhado depois que o admin aprovar o produto.
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {offers.length > 0 && (
            <button type="submit" disabled={save.isPending} className="btn-primary w-full justify-center py-3">
              {save.isPending ? 'Salvando...' : 'Salvar'}
            </button>
          )}
        </form>
      )}

      {tab === 'affiliates' && (
        <div className="card overflow-x-auto">
          {!enrollments || enrollments.length === 0 ? (
            <div className="p-8 text-center text-text3">
              <Users size={32} className="mx-auto mb-2 opacity-40" />
              <p>Nenhum afiliado inscrito ainda.</p>
            </div>
          ) : (
            <table className="table w-full">
              <thead>
                <tr><th>Afiliado</th><th>Email</th><th>Código</th><th>Status</th><th>Inscrito em</th><th>Ações</th></tr>
              </thead>
              <tbody>
                {enrollments.map((e: any) => {
                  const isBlocked = e.status === 'BLOCKED';
                  return (
                  <tr key={e.id}>
                    <td>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium text-text truncate">{e.affiliate?.user?.name || '—'}</span>
                        <WhatsAppLink phone={e.affiliate?.user?.phone} />
                      </div>
                    </td>
                    <td className="text-text2">{e.affiliate?.user?.email || '—'}</td>
                    <td><code className="text-xs bg-bg3 px-2 py-0.5 rounded text-accent">{e.affiliate?.code}</code></td>
                    <td><span className={isBlocked ? 'badge-red' : e.status === 'ACTIVE' ? 'badge-green' : 'badge-gray'}>{e.status}</span></td>
                    <td><DateCell date={e.createdAt} /></td>
                    <td>
                      {!isBlocked && (
                        <button
                          onClick={() => askBlock(e)}
                          disabled={blockAffiliate.isPending}
                          className="btn-ghost btn-sm border border-red/40 text-red hover:bg-red/10 inline-flex items-center gap-1"
                          title="Remover afiliado deste produto"
                        >
                          <UserMinus size={12} /> Remover
                        </button>
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
