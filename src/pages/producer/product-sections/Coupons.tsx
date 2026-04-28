import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Modal } from '@/components/ui';
import { Plus, Tag, Trash2, ToggleLeft, ToggleRight, Copy } from 'lucide-react';

interface Affiliate {
  id    : string;
  code  : string;
  user  : { name: string; email: string };
}

interface Coupon {
  id          : string;
  code        : string;
  discountBps : number;
  isActive    : boolean;
  usageCount  : number;
  affiliateId : string;
  createdAt   : string;
  affiliate   : { code: string; user: { name: string; email: string } };
}

export default function ProductCouponsSection() {
  const { product } = useOutletContext<{ product: any }>();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ affiliateId: '', code: '', discountPct: 10 });

  const { data: coupons, isLoading } = useQuery<Coupon[]>({
    queryKey: ['product-coupons', product?.id],
    queryFn : () => api.get(`/products/${product.id}/coupons`).then(r => r.data),
    enabled : !!product?.id,
  });

  // Pega afiliados inscritos ATIVOS em qualquer oferta deste produto (candidatos)
  const offers: any[] = product?.offers || [];
  const { data: enrolled } = useQuery<Affiliate[]>({
    queryKey: ['product-active-affiliates', product?.id],
    queryFn : async () => {
      const all = await Promise.all(offers.map(o =>
        api.get(`/affiliates/offers/${o.id}/enrollments`).then(r => r.data).catch(() => [])
      ));
      const seen = new Map<string, Affiliate>();
      for (const e of all.flat() as any[]) {
        if (e.status !== 'ACTIVE') continue;
        const a = e.affiliate;
        if (!a || seen.has(a.id)) continue;
        seen.set(a.id, { id: a.id, code: a.code, user: a.user });
      }
      return Array.from(seen.values());
    },
    enabled: offers.length > 0,
  });

  const create = useMutation({
    mutationFn: () => api.post(`/products/${product.id}/coupons`, {
      affiliateId: form.affiliateId,
      code       : form.code.trim().toUpperCase(),
      discountBps: Math.round(form.discountPct * 100),
    }),
    onSuccess: () => {
      toast.success('Cupom criado!');
      qc.invalidateQueries({ queryKey: ['product-coupons', product.id] });
      qc.invalidateQueries({ queryKey: ['product-active-affiliates', product.id] });
      setOpen(false);
      setForm({ affiliateId: '', code: '', discountPct: 10 });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erro ao criar cupom'),
  });

  const toggle = useMutation({
    mutationFn: (c: Coupon) => api.patch(`/coupons/${c.id}`, { isActive: !c.isActive }),
    onSuccess : () => qc.invalidateQueries({ queryKey: ['product-coupons', product.id] }),
    onError   : (e: any) => toast.error(e?.response?.data?.message || 'Erro'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/coupons/${id}`),
    onSuccess : () => {
      toast.success('Cupom removido');
      qc.invalidateQueries({ queryKey: ['product-coupons', product.id] });
    },
    onError: () => toast.error('Erro ao remover'),
  });

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`Cupom ${code} copiado`);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-base font-semibold text-text">Cupons de afiliados</h2>
          <p className="text-xs text-text3 mt-0.5">
            Cupons exclusivos que dão desconto ao cliente e atribuem a venda automaticamente ao afiliado dono — sai da parte do produtor.
          </p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="btn-primary btn-sm"
        >
          <Plus size={14} /> Novo cupom
        </button>
      </div>

      {isLoading ? (
        <div className="card p-6 text-text3 text-sm">Carregando...</div>
      ) : (coupons || []).length === 0 ? (
        <div className="card p-8 text-center text-text3">
          <Tag size={32} className="mx-auto mb-2 opacity-40" />
          <p>Nenhum cupom cadastrado.</p>
          {(!enrolled || enrolled.length === 0) && (
            <p className="text-xs mt-1">Antes de criar cupom, configure a afiliação do produto e tenha afiliados inscritos ativos.</p>
          )}
        </div>
      ) : (
        <div className="table-wrapper card p-0">
          <table className="table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Afiliado</th>
                <th>Desconto</th>
                <th>Usos</th>
                <th>Status</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {(coupons || []).map(c => (
                <tr key={c.id}>
                  <td>
                    <button onClick={() => copyCode(c.code)} className="font-mono badge inline-flex items-center gap-1 hover:bg-bg3" title="Copiar">
                      {c.code} <Copy size={10} />
                    </button>
                  </td>
                  <td>
                    <div className="font-medium text-text">{c.affiliate?.user?.name}</div>
                    <div className="text-xs text-text3">{c.affiliate?.user?.email} · <code className="text-accent">{c.affiliate?.code}</code></div>
                  </td>
                  <td><span className="badge-blue">{(c.discountBps / 100).toFixed(1)}%</span></td>
                  <td className="font-semibold text-text">{c.usageCount}</td>
                  <td>
                    {c.isActive
                      ? <span className="badge-green">Ativo</span>
                      : <span className="badge-gray">Pausado</span>}
                  </td>
                  <td>
                    <div className="flex gap-1.5">
                      <button onClick={() => toggle.mutate(c)} className="btn-ghost btn-sm" title={c.isActive ? 'Pausar' : 'Reativar'}>
                        {c.isActive ? <ToggleRight size={14} className="text-green" /> : <ToggleLeft size={14} className="text-text3" />}
                      </button>
                      <button onClick={() => confirm(`Remover cupom ${c.code}?`) && remove.mutate(c.id)} className="btn-ghost btn-sm text-red" title="Remover">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Novo cupom de afiliado"
        footer={<><button className="btn-ghost" onClick={() => setOpen(false)}>Cancelar</button><button className="btn-primary" disabled={!form.affiliateId || !form.code} onClick={() => create.mutate()}>{create.isPending ? 'Criando...' : 'Criar cupom'}</button></>}>
        <div className="space-y-4">
          {(!enrolled || enrolled.length === 0) && (
            <div className="bg-amber/10 border border-amber/30 rounded-md p-3 text-xs text-amber">
              <strong>Sem afiliados ativos.</strong> Pra criar cupom, este produto precisa ter pelo menos um afiliado inscrito ativo. Vá em <strong>Afiliação</strong>, configure a comissão e compartilhe o link de convite.
            </div>
          )}
          <div className="form-group">
            <label className="label">Afiliado *</label>
            <select className="input" value={form.affiliateId} onChange={e => setForm({ ...form, affiliateId: e.target.value })} disabled={!enrolled || enrolled.length === 0}>
              <option value="">Selecione um afiliado inscrito ativo...</option>
              {(enrolled || []).map(a => (
                <option key={a.id} value={a.id}>{a.user.name} ({a.code}) — {a.user.email}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="label">Código do cupom *</label>
            <input
              className="input font-mono"
              placeholder="MARCOS10"
              value={form.code}
              onChange={e => setForm({ ...form, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })}
              maxLength={20}
            />
            <p className="text-[11px] text-text3 mt-1">3-20 caracteres, letras maiúsculas e números.</p>
          </div>
          <div className="form-group">
            <label className="label">Desconto (%) *</label>
            <input
              type="number"
              className="input"
              step="0.5" min="1" max="50"
              value={form.discountPct}
              onChange={e => setForm({ ...form, discountPct: Number(e.target.value) })}
            />
            <p className="text-[11px] text-text3 mt-1">Valor descontado do preço final do cliente. Máx 50%.</p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
