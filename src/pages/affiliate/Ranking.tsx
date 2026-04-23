import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { formatBRL } from '@/lib/utils';
import toast from 'react-hot-toast';
import {
  Trophy, Star, TrendingUp, Package, AlertCircle,
  FileText, Check, X, UserPlus, Loader2, Medal,
} from 'lucide-react';

// MANTIDO: interfaces originais preservadas
interface Milestone {
  id                : string;
  name              : string;
  color             : string;
  targetType        : 'VALUE' | 'UNITS';
  targetValue       : number;
  reward            : string;
  termsAndConditions: string | null;
  current           : number;
  percentage        : number;
  reached           : boolean;
  isEnrolled        : boolean;
  acceptedAt        : string | null;
  // Ranking
  myName?           : string;
  position?         : number | null;
  totalParticipants?: number;
}

// Formata ordinal em pt-BR: 1º, 2º, 3º, ...
function ordinal(n: number): string {
  return `${n}º`;
}

// MANTIDO: ProducerGroup preservado
interface ProducerGroup {
  producer  : { id: string; name: string };
  milestones: Milestone[];
  summary   : { totalValueCents: number; totalUnits: number };
}

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
export default function AffiliateRanking() {
  const queryClient = useQueryClient();

  // NOVO: estado do modal de termos
  const [termsModal, setTermsModal] = useState<Milestone | null>(null);

  // MANTIDO: query preservada integralmente
  const { data, isLoading } = useQuery<{ data: ProducerGroup[] }>({
    queryKey: ['affiliate-milestones'],
    queryFn : () => api.get('/affiliates/milestones').then(r => r.data),
  });

  // NOVO: mutation de ingresso no marco
  const joinMutation = useMutation({
    mutationFn: (milestoneId: string) =>
      api.post(`/producers/milestones/${milestoneId}/join`),
    onSuccess: () => {
      toast.success('Você ingressou no marco!');
      queryClient.invalidateQueries({ queryKey: ['affiliate-milestones'] });
      setTermsModal(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Erro ao ingressar no marco');
    },
  });

  const groups = data?.data ?? [];

  return (
    <div>
      {/* MANTIDO: cabeçalho preservado integralmente */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-text flex items-center gap-2">
          <Trophy size={20} className="text-amber" />
          Ranking & Conquistas
        </h1>
        <p className="text-sm text-text3 mt-0.5">
          Metas definidas pelo produtor. Acompanhe sua progressão e desbloqueie recompensas.
        </p>
      </div>

      {/* MANTIDO: loading e empty state preservados integralmente */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card h-28 animate-pulse bg-bg3" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 bg-bg3 rounded-2xl flex items-center justify-center mb-4">
            <AlertCircle size={26} className="text-text3" />
          </div>
          <p className="text-text font-medium mb-1">Nenhum marco definido</p>
          <p className="text-text3 text-sm max-w-xs">
            Os produtores dos programas em que você está inscrito ainda não configuraram marcos de conquista.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map(group => (
            <ProducerSection
              key={group.producer.id}
              group={group}
              showProducerName={groups.length > 1}
              onJoin={setTermsModal}
            />
          ))}
        </div>
      )}

      {/* NOVO: modal de termos e aceite */}
      {termsModal && (
        <TermsModal
          milestone={termsModal}
          onClose={() => setTermsModal(null)}
          onAccept={() => joinMutation.mutate(termsModal.id)}
          isJoining={joinMutation.isPending}
        />
      )}
    </div>
  );
}

// ── Seção por produtor ─────────────────────────────────────────
// MANTIDO: toda a lógica de ProducerSection preservada
// NOVO: passa onJoin para os milestones
function ProducerSection({
  group,
  showProducerName,
  onJoin,
}: {
  group           : ProducerGroup;
  showProducerName: boolean;
  onJoin          : (m: Milestone) => void;
}) {
  const { producer, milestones, summary } = group;

  // MANTIDO: lógica de índice atual e allReached preservada integralmente
  const nextIdx          = milestones.findIndex(m => !m.reached);
  const nextMilestone    = nextIdx !== -1 ? milestones[nextIdx] : null;
  const allReached       = milestones.every(m => m.reached);
  const currentMilestone = nextMilestone ?? milestones[milestones.length - 1];

  return (
    <div>
      {/* MANTIDO: nome do produtor preservado integralmente */}
      {showProducerName && (
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <Trophy size={12} className="text-accent" />
          </div>
          <h2 className="text-sm font-semibold text-text">{producer.name}</h2>
          <div className="flex-1 h-px bg-border" />
        </div>
      )}

      {/* MANTIDO: card de nível atual preservado integralmente */}
      {currentMilestone && (
        <div className="card mb-4" style={{ borderColor: `${currentMilestone.color}30` }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Trophy size={18} style={{ color: currentMilestone.color }} />
              <span className="font-semibold text-text text-sm">
                {allReached ? 'Nível máximo atingido!' : 'Nível atual'}
              </span>
            </div>
            <span
              className="text-xs font-bold px-3 py-1 rounded-full border"
              style={{
                color      : currentMilestone.color,
                background : `${currentMilestone.color}15`,
                borderColor: `${currentMilestone.color}40`,
              }}
            >
              {currentMilestone.name}
            </span>
          </div>

          {/* MANTIDO: barra de progresso do card atual preservada integralmente */}
          <div className="mb-4">
            <div className="flex justify-between text-xs text-text3 mb-1.5">
              <span>
                {currentMilestone.targetType === 'VALUE' ? 'Faturamento gerado' : 'Vendas realizadas'}
              </span>
              <span className="font-semibold text-text">{formatCurrent(currentMilestone)}</span>
            </div>
            <div className="w-full h-3 rounded-full bg-bg3 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${currentMilestone.percentage}%`, background: currentMilestone.color }}
              />
            </div>
            <div className="flex justify-between text-xs text-text3 mt-1.5">
              <span>{currentMilestone.percentage}% concluído</span>
              {allReached
                ? <span style={{ color: currentMilestone.color }}>Todos os níveis atingidos!</span>
                : <span>Meta: {formatTarget(currentMilestone)}</span>
              }
            </div>
          </div>

          {/* MANTIDO: premiação do card atual preservada integralmente */}
          <div
            className="p-3 rounded-[8px] border"
            style={{ background: `${currentMilestone.color}10`, borderColor: `${currentMilestone.color}25` }}
          >
            <div className="flex items-start gap-2">
              <Star size={13} style={{ color: currentMilestone.color }} className="mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-text2 mb-0.5">Prêmio deste nível</p>
                <p className="text-xs text-text leading-relaxed">{currentMilestone.reward}</p>
              </div>
            </div>
          </div>

          {/* MANTIDO: resumo de receita e vendas preservado integralmente */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
            <div className="bg-bg3 rounded-lg p-2.5">
              <div className="flex items-center gap-1.5 mb-0.5">
                <TrendingUp size={11} className="text-green" />
                <span className="text-[10px] text-text3">Receita total</span>
              </div>
              <p className="text-sm font-bold text-text">{formatBRL(summary.totalValueCents)}</p>
            </div>
            <div className="bg-bg3 rounded-lg p-2.5">
              <div className="flex items-center gap-1.5 mb-0.5">
                <Package size={11} className="text-accent" />
                <span className="text-[10px] text-text3">Vendas aprovadas</span>
              </div>
              <p className="text-sm font-bold text-text">{summary.totalUnits.toLocaleString('pt-BR')}</p>
            </div>
          </div>
        </div>
      )}

      {/* MANTIDO: jornada completa de níveis preservada integralmente */}
      <div className="card">
        <div className="flex items-center gap-2 mb-5">
          <TrendingUp size={15} className="text-text2" />
          <span className="font-semibold text-text text-sm">Jornada de níveis</span>
        </div>

        <div className="relative">
          <div className="absolute left-5 top-6 bottom-6 w-px bg-border" />

          <div className="space-y-3">
            {milestones.map((m, idx) => {
              const isCurrent = !allReached && idx === nextIdx;
              const isLocked  = !m.reached && !isCurrent;

              return (
                <div
                  key={m.id}
                  className={`relative flex items-start gap-4 p-3.5 rounded-[10px] transition-all ${
                    isCurrent ? 'border' : ''
                  } ${isLocked ? 'opacity-50' : ''}`}
                  style={isCurrent ? { background: `${m.color}0d`, borderColor: `${m.color}35` } : {}}
                >
                  {/* MANTIDO: ícone do passo preservado integralmente */}
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 z-10 border-2"
                    style={{
                      background : m.reached ? m.color : 'var(--color-bg2)',
                      borderColor: m.reached ? m.color : 'var(--color-border)',
                    }}
                  >
                    <Trophy size={15} style={{ color: m.reached ? '#000' : 'var(--color-text3)' }} />
                  </div>

                  {/* MANTIDO: conteúdo do passo preservado integralmente */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span
                        className="font-semibold text-sm"
                        style={{ color: m.reached ? m.color : 'var(--color-text2)' }}
                      >
                        {m.name}
                      </span>
                      {isCurrent && (
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                          style={{ background: m.color, color: '#000' }}
                        >
                          nível atual
                        </span>
                      )}
                      {m.reached && (
                        <span className="text-[10px] text-green">✓ Concluído</span>
                      )}
                      {/* NOVO: badge de inscrito */}
                      {m.isEnrolled && (
                        <span className="flex items-center gap-0.5 text-[10px] text-green bg-green/10 px-1.5 py-0.5 rounded">
                          <Check size={9} />
                          Inscrito
                        </span>
                      )}
                    </div>

                    {/* MANTIDO: reward, meta e barra de progresso preservados integralmente */}
                    <p className="text-xs text-text2 mb-1 leading-relaxed line-clamp-2">{m.reward}</p>

                    <p className="text-[11px] text-text3">
                      Meta: {formatTarget(m)}
                      <span className="mx-1">·</span>
                      {m.targetType === 'VALUE' ? 'Receita' : 'Unidades'}
                    </p>

                    {/* Sua colocação — só mostra se tem posição (ou seja, já fez vendas) */}
                    {m.position != null && m.totalParticipants && m.totalParticipants > 0 && (
                      <div
                        className="inline-flex items-center gap-1.5 mt-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium border"
                        style={{
                          color      : m.color,
                          borderColor: `${m.color}40`,
                          background : `${m.color}12`,
                        }}
                      >
                        <Medal size={11} />
                        <span className="text-text2">
                          Sua colocação: <strong style={{ color: m.color }}>{m.myName || 'Você'}</strong>{' '}
                          — <strong style={{ color: m.color }}>{ordinal(m.position)} lugar</strong>
                        </span>
                      </div>
                    )}
                    {m.position == null && m.totalParticipants != null && m.totalParticipants > 0 && (
                      <div className="inline-flex items-center gap-1.5 mt-1.5 px-2 py-0.5 rounded-md text-[11px] border border-border bg-bg3 text-text3">
                        <Medal size={11} />
                        <span>Faça sua primeira venda para entrar no ranking</span>
                      </div>
                    )}

                    {isCurrent && (
                      <div className="mt-2">
                        <div className="w-full h-1.5 rounded-full bg-bg3 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${m.percentage}%`, background: m.color }}
                          />
                        </div>
                        <div className="text-[10px] text-text3 mt-0.5">
                          {formatCurrent(m)} de {formatTarget(m)}
                          {m.targetType === 'VALUE' && m.current < m.targetValue && (
                            <> · Falta {formatBRL(m.targetValue - m.current)}</>
                          )}
                        </div>
                      </div>
                    )}

                    {/* NOVO: botão Ingressar (só aparece se não estiver inscrito e o nível não estiver bloqueado) */}
                    {!m.isEnrolled && !isLocked && (
                      <button
                        onClick={() => onJoin(m)}
                        className="mt-2 flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg border transition-colors"
                        style={{
                          color      : m.color,
                          borderColor: `${m.color}50`,
                          background : `${m.color}0d`,
                        }}
                      >
                        <UserPlus size={11} />
                        {m.termsAndConditions ? 'Ver termos e ingressar' : 'Ingressar'}
                      </button>
                    )}

                    {/* NOVO: data de aceite se inscrito */}
                    {m.isEnrolled && m.acceptedAt && (
                      <p className="text-[10px] text-text3 mt-1.5">
                        Inscrito em {new Date(m.acceptedAt).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                  </div>

                  {/* MANTIDO: meta no canto preservada integralmente */}
                  <div className="text-right flex-shrink-0">
                    <div
                      className="text-xs font-semibold"
                      style={{ color: m.reached ? m.color : 'var(--color-text3)' }}
                    >
                      {formatTarget(m)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── NOVO: Modal de Termos e Aceite ─────────────────────────────
function TermsModal({
  milestone,
  onClose,
  onAccept,
  isJoining,
}: {
  milestone: Milestone;
  onClose  : () => void;
  onAccept : () => void;
  isJoining: boolean;
}) {
  const [accepted, setAccepted] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-bg2 rounded-2xl shadow-xl w-full max-w-lg border border-border flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: `${milestone.color}20` }}
            >
              <Trophy size={14} style={{ color: milestone.color }} />
            </div>
            <div>
              <p className="text-sm font-semibold text-text">{milestone.name}</p>
              <p className="text-[11px] text-text3">Marco de conquista</p>
            </div>
          </div>
          <button onClick={onClose} className="text-text3 hover:text-text">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {/* Premiação */}
          <div
            className="p-3 rounded-xl border"
            style={{ background: `${milestone.color}0d`, borderColor: `${milestone.color}30` }}
          >
            <div className="flex items-start gap-2">
              <Star size={13} style={{ color: milestone.color }} className="mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-text2 mb-0.5">Premiação</p>
                <p className="text-xs text-text leading-relaxed">{milestone.reward}</p>
              </div>
            </div>
          </div>

          {/* Termos e condições */}
          {milestone.termsAndConditions ? (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <FileText size={13} className="text-text3" />
                <p className="text-xs font-semibold text-text2">Termos e Condições</p>
              </div>
              <div className="bg-bg3 rounded-xl p-4 border border-border max-h-60 overflow-y-auto">
                <p className="text-xs text-text2 leading-relaxed whitespace-pre-wrap">
                  {milestone.termsAndConditions}
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-bg3 rounded-xl p-4 text-center">
              <p className="text-xs text-text3">Este marco não possui termos e condições específicos.</p>
            </div>
          )}

          {/* Checkbox de aceite */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative mt-0.5 flex-shrink-0">
              <input
                type="checkbox"
                checked={accepted}
                onChange={e => setAccepted(e.target.checked)}
                className="sr-only"
              />
              <div
                className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                  accepted
                    ? 'border-accent bg-accent'
                    : 'border-border group-hover:border-accent/50'
                }`}
              >
                {accepted && <Check size={10} className="text-white" />}
              </div>
            </div>
            <span className="text-xs text-text2 leading-relaxed">
              {milestone.termsAndConditions
                ? 'Li e aceito os termos e condições deste marco de conquista.'
                : 'Confirmo que desejo ingressar neste marco de conquista.'}
            </span>
          </label>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 py-4 border-t border-border flex-shrink-0">
          <button
            onClick={onAccept}
            disabled={!accepted || isJoining}
            className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-40"
          >
            {isJoining
              ? <><Loader2 size={14} className="animate-spin" /> Ingressando...</>
              : <><UserPlus size={14} /> Ingressar no marco</>
            }
          </button>
          <button onClick={onClose} className="btn-secondary" disabled={isJoining}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
