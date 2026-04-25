import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { PageHeader } from '@/components/ui';
import { formatDateTime } from '@/lib/utils';
import { CheckCircle, Info, Settings, Copy, Link2 } from 'lucide-react';
import { useForm } from 'react-hook-form';

export default function ProducerAffiliates() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'approved' | 'offers'>('approved');
  const [selectedOffer, setSelectedOffer] = useState<any>(null);
  const { register: regOffer, handleSubmit: handleOffer, reset: resetOffer, setValue } = useForm();

  const { data: allAffiliates } = useQuery({
    queryKey: ['affiliates-pending'],
    queryFn : () => api.get('/affiliates/pending').then(r => r.data),
  });

  const { data: offers } = useQuery({
    queryKey: ['producer-affiliate-offers'],
    queryFn : () => api.get('/affiliates/offers').then(r => r.data),
    enabled : tab === 'offers',
  });

  const saveOfferConfig = useMutation({
    mutationFn: (d: any) => api.post(`/affiliates/offers/${selectedOffer.id}/config`, {
      enabled: true,
      commissionBps: Math.round(Number(d.commissionPct) * 100),
      cookieDays: Number(d.cookieDays) || 30,
      description: d.description,
    }),
    onSuccess: () => {
      toast.success('Configuração salva!');
      qc.invalidateQueries({ queryKey: ['producer-affiliate-offers'] });
      setSelectedOffer(null);
      resetOffer();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erro'),
  });

  const approvedList = Array.isArray(allAffiliates) ? allAffiliates.filter((a: any) => a.status === 'APPROVED') : [];

  return (
    <div>
      <PageHeader
        title="Afiliados"
        sub="Afiliados aprovados e configuração de comissões por oferta"
      />

      {/* Aviso — aprovação é feita pelo admin */}
      <div className="card mb-4 p-3 border-l-4 border-accent bg-accent/5 flex items-start gap-3">
        <Info size={15} className="text-accent flex-shrink-0 mt-0.5" />
        <div className="text-xs text-text2 leading-relaxed">
          A aprovação e rejeição de novos afiliados é feita pela <strong>equipe
          administrativa da Kairos Way</strong>. Aqui você visualiza os afiliados
          já aprovados e configura a comissão de cada oferta.
        </div>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { id: 'approved', icon: CheckCircle,   label: 'Aprovados' },
          { id: 'offers',   icon: Settings,      label: 'Comissões' },
        ].map(t => (
          <button
            key={t.id}
            className={`btn-sm ${tab === t.id ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setTab(t.id as any)}
          >
            <t.icon size={13} />
            {t.label}
          </button>
        ))}
        <div className="ml-auto text-xs text-text3 flex items-center gap-1">
          Link de cadastro:
          <span className="font-mono text-accent">/seja-afiliado</span>
        </div>
      </div>

      {tab === 'approved' && (
        <div className="card">
          {approvedList.length === 0 ? (
            <p className="text-text2 text-sm py-6 text-center">Nenhum afiliado aprovado ainda.</p>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead><tr><th>Nome</th><th>E-mail</th><th>Código</th><th>Aprovado em</th></tr></thead>
                <tbody>
                  {approvedList.map((a: any) => (
                    <tr key={a.id}>
                      <td className="font-medium text-text">{a.user.name}</td>
                      <td className="text-text2">{a.user.email}</td>
                      <td><span className="font-mono badge">{a.code}</span></td>
                      <td className="text-text3">{formatDateTime(a.approvedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'offers' && (
        <div className="card">
          {selectedOffer ? (
            <div className="max-w-md">
              <div className="font-semibold text-text mb-4">{selectedOffer.product?.name} — {selectedOffer.name}</div>
              <form onSubmit={handleOffer(d => saveOfferConfig.mutate(d))} className="space-y-4">
                <div>
                  <label className="label">Comissão (%)</label>
                  <input type="number" step="0.5" min="1" max="50" className="input" placeholder="Ex: 10" {...regOffer('commissionPct', { required: true })} />
                </div>
                <div>
                  <label className="label">Cookie (dias)</label>
                  <input type="number" min="1" max="90" className="input" placeholder="30" {...regOffer('cookieDays')} />
                </div>
                <div>
                  <label className="label">Descrição <span className="text-text3">(opcional)</span></label>
                  <textarea className="input" rows={2} {...regOffer('description')} />
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="btn-primary" disabled={saveOfferConfig.isPending}>Salvar</button>
                  <button type="button" className="btn-secondary" onClick={() => setSelectedOffer(null)}>Cancelar</button>
                </div>
              </form>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead><tr><th>Produto / Oferta</th><th>Comissão</th><th>Afiliados</th><th>Status</th><th>Link de convite</th><th>Ação</th></tr></thead>
                <tbody>
                  {(offers || []).map((o: any) => {
                    const inviteUrl = `${window.location.origin}/afiliar/${o.slug}`;
                    return (
                    <tr key={o.id}>
                      <td><div className="font-medium text-text">{o.product?.name}</div><div className="text-xs text-text3">{o.name}</div></td>
                      <td>{o.affiliateConfig ? <span className="badge-blue">{o.affiliateConfig.commissionBps / 100}%</span> : <span className="text-text3 text-xs">—</span>}</td>
                      <td>{o._count?.affiliateEnrollments || 0}</td>
                      <td>{o.affiliateConfig?.enabled ? <span className="badge-green">Ativo</span> : <span className="badge-amber">Inativo</span>}</td>
                      <td>
                        {o.affiliateConfig?.enabled ? (
                          <button
                            className="btn-secondary btn-sm"
                            title={inviteUrl}
                            onClick={() => {
                              navigator.clipboard.writeText(inviteUrl);
                              toast.success('Link de convite copiado!');
                            }}
                          >
                            <Link2 size={12} /> Copiar <Copy size={10} />
                          </button>
                        ) : (
                          <span className="text-text3 text-xs">Habilite a comissão</span>
                        )}
                      </td>
                      <td>
                        <button className="btn-secondary btn-sm" onClick={() => {
                          setSelectedOffer(o);
                          setValue('commissionPct', o.affiliateConfig?.commissionBps / 100 || 10);
                          setValue('cookieDays', o.affiliateConfig?.cookieDays || 30);
                          setValue('description', o.affiliateConfig?.description || '');
                        }}>
                          <Settings size={12} /> Configurar
                        </button>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}