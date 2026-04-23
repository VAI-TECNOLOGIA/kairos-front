import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { formatBRL } from '@/lib/utils';
import toast from 'react-hot-toast';
import {
  Trophy, Plus, Pencil, Trash2, X, Check,
  Target, Palette, TrendingUp, Package,
  FileText, ChevronDown, ChevronUp,
  Plane, Hotel, UtensilsCrossed, Car, ShieldCheck,
  Laptop, Smartphone, Watch, Camera, Headphones,
  BookOpen, Users, GraduationCap,
  DollarSign, CreditCard,
  UserCheck, FileCheck, Clock, RefreshCw, Wallet,
  AlertTriangle, ScrollText,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// ── Tipos ──────────────────────────────────────────────────────
interface Milestone {
  id                : string;
  name              : string;
  color             : string;
  targetType        : 'VALUE' | 'UNITS';
  targetValue       : number;
  reward            : string;
  termsAndConditions: string | null; // NOVO
  position          : number;
  current           : number;
  percentage        : number;
  reached           : boolean;
}

interface MilestoneForm {
  name              : string;
  color             : string;       // vazio = automático
  targetType        : 'VALUE' | 'UNITS';
  targetValue       : string;       // string para o input
  reward            : string;
  termsAndConditions: string;
  acceptanceChecked : boolean;      // checkbox de aceite
  acceptanceText    : string;       // frase digitada
}

// MANTIDO: EMPTY_FORM preservado + campo novo adicionado
const EMPTY_FORM: MilestoneForm = {
  name              : '',
  color             : '',
  targetType        : 'VALUE',
  targetValue       : '',
  reward            : '',
  termsAndConditions: '',
  acceptanceChecked : false,
  acceptanceText    : '',
};

// Normaliza (mesma lógica do backend) para comparar a frase digitada com a esperada
function normalizeAcceptance(s: string): string {
  return (s || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function buildExpectedPhrase(name: string, cpf: string): string {
  const digits = (cpf || '').replace(/\D/g, '');
  return `EU, ${name || '[seu nome]'}, PORTADOR DO CPF ${digits || '[seu CPF]'}, ACEITO OS TERMOS DA KAIROS GATEWAY DE PAGAMENTOS PARA RANKING & CONQUISTAS.`;
}

// MANTIDO: paleta de sugestão rápida preservada integralmente
const COLOR_SWATCHES = [
  '#6366f1', '#f59e0b', '#10b981', '#ef4444',
  '#8b5cf6', '#06b6d4', '#f97316', '#ec4899',
];

// NOVO: templates de cláusulas que o produtor pode inserir no campo de termos
interface TermTemplate {
  icon   : LucideIcon;
  label  : string;
  tooltip: string;
  text   : string;
}

const TERM_TEMPLATES: { category: string; items: TermTemplate[] }[] = [
  {
    category: 'Viagem',
    items: [
      {
        icon   : Plane,
        label  : 'Passagens aéreas',
        tooltip: 'Cobre apenas as passagens aéreas',
        text   : 'Passagens aéreas: O produtor arcará exclusivamente com as passagens aéreas (ida e volta) na classe econômica. Todos os demais custos relacionados à viagem são de responsabilidade individual do participante.',
      },
      {
        icon   : Hotel,
        label  : 'Hospedagem',
        tooltip: 'Hospedagem inclusa no prêmio',
        text   : 'Hospedagem: A hospedagem em estabelecimento indicado pela organização estará inclusa no prêmio pelo período oficial do evento. Despesas adicionais no hotel (minibar, lavanderia, serviço de quarto, frigobar, etc.) são de responsabilidade individual.',
      },
      {
        icon   : UtensilsCrossed,
        label  : 'Alimentação',
        tooltip: 'Custos de alimentação não inclusos',
        text   : 'Alimentação: Custos com alimentação fora do roteiro oficial da premiação — incluindo refeições, bebidas e gorjetas — são de responsabilidade individual do participante.',
      },
      {
        icon   : Car,
        label  : 'Translados',
        tooltip: 'Translados inclusos ou excluídos',
        text   : 'Translados: Os translados aeroporto/hotel/aeroporto no destino da premiação estão inclusos. Deslocamentos extras, passeios e atrações turísticas são de responsabilidade individual do participante.',
      },
      {
        icon   : ShieldCheck,
        label  : 'Seguro viagem',
        tooltip: 'Obrigatoriedade de seguro viagem',
        text   : 'Seguro viagem: A contratação de seguro viagem é de responsabilidade exclusiva do participante e fortemente recomendada. O produtor não se responsabiliza por sinistros, cancelamentos, extravios ou quaisquer eventos cobertos por seguro.',
      },
    ],
  },
  {
    category: 'Eletrônicos',
    items: [
      {
        icon   : Laptop,
        label  : 'Notebook / Computador',
        tooltip: 'Termos para premiação de notebook',
        text   : 'Notebook/Computador: O equipamento será entregue na configuração e modelo definidos pela organização, sem possibilidade de troca por modelo equivalente em dinheiro. Garantia de fábrica do fabricante é de responsabilidade do participante junto ao fabricante. Danos por mau uso após entrega não são cobertos.',
      },
      {
        icon   : Smartphone,
        label  : 'Smartphone',
        tooltip: 'Termos para premiação de smartphone',
        text   : 'Smartphone: O dispositivo será entregue no modelo e cor definidos pela organização. Não há opção de conversão do prêmio em crédito ou dinheiro. Acessórios não listados explicitamente na premiação não estão inclusos.',
      },
      {
        icon   : Watch,
        label  : 'Smartwatch',
        tooltip: 'Termos para premiação de smartwatch',
        text   : 'Smartwatch: O relógio inteligente será entregue no modelo definido pela organização. Compatibilidade com o dispositivo do participante é de verificação prévia do próprio participante antes da adesão.',
      },
      {
        icon   : Camera,
        label  : 'Camera / Equipamento fotográfico',
        tooltip: 'Termos para premiação de câmera',
        text   : 'Equipamento fotográfico: O kit entregue inclui apenas os itens explicitamente listados na descrição da premiação. Acessórios adicionais (lentes, cartões de memória, bolsas, filtros) não estão inclusos salvo menção expressa.',
      },
      {
        icon   : Headphones,
        label  : 'Fone / Headphone',
        tooltip: 'Termos para premiação de fone de ouvido',
        text   : 'Fone de ouvido/Headphone: O modelo entregue será definido pela organização. Não há conversão do prêmio em dinheiro ou troca por outro modelo. Itens sujeitos à disponibilidade de estoque no momento do resgate.',
      },
    ],
  },
  {
    category: 'Mentoria e Educação',
    items: [
      {
        icon   : BookOpen,
        label  : 'Mentoria individual',
        tooltip: 'Termos para sessões de mentoria',
        text   : 'Mentoria individual: As sessões de mentoria serão realizadas remotamente via videoconferência em datas e horários a combinar entre mentor e participante. O número de sessões está definido na descrição da premiação. Sessões não utilizadas dentro do prazo de validade expiram sem direito a reposição ou compensação.',
      },
      {
        icon   : Users,
        label  : 'Grupo exclusivo',
        tooltip: 'Termos para acesso a grupo ou comunidade',
        text   : 'Acesso a grupo exclusivo: O participante terá acesso ao grupo/comunidade exclusiva pelo período estabelecido na premiação. O acesso é pessoal e intransferível. A organização reserva-se o direito de remover participantes que violem as regras de conduta do grupo.',
      },
      {
        icon   : GraduationCap,
        label  : 'Curso / Treinamento',
        tooltip: 'Termos para premiação de curso',
        text   : 'Curso/Treinamento: O acesso ao curso ou treinamento premiado é pessoal, intransferível e válido pelo período informado na plataforma. Certificados de conclusão estão condicionados à realização das atividades mínimas exigidas pelo programa.',
      },
    ],
  },
  {
    category: 'Premiação em dinheiro',
    items: [
      {
        icon   : DollarSign,
        label  : 'Bonus em dinheiro',
        tooltip: 'Termos para bônus financeiro',
        text   : 'Bônus em dinheiro: O valor será creditado na conta da plataforma do afiliado após verificação do atingimento da meta e conformidade cadastral. O prazo de crédito é de até 30 (trinta) dias corridos após a apuração. O participante deve possuir chave PIX válida cadastrada na plataforma para o recebimento.',
      },
      {
        icon   : CreditCard,
        label  : 'Creditos na plataforma',
        tooltip: 'Termos para créditos internos',
        text   : 'Créditos na plataforma: Os créditos serão disponibilizados diretamente na conta do afiliado e poderão ser utilizados exclusivamente para as finalidades previstas na plataforma. Créditos não são conversíveis em dinheiro e possuem validade de 12 (doze) meses a partir da data de concessão.',
      },
    ],
  },
  {
    category: 'Geral / Juridico',
    items: [
      {
        icon   : UserCheck,
        label  : 'Elegibilidade',
        tooltip: 'Condições para participar',
        text   : 'Elegibilidade: Para se qualificar ao prêmio, o afiliado deve estar com cadastro ativo, sem pendências financeiras, sem infrações às políticas da plataforma e ter gerado o volume mínimo estabelecido dentro do período vigente da campanha. O não cumprimento de qualquer critério implica na perda automática do direito ao prêmio.',
      },
      {
        icon   : FileCheck,
        label  : 'Documentacao',
        tooltip: 'Documentos necessários para resgate',
        text   : 'Documentação: O resgate do prêmio exigirá documento de identidade com foto válido, CPF e confirmação dos dados cadastrais na plataforma. É responsabilidade do participante manter seus dados atualizados. Informações incorretas ou desatualizadas podem inviabilizar a entrega do prêmio sem direito a compensação.',
      },
      {
        icon   : Clock,
        label  : 'Prazo de validade',
        tooltip: 'Define período de validade do prêmio',
        text   : 'Período de validade: A recompensa deverá ser resgatada em até 12 (doze) meses a partir da data de atingimento da meta. Após esse prazo, o direito ao prêmio expira automaticamente sem direito a substituição, prorrogação ou compensação de qualquer natureza.',
      },
      {
        icon   : RefreshCw,
        label  : 'Alteracoes e cancelamento',
        tooltip: 'Direito de alterar ou cancelar o prêmio',
        text   : 'Alterações e cancelamento: O produtor reserva-se o direito de alterar, suspender ou encerrar este programa de premiação mediante comunicado prévio de 15 (quinze) dias aos participantes inscritos, sem que isso gere qualquer indenização ou compensação.',
      },
      {
        icon   : Wallet,
        label  : 'Custos individuais',
        tooltip: 'Custos por conta exclusiva do afiliado',
        text   : 'Custos individuais: Quaisquer despesas não expressamente listadas como inclusas na premiação — incluindo, mas não se limitando a, impostos, taxas de importação, frete, translados extras, passeios, seguro, taxas de visto, gorjetas e gastos pessoais — são de responsabilidade exclusiva do participante.',
      },
    ],
  },
];

// ── Helpers ────────────────────────────────────────────────────
// MANTIDO: funções helper preservadas integralmente
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

  // MANTIDO: todos os estados preservados integralmente
  const [modalOpen, setModalOpen]   = useState(false);
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [form, setForm]             = useState<MilestoneForm>(EMPTY_FORM);
  const [deleteId, setDeleteId]     = useState<string | null>(null);

  // ── Queries ────────────────────────────────────────────────
  const { data, isLoading } = useQuery<{ data: Milestone[] }>({
    queryKey: ['milestones'],
    queryFn : () => api.get('/producers/milestones').then(r => r.data),
  });

  // Perfil do produtor — usado para gerar a frase de aceite com nome + CPF
  const { data: profile } = useQuery<{ name: string; document: string }>({
    queryKey: ['my-profile-short'],
    queryFn : () => api.get('/auth/me').then(r => r.data),
  });

  const milestones = data?.data ?? [];

  // ── Mutations ──────────────────────────────────────────────
  // MANTIDO: mutations preservadas integralmente
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
  // MANTIDO: funções de UI preservadas integralmente
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
      reward            : m.reward,
      termsAndConditions: m.termsAndConditions ?? '',
      acceptanceChecked : true,   // edição não exige novo aceite
      acceptanceText    : '',
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

    // Aceite obrigatório só na criação (edição mantém o aceite original)
    if (!editingId) {
      if (!profile?.document) {
        toast.error('Preencha seu CPF/CNPJ em "Meu Perfil" antes de criar um marco.');
        return;
      }
      if (!form.acceptanceChecked) {
        toast.error('Marque a caixa de aceite dos termos.');
        return;
      }
      const expected = buildExpectedPhrase(profile?.name || '', profile?.document || '');
      if (normalizeAcceptance(form.acceptanceText) !== normalizeAcceptance(expected)) {
        toast.error('A frase de aceite não confere com o modelo exibido.');
        return;
      }
    }

    const targetValue = form.targetType === 'VALUE'
      ? Math.round(rawValue * 100)   // reais → centavos
      : Math.round(rawValue);        // unidades inteiras

    saveMutation.mutate({
      name              : form.name.trim(),
      color             : form.color || undefined,
      targetType        : form.targetType,
      targetValue,
      reward            : form.reward.trim(),
      termsAndConditions: form.termsAndConditions.trim() || null,
      ...(editingId ? {} : {
        acceptanceText: form.acceptanceText.trim(),
        acceptanceCpf : profile?.document,
      }),
    });
  }

  // ── Render ─────────────────────────────────────────────────
  // MANTIDO: estrutura de render preservada integralmente
  return (
    <div>
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-4">
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

      {/* Aviso legal fixo — isenção de responsabilidade da plataforma */}
      <div className="card mb-6 p-4 border-l-4 border-amber bg-amber/5">
        <div className="flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber flex-shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed text-text2">
            <p className="font-semibold text-text mb-1">Aviso importante — Isenção de responsabilidade</p>
            <p>
              A <strong>Kairos Way</strong> é uma plataforma tecnológica de gateway de pagamentos e infraestrutura.
              Os marcos, metas e premiações aqui cadastrados são <strong>de responsabilidade exclusiva do produtor</strong> que os criou.
              A Kairos Way <strong>não oferece, patrocina, garante, financia, entrega ou se responsabiliza</strong> por nenhum dos prêmios,
              recompensas ou benefícios descritos nesta página, nem pelo cumprimento das obrigações assumidas perante os afiliados.
              Eventuais descumprimentos, disputas ou litígios decorrentes dos marcos serão resolvidos diretamente entre o produtor e o(s) afiliado(s) participante(s),
              nos termos da legislação vigente (CDC, Código Civil e demais normas aplicáveis).
            </p>
          </div>
        </div>
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
          producerName={profile?.name || ''}
          producerDoc={profile?.document || ''}
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
// MANTIDO: estrutura do card preservada integralmente
// NOVO: exibe preview dos termos quando presentes (expansível)
function MilestoneCard({
  milestone: m,
  onEdit,
  onDelete,
}: {
  milestone: Milestone;
  onEdit   : () => void;
  onDelete : () => void;
}) {
  const [termsOpen, setTermsOpen] = useState(false); // NOVO

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
                {/* NOVO: badge se tem termos */}
                {m.termsAndConditions && (
                  <span className="flex items-center gap-1 text-[10px] text-text3 bg-bg3 px-2 py-0.5 rounded-full flex-shrink-0">
                    <FileText size={9} />
                    Termos
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

        {/* NOVO: preview dos termos e condições (expansível) */}
        {m.termsAndConditions && (
          <div className="mt-3 pt-3 border-t border-border">
            <button
              onClick={() => setTermsOpen(v => !v)}
              className="flex items-center gap-1.5 text-[11px] text-text3 hover:text-text transition-colors w-full text-left"
            >
              <FileText size={11} />
              <span className="font-medium">Termos e condições</span>
              {termsOpen ? <ChevronUp size={11} className="ml-auto" /> : <ChevronDown size={11} className="ml-auto" />}
            </button>
            {termsOpen && (
              <p className="text-xs text-text2 leading-relaxed mt-2 whitespace-pre-wrap">
                {m.termsAndConditions}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Modal ──────────────────────────────────────────────────────
// MANTIDO: estrutura e props do modal preservadas integralmente
// NOVO: seção de Termos e Condições com templates inseríveis
function MilestoneModal({
  form,
  setForm,
  onSubmit,
  onClose,
  isEditing,
  isSaving,
  producerName,
  producerDoc,
}: {
  form        : MilestoneForm;
  setForm     : React.Dispatch<React.SetStateAction<MilestoneForm>>;
  onSubmit    : (e: React.FormEvent) => void;
  onClose     : () => void;
  isEditing   : boolean;
  isSaving    : boolean;
  producerName: string;
  producerDoc : string;
}) {
  const expectedPhrase = buildExpectedPhrase(producerName, producerDoc);
  const typedMatches =
    !!producerDoc &&
    normalizeAcceptance(form.acceptanceText) === normalizeAcceptance(expectedPhrase);
  const canSubmit = isEditing || (form.acceptanceChecked && typedMatches);

  const [showTemplates, setShowTemplates] = useState(false); // NOVO

  // MANTIDO: função field preservada integralmente
  function field(key: keyof MilestoneForm, value: string) {
    setForm(f => ({ ...f, [key]: value }));
  }

  // NOVO: insere cláusula de template no campo de termos
  function insertTemplate(text: string) {
    setForm(f => ({
      ...f,
      termsAndConditions: f.termsAndConditions
        ? `${f.termsAndConditions}\n\n${text}`
        : text,
    }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-bg2 rounded-2xl shadow-xl w-full max-w-lg border border-border flex flex-col max-h-[90vh]">
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

          {/* MANTIDO: campo Nome preservado integralmente */}
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

          {/* MANTIDO: campo Tipo de meta preservado integralmente */}
          <div>
            <label className="block text-xs font-medium text-text2 mb-1.5">
              Tipo de meta <span className="text-red">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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

          {/* MANTIDO: campo Valor da meta preservado integralmente */}
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

          {/* MANTIDO: campo Cor preservado integralmente */}
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

          {/* MANTIDO: campo Premiação preservado integralmente */}
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

          {/* NOVO: campo Termos e Condições com templates */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-text2 flex items-center gap-1.5">
                <FileText size={12} />
                Termos e Condições
                <span className="text-text3 font-normal">(opcional)</span>
              </label>
              <button
                type="button"
                onClick={() => setShowTemplates(v => !v)}
                className="text-[11px] text-accent hover:underline flex items-center gap-1"
              >
                {showTemplates ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                {showTemplates ? 'Ocultar modelos' : 'Inserir modelo de cláusula'}
              </button>
            </div>

            {/* Painel de templates */}
            {showTemplates && (
              <div className="mb-2 p-3 bg-bg3 rounded-xl border border-border space-y-3">
                <p className="text-[11px] text-text3">
                  Clique em um modelo para inserir no campo de termos. Edite livremente após inserir.
                </p>
                {TERM_TEMPLATES.map(group => (
                  <div key={group.category}>
                    <p className="text-[10px] font-semibold text-text3 uppercase tracking-wide mb-1.5">
                      {group.category}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {group.items.map(tpl => {
                        const Icon = tpl.icon;
                        return (
                          <button
                            key={tpl.label}
                            type="button"
                            title={tpl.tooltip}
                            onClick={() => insertTemplate(tpl.text)}
                            className="flex items-center gap-1.5 text-[11px] bg-bg2 border border-border hover:border-accent/50 hover:text-accent text-text2 px-2.5 py-1 rounded-lg transition-colors"
                          >
                            <Icon size={11} />
                            {tpl.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <textarea
              value={form.termsAndConditions}
              onChange={e => field('termsAndConditions', e.target.value)}
              className="input w-full resize-none text-sm"
              rows={6}
              placeholder={
                'Descreva as condições de participação, o que está incluído e excluído na premiação, prazos e requisitos...\n\nEx: Passagens aéreas: apenas os bilhetes estão inclusos. Hospedagem e alimentação são por conta do participante.'
              }
              maxLength={10000}
            />
            <p className="text-[11px] text-text3 mt-1 text-right">
              {form.termsAndConditions.length}/10000
            </p>
          </div>

          {/* Termo de responsabilidade do produtor (só na criação) */}
          {!isEditing && (
            <div className="border border-amber/30 bg-amber/5 rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-2">
                <ScrollText size={14} className="text-amber flex-shrink-0 mt-0.5" />
                <div className="text-[11px] text-text2 leading-relaxed">
                  <p className="font-semibold text-text mb-1">Termo de responsabilidade</p>
                  <p>
                    Ao criar este marco, declaro estar ciente e aceitar que: <strong>(i)</strong> a Kairos Way
                    atua exclusivamente como plataforma tecnológica de gateway de pagamentos, não oferecendo,
                    patrocinando, garantindo, financiando, entregando nem se responsabilizando por qualquer
                    prêmio, recompensa ou benefício descrito neste marco; <strong>(ii)</strong> sou o único e
                    exclusivo responsável, civil e tributariamente, pelo integral cumprimento das obrigações
                    aqui assumidas perante os afiliados participantes, incluindo custos, fretes, impostos,
                    entrega, qualidade e adequação dos prêmios; <strong>(iii)</strong> responderei diretamente
                    por eventuais reclamações, indenizações, sanções administrativas, ações judiciais ou
                    extrajudiciais decorrentes do descumprimento, parcial ou total, das condições aqui divulgadas,
                    nos termos do Código Civil (arts. 186, 187, 927 e seguintes), do Código de Defesa do Consumidor
                    (Lei 8.078/90, quando aplicável) e demais normas vigentes; <strong>(iv)</strong> isento a Kairos
                    Way de qualquer solidariedade ou subsidiariedade nas relações decorrentes deste marco e me
                    obrigo a mantê-la indene em eventuais disputas.
                  </p>
                </div>
              </div>

              {/* Checkbox de aceite */}
              <label className="flex items-start gap-2 cursor-pointer text-[12px] text-text2">
                <input
                  type="checkbox"
                  checked={form.acceptanceChecked}
                  onChange={e => setForm(f => ({ ...f, acceptanceChecked: e.target.checked }))}
                  className="mt-0.5 accent-accent"
                />
                <span>
                  Li e aceito integralmente os termos de responsabilidade acima descritos.
                </span>
              </label>

              {/* Confirmação digitada (estilo GitHub) */}
              <div>
                <label className="block text-[11px] font-medium text-text2 mb-1">
                  Para confirmar, digite exatamente:
                </label>
                <div className="text-[11px] font-mono bg-bg3 rounded-lg px-3 py-2 text-text2 mb-1.5 select-all break-all">
                  {expectedPhrase}
                </div>
                <input
                  value={form.acceptanceText}
                  onChange={e => field('acceptanceText', e.target.value)}
                  className={`input w-full font-mono text-xs ${
                    form.acceptanceText && !typedMatches ? 'border-red' : typedMatches ? 'border-green' : ''
                  }`}
                  placeholder="Digite a frase acima para confirmar"
                  autoComplete="off"
                />
                {!producerDoc && (
                  <p className="text-[11px] text-red mt-1">
                    Seu CPF/CNPJ ainda não está preenchido em "Meu Perfil" — preencha antes de continuar.
                  </p>
                )}
                {producerDoc && form.acceptanceText && !typedMatches && (
                  <p className="text-[11px] text-red mt-1">
                    A frase digitada não confere.
                  </p>
                )}
                {typedMatches && (
                  <p className="text-[11px] text-green mt-1 flex items-center gap-1">
                    <Check size={11} /> Frase confirmada.
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={isSaving || !canSubmit}
              className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
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
// MANTIDO: componente ConfirmDelete preservado integralmente
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
