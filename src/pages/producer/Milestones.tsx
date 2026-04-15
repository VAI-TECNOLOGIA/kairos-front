import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { formatBRL } from '@/lib/utils';
import toast from 'react-hot-toast';
import {
  Trophy, Plus, Pencil, Trash2, X, Check,
  Target, Palette, TrendingUp, Package,
} from 'lucide-react';

// ── Tipos ──────────────────────────────────────────────────────
interface Milestone {
  id         : string;
  name       : string;
  color      : string;
  targetType : 'VALUE' | 'UNITS';
  targetValue: number;
  reward     : string;
  position   : number;
  current    : number;
  percentage : number;
  reached    : boolean;
}

interface MilestoneForm {
  name       : string;
  color      : string;       // vazio = automático
  targetType : 'VALUE' | 'UNITS';
  targetValue: string;       // string para o input
  reward     : string;
}

const EMPTY_FORM: MilestoneForm = {
  name       : '',
  color      : '',
  targetType : 'VALUE',
  targetValue: '',
  reward     : '',
};

// Paleta de sugestão rápida
const COLOR_SWATCHES = [
  '#6366f1', '#f59e0b', '#10b981', '#ef4444',
  '#8b5cf6', '#06b6d4', '#f97316', '#ec4899',
];

// ── Helpers ────────────────────────────────────────────────────
function formatTarget(m: Milestone) {
  return m.targetType === 'VALUE'
    ? formatBRL(m.targetValue)
    : `${m.targetValue.toLocaleString('pt-BR')} unid.`;
}

function formatCurrent(m: Milestone) {
  return m.targetType === 'VALUE'
    ? formatBRL(m.current)
    : `${m.current.toLocaleString('pt-BR')} unid.`;
}

// ── Componente principal ───────────────────────────────────────
export default function Milestones() {
  const queryClient = useQueryClient();

  const [modalOpen, setModalOpen]   = useState(false);
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [form, setForm]             = useState<MilestoneForm>(EMPTY_FORM);
  const [deleteId, setDeleteId]     = useState<string | null>(null);

  // ── Queries ────────────────────────────────────────────────
  const { data, isLoading } = useQuery<{ data: Milestone[] }>({
    queryKey: ['milestones'],
    queryFn : () => api.get('/producers/milestones').then(r => r.data),
  });

  const milestones = data?.data ?? [];

  // ── Mutations ──────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: (payload: object) =>
      editingId
        ? api.put(`/producers/milestones/${editingId}`, payload)
        : api.post('/producers/milestones', payload),
    onSuccess: () => {
      toast.success(editingId ? 'Marco atualizado!' : 'Marco criado!');
      queryClient.invalidateQueries({ queryKey: ['milestones'] });
      closeModal();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Erro ao salvar marco');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/producers/milestones/${id}`),
    onSuccess: () => {
      toast.success('Marco removido');
      queryClient.invalidateQueries({ queryKey: ['milestones'] });
      setDeleteId(null);
    },
    onError: () => toast.error('Erro ao remover marco'),
  });

  // ── Helpers de UI ──────────────────────────────────────────
  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(m: Milestone) {
    setEditingId(m.id);
    setForm({
      name       : m.name,
      color      : m.color,
      targetType : m.targetType,
      targetValue: m.targetType === 'VALUE'
        ? (m.targetValue / 100).toFixed(2)
        : String(m.targetValue),
      reward: m.reward,
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim())        { toast.error('Nome obrigatório'); return; }
    if (!form.targetValue.trim()) { toast.error('Meta obrigatória'); return; }
    if (!form.reward.trim())      { toast.error('Premiação obrigatória'); return; }

    const rawValue = parseFloat(form.targetValue.replace(',', '.'));
    if (isNaN(rawValue) || rawValue <= 0) { toast.error('Meta inválida'); return; }

    const targetValue = form.targetType === 'VALUE'
      ? Math.round(rawValue * 100)   // reais → centavos
      : Math.round(rawValue);        // unidades inteiras

    saveMutation.mutate({
      name       : form.name.trim(),
      color      : form.color || undefined,
      targetType : form.targetType,
      targetValue,
      reward     : form.reward.trim(),
    });
  }

  // ── Render ─────────────────────────────────────────────────
  return (
    <div>
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-text flex items-center gap-2">
            <Trophy size={20} className="text-amber" />
            Marcos de Conquista
          </h1>
          <p className="text-sm text-text3 mt-0.5">
            Defina metas e premiações para acompanhar o crescimento da sua operação.
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          Novo Marco
        </button>
      </div>

      {/* Lista de marcos */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card h-28 animate-pulse bg-bg3" />
          ))}
        </div>
      ) : milestones.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 bg-bg3 rounded-2xl flex items-center justify-center mb-4">
            <Trophy size={26} className="text-text3" />
          </div>
          <p className="text-text font-medium mb-1">Nenhum marco definido</p>
          <p className="text-text3 text-sm mb-6">
            Crie seus primeiros marcos de conquista para visualizar o progresso aqui.
          </p>
          <button onClick={openCreate} className="btn-primary flex items-center gap-2">
            <Plus size={15} />
            Criar primeiro marco
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {milestones.map(m => (
            <MilestoneCard
              key={m.id}
              milestone={m}
              onEdit={() => openEdit(m)}
              onDelete={() => setDeleteId(m.id)}
            />
          ))}
        </div>
      )}

      {/* Modal criar / editar */}
      {modalOpen && (
        <MilestoneModal
          form={form}
          setForm={setForm}
          onSubmit={handleSubmit}
          onClose={closeModal}
          isEditing={!!editingId}
          isSaving={saveMutation.isPending}
        />
      )}

      {/* Confirm delete */}
      {deleteId && (
        <ConfirmDelete
          onConfirm={() => deleteMutation.mutate(deleteId)}
          onCancel={() => setDeleteId(null)}
          isDeleting={deleteMutation.isPending}
        />
      )}
    </div>
  );
}

// ── MilestoneCard ──────────────────────────────────────────────
function MilestoneCard({
  milestone: m,
  onEdit,
  onDelete,
}: {
  milestone: Milestone;
  onEdit   : () => void;
  onDelete : () => void;
}) {
  return (
    <div className="card p-0 overflow-hidden">
      {/* Barra de cor no topo */}
      <div className="h-1 w-full" style={{ background: m.color }} />

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Ícone com cor do marco */}
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${m.color}20` }}
            >
              <Trophy size={18} style={{ color: m.color }} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-text text-sm truncate">{m.name}</p>
                {m.reached && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-green bg-green/10 px-2 py-0.5 rounded-full flex-shrink-0">
                    <Check size={10} />
                    Atingido!
                  </span>
                )}
              </div>
              <p className="text-xs text-text3 mt-0.5">
                Meta: {formatTarget(m)}
                <span className="mx-1.5">·</span>
                {m.targetType === 'VALUE' ? 'Receita' : 'Unidades vendidas'}
              </p>
            </div>
          </div>

          {/* Ações */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={onEdit} className="btn-ghost btn-sm text-text3 hover:text-text">
              <Pencil size={14} />
            </button>
            <button onClick={onDelete} className="btn-ghost btn-sm text-text3 hover:text-red">
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Barra de progresso */}
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-text3">
              {formatCurrent(m)} de {formatTarget(m)}
            </span>
            <span className="text-[11px] font-bold" style={{ color: m.color }}>
              {m.percentage}%
            </span>
          </div>
          <div className="h-2 bg-bg3 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width     : `${m.percentage}%`,
                background: m.color,
              }}
            />
          </div>
        </div>

        {/* Premiação */}
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-[11px] text-text3 font-medium mb-0.5">Premiação</p>
          <p className="text-xs text-text2 leading-relaxed">{m.reward}</p>
        </div>
      </div>
    </div>
  );
}

// ── Modal ──────────────────────────────────────────────────────
function MilestoneModal({
  form,
  setForm,
  onSubmit,
  onClose,
  isEditing,
  isSaving,
}: {
  form      : MilestoneForm;
  setForm   : React.Dispatch<React.SetStateAction<MilestoneForm>>;
  onSubmit  : (e: React.FormEvent) => void;
  onClose   : () => void;
  isEditing : boolean;
  isSaving  : boolean;
}) {
  function field(key: keyof MilestoneForm, value: string) {
    setForm(f => ({ ...f, [key]: value }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-bg2 rounded-2xl shadow-xl w-full max-w-md border border-border flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <Target size={16} className="text-accent" />
            <h2 className="text-sm font-semibold text-text">
              {isEditing ? 'Editar Marco' : 'Novo Marco de Conquista'}
            </h2>
          </div>
          <button onClick={onClose} className="text-text3 hover:text-text">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={onSubmit} className="overflow-y-auto flex-1 p-5 space-y-4">

          {/* Nome */}
          <div>
            <label className="block text-xs font-medium text-text2 mb-1.5">
              Nome do nível <span className="text-red">*</span>
            </label>
            <input
              value={form.name}
              onChange={e => field('name', e.target.value)}
              className="input w-full"
              placeholder="Ex: Bronze, Master, Diamante..."
              maxLength={80}
            />
          </div>

          {/* Tipo de meta */}
          <div>
            <label className="block text-xs font-medium text-text2 mb-1.5">
              Tipo de meta <span className="text-red">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['VALUE', 'UNITS'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => field('targetType', t)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm transition-colors ${
                    form.targetType === t
                      ? 'border-accent bg-accent/10 text-accent font-medium'
                      : 'border-border text-text3 hover:border-accent/40'
                  }`}
                >
                  {t === 'VALUE' ? <TrendingUp size={14} /> : <Package size={14} />}
                  {t === 'VALUE' ? 'Valor (R$)' : 'Unidades'}
                </button>
              ))}
            </div>
          </div>

          {/* Valor da meta */}
          <div>
            <label className="block text-xs font-medium text-text2 mb-1.5">
              {form.targetType === 'VALUE' ? 'Valor da meta (R$)' : 'Quantidade de vendas'}
              <span className="text-red"> *</span>
            </label>
            <input
              value={form.targetValue}
              onChange={e => field('targetValue', e.target.value)}
              className="input w-full"
              placeholder={form.targetType === 'VALUE' ? 'Ex: 20000.00' : 'Ex: 100'}
              inputMode="decimal"
            />
            {form.targetType === 'VALUE' && (
              <p className="text-[11px] text-text3 mt-1">
                Digite em reais. Ex: 20000 = R$ 20.000,00
              </p>
            )}
          </div>

          {/* Cor */}
          <div>
            <label className="block text-xs font-medium text-text2 mb-1.5 flex items-center gap-1.5">
              <Palette size={12} />
              Cor do marco
              <span className="text-text3 font-normal">(opcional — automático se vazio)</span>
            </label>
            {/* Swatches rápidos */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {COLOR_SWATCHES.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => field('color', c)}
                  className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 flex-shrink-0"
                  style={{
                    background  : c,
                    borderColor : form.color === c ? '#fff' : 'transparent',
                    boxShadow   : form.color === c ? `0 0 0 2px ${c}` : 'none',
                  }}
                  title={c}
                />
              ))}
              {/* Botão limpar cor */}
              {form.color && (
                <button
                  type="button"
                  onClick={() => field('color', '')}
                  className="text-[11px] text-text3 hover:text-text underline ml-1"
                >
                  Limpar (automático)
                </button>
              )}
            </div>
            {/* Input hex manual */}
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-lg border border-border flex-shrink-0"
                style={{ background: form.color || '#888888' }}
              />
              <input
                value={form.color}
                onChange={e => field('color', e.target.value)}
                className="input flex-1 font-mono text-sm"
                placeholder="#6366f1"
                maxLength={7}
              />
            </div>
          </div>

          {/* Premiação */}
          <div>
            <label className="block text-xs font-medium text-text2 mb-1.5">
              Premiação / Recompensa <span className="text-red">*</span>
            </label>
            <textarea
              value={form.reward}
              onChange={e => field('reward', e.target.value)}
              className="input w-full resize-none text-sm"
              rows={4}
              placeholder="Descreva o prêmio, bônus, benefício ou reconhecimento para este nível..."
              maxLength={2000}
            />
            <p className="text-[11px] text-text3 mt-1 text-right">
              {form.reward.length}/2000
            </p>
          </div>

          {/* Rodapé */}
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={isSaving}
              className="btn-primary flex-1 disabled:opacity-50"
            >
              {isSaving ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Criar marco'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Confirm Delete ─────────────────────────────────────────────
function ConfirmDelete({
  onConfirm,
  onCancel,
  isDeleting,
}: {
  onConfirm : () => void;
  onCancel  : () => void;
  isDeleting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-bg2 rounded-2xl shadow-xl w-full max-w-sm border border-border p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-red/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <Trash2 size={18} className="text-red" />
          </div>
          <div>
            <p className="text-sm font-semibold text-text">Remover marco</p>
            <p className="text-xs text-text3">Esta ação não pode ser desfeita.</p>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="btn-primary bg-red hover:bg-red/90 flex-1 disabled:opacity-50"
          >
            {isDeleting ? 'Removendo...' : 'Remover'}
          </button>
          <button onClick={onCancel} className="btn-secondary flex-1">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
