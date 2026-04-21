import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui';
import { RichTextEditor, sanitizeHtml } from '@/components/RichTextEditor';
import {
  ICON_MAP, ICON_OPTIONS, COLOR_OPTIONS,
  DEFAULT_SUCCESS_MESSAGE, DEFAULT_SUCCESS_ICON, DEFAULT_SUCCESS_COLOR,
} from '@/lib/successConfig';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { MessageSquareHeart, Eye, EyeOff, Save, Percent, TrendingUp, Users, Search, X } from 'lucide-react';

// ── TAXAS E COMISSÕES ────────────────────────────────────────────

const ACQUIRERS = ['PAGARME', 'STONE', 'ASAAS', 'CIELO'] as const;
type Acquirer = typeof ACQUIRERS[number];

interface FeesData {
  platformBps: number;
  platformPct: number;
  acquirers: Record<Acquirer, { bps: number; profitBps: number }>;
}

interface CustomFeeRow {
  userId      : string;
  name        : string;
  email       : string;
  role        : 'PRODUCER' | 'AFFILIATE';
  customFeeBps: number | null;
}

function bpsToPct(bps: number): string {
  return (bps / 100).toFixed(2);
}

function pctToBps(pct: string): number {
  const n = parseFloat(pct.replace(',', '.'));
  if (isNaN(n) || n < 0) return 0;
  return Math.round(n * 100);
}

function FeesSection() {
  const qc = useQueryClient();

  const { data: fees, isLoading } = useQuery<FeesData>({
    queryKey: ['admin-fees'],
    queryFn : () => api.get('/admin/fees').then(r => r.data),
  });

  // Estado local editável
  const [platformPct, setPlatformPct] = useState('');
  const [acquirerPcts, setAcquirerPcts] = useState<Record<Acquirer, string>>({
    PAGARME: '', STONE: '', ASAAS: '', CIELO: '',
  });

  useEffect(() => {
    if (!fees) return;
    setPlatformPct(bpsToPct(fees.platformBps));
    setAcquirerPcts({
      PAGARME: bpsToPct(fees.acquirers.PAGARME?.bps ?? 0),
      STONE  : bpsToPct(fees.acquirers.STONE?.bps   ?? 0),
      ASAAS  : bpsToPct(fees.acquirers.ASAAS?.bps   ?? 0),
      CIELO  : bpsToPct(fees.acquirers.CIELO?.bps   ?? 0),
    });
  }, [fees]);

  const save = useMutation({
    mutationFn: () => api.post('/admin/fees', {
      platformBps: pctToBps(platformPct),
      acquirers: {
        PAGARME: pctToBps(acquirerPcts.PAGARME),
        STONE  : pctToBps(acquirerPcts.STONE),
        ASAAS  : pctToBps(acquirerPcts.ASAAS),
        CIELO  : pctToBps(acquirerPcts.CIELO),
      },
    }),
    onSuccess: () => { toast.success('Taxas atualizadas!'); qc.invalidateQueries({ queryKey: ['admin-fees'] }); },
    onError  : () => toast.error('Erro ao salvar taxas'),
  });

  // Custom fees por usuário
  const [query, setQuery]           = useState('');
  const [onlyCustom, setOnlyCustom] = useState(true);

  const { data: usersData } = useQuery<{ data: CustomFeeRow[] }>({
    queryKey: ['admin-fees-users', query, onlyCustom],
    queryFn : () => api.get('/admin/fees/users', {
      params: { q: query, onlyCustom: onlyCustom ? '1' : '0' },
    }).then(r => r.data),
  });

  const setUserFee = useMutation({
    mutationFn: (vars: { userId: string; customFeeBps: number | null }) =>
      api.put(`/admin/fees/users/${vars.userId}`, { customFeeBps: vars.customFeeBps }),
    onSuccess: () => {
      toast.success('Taxa do usuário atualizada');
      qc.invalidateQueries({ queryKey: ['admin-fees-users'] });
    },
    onError: () => toast.error('Erro ao atualizar taxa'),
  });

  const platformBpsNow = pctToBps(platformPct);

  return (
    <>
      {/* ── Card: Taxa Geral da Plataforma ────────────────────────── */}
      <div className="card space-y-5">
        <div className="flex items-center gap-2.5">
          <Percent size={16} className="text-accent flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-text">Taxa Geral da Plataforma</h3>
            <p className="text-xs text-text3 mt-0.5">Taxa padrão aplicada em todas as vendas (exceto usuários com taxa personalizada).</p>
          </div>
        </div>

        {isLoading ? <div className="h-16 bg-bg3 rounded-xl animate-pulse" /> : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">Taxa cobrada (%)</label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="decimal"
                  value={platformPct}
                  onChange={(e) => setPlatformPct(e.target.value)}
                  className="input pr-8"
                  placeholder="5.00"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text3 text-sm">%</span>
              </div>
              <p className="text-[11px] text-text3 mt-1">Equivale a {platformBpsNow} bps</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Card: Taxas dos Adquirentes + Lucro ───────────────────── */}
      <div className="card space-y-5">
        <div className="flex items-center gap-2.5">
          <TrendingUp size={16} className="text-accent flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-text">Taxas dos Adquirentes</h3>
            <p className="text-xs text-text3 mt-0.5">Taxa cobrada por cada gateway. Lucro = Taxa plataforma − Taxa adquirente.</p>
          </div>
        </div>

        {isLoading ? <div className="h-32 bg-bg3 rounded-xl animate-pulse" /> : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Adquirente</th>
                  <th>Taxa cobrada (%)</th>
                  <th>Lucro da plataforma</th>
                </tr>
              </thead>
              <tbody>
                {ACQUIRERS.map(acq => {
                  const acqBps    = pctToBps(acquirerPcts[acq]);
                  const profitBps = platformBpsNow - acqBps;
                  const profitPct = profitBps / 100;
                  const isLoss    = profitBps < 0;
                  return (
                    <tr key={acq}>
                      <td><span className="badge-gray">{acq}</span></td>
                      <td className="w-48">
                        <div className="relative">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={acquirerPcts[acq]}
                            onChange={(e) => setAcquirerPcts(prev => ({ ...prev, [acq]: e.target.value }))}
                            className="input pr-8 h-9"
                            placeholder="0.00"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text3 text-xs">%</span>
                        </div>
                      </td>
                      <td>
                        <span className={`font-semibold ${isLoss ? 'text-red-400' : 'text-green-400'}`}>
                          {profitPct >= 0 ? '+' : ''}{profitPct.toFixed(2)}%
                        </span>
                        <span className="text-text3 text-xs ml-1">({profitBps} bps)</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-border">
          <button
            onClick={() => save.mutate()}
            disabled={save.isPending || isLoading}
            className="btn-primary btn-sm flex items-center gap-1.5"
          >
            <Save size={13} />
            {save.isPending ? 'Salvando...' : 'Salvar taxas'}
          </button>
        </div>
      </div>

      {/* ── Card: Taxas personalizadas por usuário ────────────────── */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2.5">
          <Users size={16} className="text-accent flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-text">Taxas Personalizadas por Usuário</h3>
            <p className="text-xs text-text3 mt-0.5">Produtores e afiliados com taxa diferente da geral. Se não preenchida, usa a taxa geral.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text3" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nome ou email..."
              className="input pl-9 h-9"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-text2 cursor-pointer">
            <input
              type="checkbox"
              checked={onlyCustom}
              onChange={(e) => setOnlyCustom(e.target.checked)}
              className="w-4 h-4"
            />
            Apenas com taxa personalizada
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Usuário</th>
                <th>Tipo</th>
                <th>Taxa personalizada</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {(usersData?.data ?? []).length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center text-text3 py-6">
                    {onlyCustom ? 'Nenhum usuário com taxa personalizada' : 'Nenhum usuário encontrado'}
                  </td>
                </tr>
              ) : (
                (usersData?.data ?? []).map(u => (
                  <CustomFeeRow
                    key={`${u.role}:${u.userId}`}
                    row={u}
                    onSave={(bps) => setUserFee.mutate({ userId: u.userId, customFeeBps: bps })}
                    onReset={() => setUserFee.mutate({ userId: u.userId, customFeeBps: null })}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function CustomFeeRow({
  row, onSave, onReset,
}: {
  row: CustomFeeRow;
  onSave: (bps: number) => void;
  onReset: () => void;
}) {
  const [pct, setPct] = useState(row.customFeeBps !== null ? bpsToPct(row.customFeeBps) : '');

  useEffect(() => {
    setPct(row.customFeeBps !== null ? bpsToPct(row.customFeeBps) : '');
  }, [row.customFeeBps]);

  return (
    <tr>
      <td>
        <div className="text-text font-medium">{row.name}</div>
        <div className="text-text3 text-xs">{row.email}</div>
      </td>
      <td><span className={row.role === 'PRODUCER' ? 'badge-blue' : 'badge-gray'}>{row.role === 'PRODUCER' ? 'Produtor' : 'Afiliado'}</span></td>
      <td className="w-40">
        <div className="relative">
          <input
            type="text"
            inputMode="decimal"
            value={pct}
            onChange={(e) => setPct(e.target.value)}
            placeholder="Geral"
            className="input pr-7 h-9"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text3 text-xs">%</span>
        </div>
      </td>
      <td>
        <div className="flex gap-2">
          <button
            onClick={() => {
              const bps = pctToBps(pct);
              if (pct.trim() === '') return onReset();
              onSave(bps);
            }}
            className="btn-primary btn-sm"
          >
            Salvar
          </button>
          {row.customFeeBps !== null && (
            <button
              onClick={onReset}
              title="Remover taxa personalizada — voltar à taxa geral"
              className="btn-ghost btn-sm text-text3 hover:text-red-400"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

export default function AdminSettings() {
  const qc = useQueryClient();
  const [msg,     setMsg]     = useState(DEFAULT_SUCCESS_MESSAGE);
  const [icon,    setIcon]    = useState(DEFAULT_SUCCESS_ICON);
  const [color,   setColor]   = useState(DEFAULT_SUCCESS_COLOR);
  const [preview, setPreview] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn : () => api.get('/admin/settings').then(r => r.data),
  });

  useEffect(() => {
    if (!settings) return;
    const cfg = settings.checkout_success_message ?? {};
    if (cfg.html  !== undefined) setMsg(cfg.html);
    if (cfg.icon  !== undefined) setIcon(cfg.icon);
    if (cfg.color !== undefined) setColor(cfg.color);
  }, [settings]);

  const save = useMutation({
    mutationFn: () => api.patch('/admin/settings', {
      checkout_success_message: { html: msg, icon, color },
    }),
    onSuccess: () => { toast.success('Configurações salvas!'); qc.invalidateQueries({ queryKey: ['admin-settings'] }); },
    onError  : () => toast.error('Erro ao salvar'),
  });

  const PreviewIcon = ICON_MAP[icon] ?? ICON_MAP[DEFAULT_SUCCESS_ICON];
  const hexA = (c: string, a: string) => `${c}${a}`;

  return (
    <div className="space-y-6">
      <PageHeader title="Configurações" sub="Configurações gerais da plataforma" />

      <FeesSection />

      <div className="card space-y-6">
        {/* Header da seção */}
        <div className="flex items-center gap-2.5">
          <MessageSquareHeart size={16} className="text-accent flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-text">Mensagem de Parabéns — Padrão da Plataforma</h3>
            <p className="text-xs text-text3 mt-0.5">Exibida na tela de confirmação de todos os produtos. Produtores podem personalizar por produto.</p>
          </div>
        </div>

        {isLoading ? <div className="h-48 bg-bg3 rounded-xl animate-pulse" /> : (
          <>
            {/* ── Escolha do ícone ──────────────────────────────────── */}
            <div>
              <label className="label mb-3">Ícone de confirmação</label>
              {ICON_OPTIONS.map(group => (
                <div key={group.group} className="mb-4">
                  <p className="text-[11px] font-semibold text-text3 uppercase tracking-wider mb-2">{group.group}</p>
                  <div className="flex flex-wrap gap-2">
                    {group.items.map(opt => {
                      const Ic = ICON_MAP[opt.id];
                      const active = icon === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          title={opt.label}
                          onClick={() => setIcon(opt.id)}
                          className={`flex flex-col items-center gap-1 px-3 py-2.5 rounded-xl border transition-all ${
                            active
                              ? 'border-accent/60 bg-accent/10 text-text'
                              : 'border-border bg-bg3 text-text3 hover:border-border/80 hover:text-text2'
                          }`}
                        >
                          <Ic size={20} style={active ? { color } : undefined} strokeWidth={1.5} />
                          <span className="text-[10px] leading-none">{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* ── Cor do ícone ──────────────────────────────────────── */}
            <div>
              <label className="label mb-3">Cor do ícone</label>
              <div className="flex flex-wrap gap-2.5">
                {COLOR_OPTIONS.map(c => (
                  <button
                    key={c.hex}
                    type="button"
                    title={c.label}
                    onClick={() => setColor(c.hex)}
                    className={`w-9 h-9 rounded-full border-2 transition-all hover:scale-110 ${
                      color === c.hex ? 'border-white scale-110 shadow-lg' : 'border-transparent'
                    }`}
                    style={{ background: c.hex }}
                  />
                ))}
              </div>
            </div>

            {/* ── Preview do ícone ──────────────────────────────────── */}
            <div className="bg-bg3 rounded-2xl p-4 flex items-center gap-4">
              <div className="relative flex-shrink-0">
                <div className="absolute inset-0 rounded-full" style={{ background: hexA(color, '18') }} />
                <div className="w-14 h-14 rounded-full flex items-center justify-center relative border" style={{ background: hexA(color, '20'), borderColor: hexA(color, '40') }}>
                  <PreviewIcon size={26} strokeWidth={1.5} style={{ color }} />
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-text">Pré-visualização do ícone</p>
                <p className="text-xs text-text3 mt-0.5">{ICON_OPTIONS.flatMap(g => g.items).find(i => i.id === icon)?.label ?? icon} · {COLOR_OPTIONS.find(c => c.hex === color)?.label ?? color}</p>
              </div>
            </div>

            {/* ── Mensagem ──────────────────────────────────────────── */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label mb-0">Mensagem de Pós-Venda</label>
                <button
                  type="button"
                  onClick={() => setPreview(p => !p)}
                  className="flex items-center gap-1.5 text-xs text-text2 hover:text-text transition-colors"
                >
                  {preview ? <EyeOff size={13} /> : <Eye size={13} />}
                  {preview ? 'Editar' : 'Pré-visualizar'}
                </button>
              </div>

              {preview ? (
                <div
                  className="rich-content border border-border rounded-xl px-4 py-3 bg-bg text-sm leading-relaxed"
                  style={{ minHeight: 160 }}
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(msg) || '<p style="color:var(--text3);font-style:italic">Sem mensagem.</p>' }}
                />
              ) : (
                <RichTextEditor
                  value={msg}
                  onChange={setMsg}
                  placeholder="Ex: Muito obrigado pela sua compra!..."
                  minHeight={160}
                />
              )}
            </div>

            {/* ── Footer ────────────────────────────────────────────── */}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <p className="text-xs text-text3">
                Produtores podem personalizar por produto na aba <strong className="text-text2">Pós-Venda</strong>.
              </p>
              <button
                onClick={() => save.mutate()}
                disabled={save.isPending}
                className="btn-primary btn-sm flex items-center gap-1.5"
              >
                <Save size={13} />
                {save.isPending ? 'Salvando...' : 'Salvar configurações'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
