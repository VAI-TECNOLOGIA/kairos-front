import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { PageHeader, Loading, EmptyState, Modal } from '@/components/ui';
import api from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import { Sparkles, Plus, Pencil, Trash2 } from 'lucide-react';

interface SpecialMessage {
  id         : string;
  title      : string;
  body       : string;
  icon       : string | null;
  ctaUrl     : string | null;
  ctaText    : string | null;
  targetRoles: string[];
  isActive   : boolean;
  createdAt  : string;
  updatedAt  : string;
}

interface FormState {
  title      : string;
  body       : string;
  icon       : string;
  ctaUrl     : string;
  ctaText    : string;
  targetProducer : boolean;
  targetAffiliate: boolean;
  isActive   : boolean;
}

const emptyForm: FormState = {
  title          : '',
  body           : '',
  icon           : '🚀',
  ctaUrl         : '',
  ctaText        : '',
  targetProducer : true,
  targetAffiliate: true,
  isActive       : false,
};

export default function AdminSpecialMessages() {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  const { data, isLoading } = useQuery<{ data: SpecialMessage[] }>({
    queryKey: ['admin-special-messages'],
    queryFn : () => api.get('/special-messages/admin').then(r => r.data),
  });

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        title      : form.title.trim(),
        body       : form.body.trim(),
        icon       : form.icon.trim() || null,
        ctaUrl     : form.ctaUrl.trim() || null,
        ctaText    : form.ctaText.trim() || null,
        targetRoles: [
          ...(form.targetProducer  ? ['PRODUCER']  : []),
          ...(form.targetAffiliate ? ['AFFILIATE'] : []),
        ],
        isActive   : form.isActive,
      };
      return editingId
        ? api.patch(`/special-messages/admin/${editingId}`, payload)
        : api.post('/special-messages/admin', payload);
    },
    onSuccess: () => {
      toast.success(editingId ? 'Mensagem atualizada' : 'Mensagem criada');
      qc.invalidateQueries({ queryKey: ['admin-special-messages'] });
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erro ao salvar'),
  });

  const toggle = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/special-messages/admin/${id}`, { isActive }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-special-messages'] });
      toast.success('Status atualizado');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erro'),
  });

  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/special-messages/admin/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-special-messages'] });
      toast.success('Mensagem excluída');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erro ao excluir'),
  });

  const startEdit = (m: SpecialMessage) => {
    setEditingId(m.id);
    setForm({
      title          : m.title,
      body           : m.body,
      icon           : m.icon || '',
      ctaUrl         : m.ctaUrl || '',
      ctaText        : m.ctaText || '',
      targetProducer : m.targetRoles.includes('PRODUCER'),
      targetAffiliate: m.targetRoles.includes('AFFILIATE'),
      isActive       : m.isActive,
    });
    setShowForm(true);
  };

  return (
    <div>
      <PageHeader
        title="Mensagens especiais"
        sub="Modal que aparece ao logar (produtor / afiliado). Só 1 ativa por vez."
        actions={
          <button
            className="btn-primary btn-sm"
            onClick={() => { setEditingId(null); setForm(emptyForm); setShowForm(true); }}
          >
            <Plus size={14} /> Nova mensagem
          </button>
        }
      />

      <div className="card">
        {isLoading ? (
          <Loading />
        ) : (data?.data || []).length === 0 ? (
          <EmptyState
            icon={<Sparkles size={32} />}
            title="Sem mensagens"
            sub="Crie uma mensagem pra aparecer no login dos produtores e afiliados"
          />
        ) : (
          <div className="space-y-2">
            {(data?.data || []).map(m => (
              <div key={m.id} className="flex items-start justify-between gap-3 py-2 border-b border-border last:border-0">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  {m.icon && <span className="text-2xl leading-none">{m.icon}</span>}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-text">{m.title}</span>
                      <span className={m.isActive ? 'badge-green' : 'badge-amber'}>
                        {m.isActive ? 'Ativa' : 'Desativada'}
                      </span>
                      <span className="text-[10px] text-text3">→ {m.targetRoles.join(', ')}</span>
                    </div>
                    <p className="text-xs text-text3 mt-1 line-clamp-2">{m.body}</p>
                    {m.ctaUrl && (
                      <p className="text-[10px] text-text3 mt-1 truncate">
                        CTA: {m.ctaText || 'Saiba mais'} → {m.ctaUrl}
                      </p>
                    )}
                    <p className="text-[10px] text-text3 mt-1">criada em {formatDateTime(m.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    className={`btn-sm ${m.isActive ? 'btn-ghost' : 'btn-primary'}`}
                    onClick={() => toggle.mutate({ id: m.id, isActive: !m.isActive })}
                    disabled={toggle.isPending}
                    title={m.isActive ? 'Desativar' : 'Ativar (desliga outras)'}
                  >
                    {m.isActive ? 'Desativar' : 'Ativar'}
                  </button>
                  <button
                    onClick={() => startEdit(m)}
                    className="text-text3 hover:text-text p-2"
                    title="Editar"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Excluir "${m.title}"? Não dá pra desfazer.`)) del.mutate(m.id);
                    }}
                    className="text-text3 hover:text-red p-2"
                    title="Excluir"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        open={showForm}
        onClose={() => { setShowForm(false); setEditingId(null); setForm(emptyForm); }}
        title={editingId ? 'Editar mensagem' : 'Nova mensagem'}
        footer={
          <div className="flex gap-2">
            <button className="btn-ghost" onClick={() => { setShowForm(false); setEditingId(null); setForm(emptyForm); }}>Cancelar</button>
            <button
              className="btn-primary"
              disabled={save.isPending || !form.title.trim() || !form.body.trim() || (!form.targetProducer && !form.targetAffiliate)}
              onClick={() => save.mutate()}
            >
              {save.isPending ? 'Salvando…' : (editingId ? 'Salvar' : 'Criar')}
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="form-group">
            <label className="label">Título *</label>
            <input
              className="input"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="Kairos Way agora no seu celular!"
              maxLength={120}
            />
          </div>
          <div className="form-group">
            <label className="label">Texto *</label>
            <textarea
              className="input"
              rows={4}
              value={form.body}
              onChange={e => setForm({ ...form, body: e.target.value })}
              placeholder="O app oficial da Kairos Way está disponível..."
              maxLength={2000}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="form-group">
              <label className="label">Ícone (emoji)</label>
              <input
                className="input"
                value={form.icon}
                onChange={e => setForm({ ...form, icon: e.target.value })}
                placeholder="🚀"
                maxLength={6}
              />
            </div>
            <div className="form-group">
              <label className="label">Texto do botão</label>
              <input
                className="input"
                value={form.ctaText}
                onChange={e => setForm({ ...form, ctaText: e.target.value })}
                placeholder="Baixar agora"
                maxLength={40}
              />
            </div>
          </div>
          <div className="form-group">
            <label className="label">URL do botão (opcional)</label>
            <input
              type="url"
              className="input"
              value={form.ctaUrl}
              onChange={e => setForm({ ...form, ctaUrl: e.target.value })}
              placeholder="https://apps.apple.com/..."
            />
          </div>
          <div className="form-group">
            <label className="label">Aparece para</label>
            <div className="flex items-center gap-4 mt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.targetProducer}
                  onChange={e => setForm({ ...form, targetProducer: e.target.checked })}
                />
                <span className="text-sm">Produtores</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.targetAffiliate}
                  onChange={e => setForm({ ...form, targetAffiliate: e.target.checked })}
                />
                <span className="text-sm">Afiliados</span>
              </label>
            </div>
          </div>
          <div className="form-group">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={e => setForm({ ...form, isActive: e.target.checked })}
              />
              <span className="text-sm">
                Ativar agora <span className="text-[10px] text-text3">(desliga outras ativas)</span>
              </span>
            </label>
          </div>
        </div>
      </Modal>
    </div>
  );
}
