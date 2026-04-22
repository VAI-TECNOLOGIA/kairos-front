import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '@/components/ui';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Save, Users, Search, X, Zap, FileText, CreditCard, ArrowUpRight } from 'lucide-react';
import pagarmeLogo from '@/assets/pagarme.png';

// ══════════════════════════════════════════════════════════════════
// TIPOS E CONSTANTES
// ══════════════════════════════════════════════════════════════════

const CARD_TYPES = Array.from({ length: 12 }, (_, i) => `CARD_${i + 1}X` as const);
const FEE_TYPES  = ['PIX', 'BOLETO', ...CARD_TYPES, 'WITHDRAWAL'] as const;
type FeeType     = typeof FEE_TYPES[number];

type FeeMode = 'PERCENT' | 'FIXED';

interface FeePart {
  mode : FeeMode;
  value: number; // bps se PERCENT, cents se FIXED
}

interface FeeConfig {
  platform: FeePart;
  acquirer: FeePart;
}

type FeesMap = Record<FeeType, FeeConfig>;

const DEFAULT_PART  : FeePart   = { mode: 'PERCENT', value: 0 };
const DEFAULT_CONFIG: FeeConfig = { platform: DEFAULT_PART, acquirer: DEFAULT_PART };

// Aba (grupo de taxas na UI)
type TabId = 'PIX' | 'BOLETO' | 'CARD' | 'WITHDRAWAL';

const TABS: { id: TabId; label: string; icon: any; types: FeeType[] }[] = [
  { id: 'PIX',        label: 'PIX',           icon: Zap,           types: ['PIX'] },
  { id: 'BOLETO',     label: 'Boleto',        icon: FileText,      types: ['BOLETO'] },
  { id: 'CARD',       label: 'Cartão',        icon: CreditCard,    types: CARD_TYPES as unknown as FeeType[] },
  { id: 'WITHDRAWAL', label: 'Saque',         icon: ArrowUpRight,  types: ['WITHDRAWAL'] },
];

const FEE_TYPE_LABEL: Record<FeeType, string> = {
  PIX       : 'PIX',
  BOLETO    : 'Boleto',
  CARD_1X   : 'À vista',
  CARD_2X   : '2x',   CARD_3X : '3x',   CARD_4X : '4x',   CARD_5X : '5x',   CARD_6X : '6x',
  CARD_7X   : '7x',   CARD_8X : '8x',   CARD_9X : '9x',   CARD_10X: '10x',  CARD_11X: '11x',  CARD_12X: '12x',
  WITHDRAWAL: 'Saque',
};

// ══════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════

function formatValue(part: FeePart): string {
  if (part.mode === 'PERCENT') return (part.value / 100).toFixed(2);
  return (part.value / 100).toFixed(2);
}

function parseValue(input: string, mode: FeeMode): number {
  const n = parseFloat(input.replace(',', '.'));
  if (isNaN(n) || n < 0) return 0;
  return Math.round(n * 100); // bps (1% = 100 bps) ou cents (R$ 1 = 100 cents)
}

/** Converte FeePart em centavos sobre uma venda de referência (para exibir lucro). */
function partToCents(part: FeePart, saleCents: number): number {
  if (part.mode === 'PERCENT') return Math.round(saleCents * part.value / 10000);
  return part.value;
}

function formatBRL(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs  = Math.abs(cents);
  return `${sign}R$ ${(abs / 100).toFixed(2).replace('.', ',')}`;
}

// ══════════════════════════════════════════════════════════════════
// SUBCOMPONENTES
// ══════════════════════════════════════════════════════════════════

/** Input combinado: valor numérico + toggle de modo (% ou R$) */
function FeePartInput({
  part,
  onChange,
}: {
  part    : FeePart;
  onChange: (p: FeePart) => void;
}) {
  const [raw, setRaw] = useState(formatValue(part));

  useEffect(() => {
    setRaw(formatValue(part));
  }, [part.mode, part.value]);

  const commit = (input: string) => {
    setRaw(input);
    onChange({ ...part, value: parseValue(input, part.mode) });
  };

  const setMode = (mode: FeeMode) => {
    // Ao trocar o modo, reseta o valor para 0 (semântica muda de bps para cents)
    onChange({ mode, value: 0 });
  };

  return (
    <div className="flex items-center gap-2">
      {/* Toggle de modo */}
      <div className="inline-flex rounded-[7px] border border-border bg-bg overflow-hidden text-xs">
        <button
          type="button"
          onClick={() => setMode('PERCENT')}
          className={`px-2.5 py-1.5 font-semibold transition-colors ${
            part.mode === 'PERCENT' ? 'bg-accent text-white' : 'text-text3 hover:text-text2'
          }`}
        >
          %
        </button>
        <button
          type="button"
          onClick={() => setMode('FIXED')}
          className={`px-2.5 py-1.5 font-semibold transition-colors border-l border-border ${
            part.mode === 'FIXED' ? 'bg-accent text-white' : 'text-text3 hover:text-text2'
          }`}
        >
          R$
        </button>
      </div>

      {/* Input numérico */}
      <div className="relative flex-1 min-w-[110px]">
        {part.mode === 'FIXED' && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text3 text-xs">R$</span>
        )}
        <input
          type="text"
          inputMode="decimal"
          value={raw}
          onChange={(e) => commit(e.target.value)}
          className={`input h-9 ${part.mode === 'FIXED' ? 'pl-9' : 'pr-8'}`}
          placeholder="0,00"
        />
        {part.mode === 'PERCENT' && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text3 text-xs">%</span>
        )}
      </div>
    </div>
  );
}

/** Uma linha de taxa: platform + acquirer + lucro calculado */
function FeeRow({
  type,
  config,
  onChange,
  showType = true,
}: {
  type    : FeeType;
  config  : FeeConfig;
  onChange: (cfg: FeeConfig) => void;
  showType?: boolean;
}) {
  const EXAMPLE_SALE = 10000; // R$ 100
  const platformCents = partToCents(config.platform, EXAMPLE_SALE);
  const acquirerCents = partToCents(config.acquirer, EXAMPLE_SALE);
  const profitCents   = platformCents - acquirerCents;
  const isLoss        = profitCents < 0;

  return (
    <tr>
      {showType && (
        <td className="font-semibold text-text">
          {FEE_TYPE_LABEL[type]}
        </td>
      )}
      <td>
        <FeePartInput
          part={config.platform}
          onChange={(p) => onChange({ ...config, platform: p })}
        />
      </td>
      <td>
        <FeePartInput
          part={config.acquirer}
          onChange={(a) => onChange({ ...config, acquirer: a })}
        />
      </td>
      <td>
        <span className={`font-semibold ${isLoss ? 'text-red-400' : 'text-green-400'}`}>
          {profitCents >= 0 ? '+' : ''}{formatBRL(profitCents)}
        </span>
      </td>
    </tr>
  );
}

// ══════════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ══════════════════════════════════════════════════════════════════

export default function AdminFees() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<TabId>('PIX');

  const { data: feesData, isLoading } = useQuery<{ fees: FeesMap }>({
    queryKey: ['admin-fees'],
    queryFn : () => api.get('/admin/fees').then(r => r.data),
  });

  // Estado editável local (espelha o servidor, permite edição sem perder foco)
  const [fees, setFees] = useState<FeesMap | null>(null);

  useEffect(() => {
    if (feesData?.fees) setFees(feesData.fees);
  }, [feesData]);

  const saveAll = useMutation({
    mutationFn: () => {
      if (!fees) return Promise.reject(new Error('Nenhum dado'));
      return api.post('/admin/fees', { fees });
    },
    onSuccess: () => { toast.success('Taxas salvas!'); qc.invalidateQueries({ queryKey: ['admin-fees'] }); },
    onError  : () => toast.error('Erro ao salvar taxas'),
  });

  // Setter para uma taxa específica
  const setFee = (type: FeeType, cfg: FeeConfig) => {
    setFees(prev => (prev ? { ...prev, [type]: cfg } : prev));
  };

  // Custom fees por usuário (fica na página)
  const [query, setQuery]           = useState('');
  const [onlyCustom, setOnlyCustom] = useState(true);

  interface CustomFeeRow {
    userId: string; name: string; email: string;
    role: 'PRODUCER' | 'AFFILIATE'; customFeeBps: number | null;
  }

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

  const currentTab = useMemo(() => TABS.find(t => t.id === tab)!, [tab]);
  const brand      = { name: 'Pagar.me', color: '#08ac54', logo: pagarmeLogo };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Taxas e Comissões"
        sub="Configuração das taxas por método de pagamento, adquirente e usuário"
      />

      {/* ── Tabs de métodos ─────────────────────────────────────── */}
      <div className="card p-0 overflow-hidden">
        <div className="flex border-b border-border overflow-x-auto">
          {TABS.map(t => {
            const Icon   = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                  active
                    ? 'border-accent text-text bg-bg3/50'
                    : 'border-transparent text-text3 hover:text-text2'
                }`}
              >
                <Icon size={15} />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Conteúdo da tab ativa */}
        <div className="p-5">
          {isLoading || !fees ? (
            <div className="h-32 bg-bg3 rounded-xl animate-pulse" />
          ) : (
            <>
              {/* Header com logo/brand */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <currentTab.icon size={16} className="text-accent" />
                  <h3 className="font-semibold text-text">Taxas — {currentTab.label}</h3>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-xs text-text3">Adquirente:</span>
                  <span
                    className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border"
                    style={{
                      background  : `${brand.color}1f`,
                      color       : brand.color,
                      borderColor : `${brand.color}40`,
                    }}
                  >
                    {brand.name}
                  </span>
                  <img src={brand.logo} alt={brand.name} className="h-5 object-contain opacity-90" />
                </div>
              </div>

              <p className="text-xs text-text3 mb-4">
                Valores em % aplicam-se sobre o valor da venda. Valores em R$ são cobrados por transação.
                Lucro exibido para venda de referência de <strong>R$ 100,00</strong>.
              </p>

              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      {currentTab.types.length > 1 && <th className="w-28">Parcelamento</th>}
                      <th>Taxa da Plataforma</th>
                      <th>Taxa do Adquirente</th>
                      <th className="w-48">Lucro por venda</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentTab.types.map(type => (
                      <FeeRow
                        key={type}
                        type={type}
                        config={fees[type] ?? DEFAULT_CONFIG}
                        onChange={(cfg) => setFee(type, cfg)}
                        showType={currentTab.types.length > 1}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end pt-4 border-t border-border mt-5">
                <button
                  onClick={() => saveAll.mutate()}
                  disabled={saveAll.isPending}
                  className="btn-primary btn-sm flex items-center gap-1.5"
                >
                  <Save size={13} />
                  {saveAll.isPending ? 'Salvando...' : 'Salvar taxas'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Taxas personalizadas por usuário ────────────────────── */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2.5">
          <Users size={16} className="text-accent flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-text">Taxas Personalizadas por Usuário</h3>
            <p className="text-xs text-text3 mt-0.5">
              Override percentual aplicado a todos os métodos. Só afeta taxas em modo % (quando em R$ fixo, a taxa configurada é usada).
            </p>
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
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// LINHA DE TAXA PERSONALIZADA (mantido do design anterior)
// ══════════════════════════════════════════════════════════════════

interface CustomFeeRowData {
  userId      : string;
  name        : string;
  email       : string;
  role        : 'PRODUCER' | 'AFFILIATE';
  customFeeBps: number | null;
}

function bpsToPct(bps: number): string { return (bps / 100).toFixed(2); }
function pctToBps(pct: string): number {
  const n = parseFloat(pct.replace(',', '.'));
  if (isNaN(n) || n < 0) return 0;
  return Math.round(n * 100);
}

function CustomFeeRow({
  row, onSave, onReset,
}: {
  row    : CustomFeeRowData;
  onSave : (bps: number) => void;
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
