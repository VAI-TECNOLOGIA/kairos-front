import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '@/components/ui';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Save, Users, Search, X, Zap, FileText, CreditCard, ArrowUpRight, Percent as PercentIcon, TrendingUp, Building2, Info, ShieldCheck } from 'lucide-react';
import pagarmeLogo from '@/assets/pagarme.png';

// ══════════════════════════════════════════════════════════════════
// TIPOS
// ══════════════════════════════════════════════════════════════════

const CARD_INSTALLMENTS = Array.from({ length: 12 }, (_, i) => `CARD_${i + 1}X` as const);
type CardInstallment = typeof CARD_INSTALLMENTS[number];

const PLATFORM_METHODS = [
  'PIX', 'BOLETO',
  ...CARD_INSTALLMENTS,
  'CARD_GATEWAY', 'CARD_ANTIFRAUDE',
  'CARD',
  'WITHDRAWAL',
] as const;
type PlatformMethod = typeof PLATFORM_METHODS[number];

const ACQUIRER_METHODS = [
  'PIX', 'BOLETO',
  ...CARD_INSTALLMENTS,
  'CARD_GATEWAY', 'CARD_ANTIFRAUDE',
  'WITHDRAWAL',
] as const;
type AcquirerMethod = typeof ACQUIRER_METHODS[number];

interface FeePart {
  bps?  : number;
  cents?: number;
}

interface FeesData {
  platform: Record<PlatformMethod, FeePart>;
  acquirer: Record<AcquirerMethod, FeePart>;
}

const EMPTY_PART: FeePart = {};

const PLATFORM_META: Record<'PIX' | 'BOLETO' | 'CARD' | 'WITHDRAWAL', { label: string; icon: any; color: string }> = {
  PIX       : { label: 'Pix',    icon: Zap,          color: '#00C9A7' },
  BOLETO    : { label: 'Boleto', icon: FileText,     color: '#F59E0B' },
  CARD      : { label: 'Cartão', icon: CreditCard,   color: '#0055FE' },
  WITHDRAWAL: { label: 'Saque',  icon: ArrowUpRight, color: '#7C3AED' },
};

const CARD_INSTALLMENT_LABEL: Record<CardInstallment, string> = {
  CARD_1X: 'Crédito à vista',
  CARD_2X: 'Parcelado 2x',   CARD_3X: 'Parcelado 3x',   CARD_4X: 'Parcelado 4x',
  CARD_5X: 'Parcelado 5x',   CARD_6X: 'Parcelado 6x',   CARD_7X: 'Parcelado 7x',
  CARD_8X: 'Parcelado 8x',   CARD_9X: 'Parcelado 9x',   CARD_10X: 'Parcelado 10x',
  CARD_11X: 'Parcelado 11x', CARD_12X: 'Parcelado 12x',
};

// ══════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════

function partToCents(p: FeePart, saleCents: number): number {
  const pct = p.bps   ? Math.round(saleCents * p.bps / 10000) : 0;
  const fix = p.cents ?? 0;
  return pct + fix;
}

function formatPart(p: FeePart): string {
  const parts: string[] = [];
  if (p.bps)   parts.push(`${(p.bps / 100).toFixed(2).replace(/\.?0+$/, '')}%`);
  if (p.cents) parts.push(`R$ ${(p.cents / 100).toFixed(2).replace('.', ',')}`);
  return parts.join(' + ') || '—';
}

function formatBRL(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs  = Math.abs(cents);
  return `${sign}R$ ${(abs / 100).toFixed(2).replace('.', ',')}`;
}

function bpsToInput(bps?: number): string  { return bps ? (bps / 100).toFixed(2) : ''; }
function centsToInput(cents?: number): string { return cents ? (cents / 100).toFixed(2) : ''; }
function parseDecimal(raw: string): number | undefined {
  if (!raw.trim()) return undefined;
  const n = parseFloat(raw.replace(',', '.'));
  if (isNaN(n) || n <= 0) return undefined;
  return Math.round(n * 100);
}

// ══════════════════════════════════════════════════════════════════
// INPUT COMBINADO: % + R$ (ambos opcionais, podem coexistir)
// ══════════════════════════════════════════════════════════════════

function FeeInput({ part, onChange, onlyFixed, compact }: {
  part      : FeePart;
  onChange  : (p: FeePart) => void;
  onlyFixed?: boolean;    // restringe a só R$ (usado em Gateway/Antifraude)
  compact?  : boolean;
}) {
  const [pct,  setPct]  = useState(bpsToInput(part.bps));
  const [reais, setReais] = useState(centsToInput(part.cents));

  useEffect(() => { setPct(bpsToInput(part.bps)); }, [part.bps]);
  useEffect(() => { setReais(centsToInput(part.cents)); }, [part.cents]);

  const commitPct = (v: string) => {
    setPct(v);
    onChange({ ...part, bps: parseDecimal(v) });
  };
  const commitBrl = (v: string) => {
    setReais(v);
    onChange({ ...part, cents: parseDecimal(v) });
  };

  const h = compact ? 'h-8' : 'h-9';

  return (
    <div className={`flex items-center gap-2 ${compact ? 'text-xs' : 'text-sm'}`}>
      {!onlyFixed && (
        <>
          <div className="relative flex-1 min-w-0">
            <input
              type="text"
              inputMode="decimal"
              value={pct}
              onChange={(e) => commitPct(e.target.value)}
              placeholder="0,00"
              className={`input ${h} pr-7 w-full`}
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text3 text-[10px]">%</span>
          </div>
          <span className="text-text3 text-xs select-none">+</span>
        </>
      )}
      <div className="relative flex-1 min-w-0">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text3 text-[10px]">R$</span>
        <input
          type="text"
          inputMode="decimal"
          value={reais}
          onChange={(e) => commitBrl(e.target.value)}
          placeholder="0,00"
          className={`input ${h} pl-7 w-full`}
        />
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ══════════════════════════════════════════════════════════════════

export default function AdminFees() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<FeesData>({
    queryKey: ['admin-fees'],
    queryFn : () => api.get('/admin/fees').then(r => r.data),
  });

  const [platform, setPlatform] = useState<Record<PlatformMethod, FeePart> | null>(null);
  const [acquirer, setAcquirer] = useState<Record<AcquirerMethod, FeePart> | null>(null);

  useEffect(() => {
    if (data) {
      setPlatform(data.platform);
      setAcquirer(data.acquirer);
    }
  }, [data]);

  const save = useMutation({
    mutationFn: () => {
      if (!platform || !acquirer) return Promise.reject(new Error('Sem dados'));
      return api.post('/admin/fees', { platform, acquirer });
    },
    onSuccess: () => { toast.success('Taxas salvas!'); qc.invalidateQueries({ queryKey: ['admin-fees'] }); },
    onError  : () => toast.error('Erro ao salvar'),
  });

  const setPlatformMethod = (m: PlatformMethod, p: FeePart) =>
    setPlatform(prev => prev ? { ...prev, [m]: p } : prev);

  const setAcquirerMethod = (m: AcquirerMethod, p: FeePart) =>
    setAcquirer(prev => prev ? { ...prev, [m]: p } : prev);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Taxas e Comissões"
        sub="Configure o que a plataforma cobra do produtor e o que o adquirente (Pagar.me) cobra da plataforma."
      />

      <div className="card bg-accent/5 border-accent/20">
        <div className="flex items-start gap-2.5">
          <Info size={14} className="text-accent mt-0.5 flex-shrink-0" />
          <div className="text-xs text-text2 leading-relaxed">
            <strong className="text-text">Cada taxa é % + R$ fixo (somados).</strong> Preencha só o que se aplica.
            Ex: PIX = 1,09% + R$ 0,99. A taxa aplicada é <strong className="text-text">fotografada no momento da transação</strong>
            — alterações futuras só valem para novas vendas.
          </div>
        </div>
      </div>

      {/* BLOCO 1 — TAXA GERAL DA PLATAFORMA */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2.5">
          <PercentIcon size={16} className="text-accent flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-text">Taxa Geral da Plataforma</h3>
            <p className="text-xs text-text3 mt-0.5">
              Taxa cobrada do produtor/afiliado quando não há taxa personalizada.
              Configure por parcela igual o adquirente — assim você não fica no prejuízo nas vendas parceladas.
            </p>
          </div>
        </div>

        {isLoading || !platform ? <div className="h-80 bg-bg3 rounded-xl animate-pulse" /> : (
          <>
            {/* PIX / BOLETO / SAQUE */}
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th className="w-40">Método</th>
                    <th>Taxa da plataforma</th>
                  </tr>
                </thead>
                <tbody>
                  {(['PIX', 'BOLETO', 'WITHDRAWAL'] as const).map(m => {
                    const meta = PLATFORM_META[m];
                    const Icon = meta.icon;
                    return (
                      <tr key={m}>
                        <td>
                          <div className="flex items-center gap-2">
                            <Icon size={14} style={{ color: meta.color }} />
                            <span className="font-medium text-text">{meta.label}</span>
                          </div>
                        </td>
                        <td className="w-64">
                          <FeeInput
                            part={platform[m] ?? EMPTY_PART}
                            onChange={(p) => setPlatformMethod(m, p)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* MDRs do cartão */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <CreditCard size={14} style={{ color: PLATFORM_META.CARD.color }} />
                <h4 className="font-semibold text-text text-sm">Cartão por parcelamento</h4>
                <span className="text-[11px] text-text3">(% que a plataforma cobra do produtor em cada parcela)</span>
              </div>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th className="w-40">Parcelamento</th>
                      <th>Taxa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CARD_INSTALLMENTS.map(m => (
                      <tr key={m}>
                        <td className="font-medium text-text">{CARD_INSTALLMENT_LABEL[m]}</td>
                        <td className="w-64">
                          <FeeInput
                            part={platform[m] ?? EMPTY_PART}
                            onChange={(p) => setPlatformMethod(m, p)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-text3 mt-1">
                Se uma parcela ficar em branco, a plataforma cai na taxa "Cartão (geral)" abaixo.
              </p>
            </div>

            {/* Cartão genérico — fallback legado */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <CreditCard size={14} style={{ color: PLATFORM_META.CARD.color }} />
                <h4 className="font-semibold text-text text-sm">Cartão (geral) — fallback</h4>
                <span className="text-[11px] text-text3">(usado quando a parcela específica não está configurada)</span>
              </div>
              <div className="overflow-x-auto">
                <table className="table">
                  <tbody>
                    <tr>
                      <td className="font-medium text-text w-40">Cartão</td>
                      <td className="w-64">
                        <FeeInput
                          part={platform.CARD ?? EMPTY_PART}
                          onChange={(p) => setPlatformMethod('CARD', p)}
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Custos fixos do cartão — Gateway e Antifraude */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck size={14} className="text-accent" />
                <h4 className="font-semibold text-text text-sm">Custos fixos do cartão</h4>
                <span className="text-[11px] text-text3">(somados a toda venda no cartão)</span>
              </div>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th className="w-40">Item</th>
                      <th>Valor fixo</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="font-medium text-text">Gateway</td>
                      <td className="w-64">
                        <FeeInput
                          part={platform.CARD_GATEWAY ?? EMPTY_PART}
                          onChange={(p) => setPlatformMethod('CARD_GATEWAY', p)}
                          onlyFixed
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className="font-medium text-text">Antifraude</td>
                      <td className="w-64">
                        <FeeInput
                          part={platform.CARD_ANTIFRAUDE ?? EMPTY_PART}
                          onChange={(p) => setPlatformMethod('CARD_ANTIFRAUDE', p)}
                          onlyFixed
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* BLOCO 2 — TAXA DO ADQUIRENTE (Pagar.me) */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2.5 flex-wrap">
          <Building2 size={16} className="text-accent flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-text">Taxa do Adquirente</h3>
            <p className="text-xs text-text3 mt-0.5">Custo cobrado pelo gateway. Não é exibido ao produtor.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border"
                  style={{ background: '#08ac541f', color: '#08ac54', borderColor: '#08ac5440' }}>
              Pagar.me
            </span>
            <img src={pagarmeLogo} alt="Pagar.me" className="h-5 object-contain opacity-90" />
          </div>
        </div>

        {isLoading || !acquirer ? <div className="h-80 bg-bg3 rounded-xl animate-pulse" /> : (
          <>
            {/* PIX / BOLETO / SAQUE */}
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th className="w-40">Método</th>
                    <th>Taxa do adquirente</th>
                  </tr>
                </thead>
                <tbody>
                  {(['PIX', 'BOLETO', 'WITHDRAWAL'] as const).map(m => {
                    const meta = PLATFORM_META[m];
                    const Icon = meta.icon;
                    return (
                      <tr key={m}>
                        <td>
                          <div className="flex items-center gap-2">
                            <Icon size={14} style={{ color: meta.color }} />
                            <span className="font-medium text-text">{meta.label}</span>
                          </div>
                        </td>
                        <td className="w-64">
                          <FeeInput
                            part={acquirer[m] ?? EMPTY_PART}
                            onChange={(p) => setAcquirerMethod(m, p)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* MDRs do cartão */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <CreditCard size={14} style={{ color: PLATFORM_META.CARD.color }} />
                <h4 className="font-semibold text-text text-sm">MDR do Cartão (por parcelamento)</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th className="w-40">Parcelamento</th>
                      <th>Taxa MDR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CARD_INSTALLMENTS.map(m => (
                      <tr key={m}>
                        <td className="font-medium text-text">{CARD_INSTALLMENT_LABEL[m]}</td>
                        <td className="w-64">
                          <FeeInput
                            part={acquirer[m] ?? EMPTY_PART}
                            onChange={(p) => setAcquirerMethod(m, p)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Custos fixos do cartão — Gateway e Antifraude */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck size={14} className="text-accent" />
                <h4 className="font-semibold text-text text-sm">Custos Fixos do Cartão</h4>
                <span className="text-[11px] text-text3">(somados a toda transação de cartão)</span>
              </div>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th className="w-40">Item</th>
                      <th>Valor fixo</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="font-medium text-text">Gateway</td>
                      <td className="w-64">
                        <FeeInput
                          part={acquirer.CARD_GATEWAY ?? EMPTY_PART}
                          onChange={(p) => setAcquirerMethod('CARD_GATEWAY', p)}
                          onlyFixed
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className="font-medium text-text">Antifraude</td>
                      <td className="w-64">
                        <FeeInput
                          part={acquirer.CARD_ANTIFRAUDE ?? EMPTY_PART}
                          onChange={(p) => setAcquirerMethod('CARD_ANTIFRAUDE', p)}
                          onlyFixed
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        <div className="flex justify-end pt-2 border-t border-border">
          <button
            onClick={() => save.mutate()}
            disabled={save.isPending || isLoading}
            className="btn-primary btn-sm flex items-center gap-1.5"
          >
            <Save size={13} />
            {save.isPending ? 'Salvando...' : 'Salvar todas as taxas'}
          </button>
        </div>
      </div>

      {/* BLOCO 3 — SIMULAÇÃO DE MARGEM */}
      {platform && acquirer && (
        <MarginSimulation platform={platform} acquirer={acquirer} />
      )}

      {/* BLOCO 4 — TAXAS PERSONALIZADAS POR USUÁRIO */}
      <CustomFeesSection platform={platform} />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// SIMULAÇÃO DE MARGEM
// ══════════════════════════════════════════════════════════════════

function MarginSimulation({ platform, acquirer }: {
  platform: Record<PlatformMethod, FeePart>;
  acquirer: Record<AcquirerMethod, FeePart>;
}) {
  const SAMPLE = 10000; // R$ 100

  const rows = useMemo(() => {
    const r: Array<{ key: string; label: string; platform: string; acquirer: string; margin: number }> = [];

    // PIX
    r.push({
      key     : 'PIX',
      label   : 'Pix',
      platform: formatPart(platform.PIX),
      acquirer: formatPart(acquirer.PIX),
      margin  : partToCents(platform.PIX, SAMPLE) - partToCents(acquirer.PIX, SAMPLE),
    });

    // Boleto
    r.push({
      key     : 'BOLETO',
      label   : 'Boleto',
      platform: formatPart(platform.BOLETO),
      acquirer: formatPart(acquirer.BOLETO),
      margin  : partToCents(platform.BOLETO, SAMPLE) - partToCents(acquirer.BOLETO, SAMPLE),
    });

    // Cartão (cada parcelamento) — espelha o que o backend cobra:
    // MDR_NX (parcela específica, com fallback no CARD genérico) + Gateway + Antifraude
    const acqGw = acquirer.CARD_GATEWAY;
    const acqAf = acquirer.CARD_ANTIFRAUDE;
    const acqGwAf = partToCents(acqGw, SAMPLE) + partToCents(acqAf, SAMPLE);

    const platGw = (platform as any).CARD_GATEWAY    as FeePart | undefined;
    const platAf = (platform as any).CARD_ANTIFRAUDE as FeePart | undefined;
    const platGwAf = partToCents(platGw || EMPTY_PART, SAMPLE) + partToCents(platAf || EMPTY_PART, SAMPLE);

    for (const m of CARD_INSTALLMENTS) {
      const mdr = acquirer[m];
      const acqTotal = partToCents(mdr, SAMPLE) + acqGwAf;
      const acqExtras = acqGwAf > 0 ? ` + R$ ${(acqGwAf / 100).toFixed(2).replace('.', ',')}` : '';

      // Plataforma: usa CARD_NX se setado, senão cai no CARD genérico
      const platPart = (platform as any)[m] as FeePart | undefined;
      const platMdr = platPart && (platPart.bps || platPart.cents) ? platPart : platform.CARD;
      const platTotal = partToCents(platMdr, SAMPLE) + platGwAf;
      const platExtras = platGwAf > 0 ? ` + R$ ${(platGwAf / 100).toFixed(2).replace('.', ',')}` : '';

      r.push({
        key     : m,
        label   : CARD_INSTALLMENT_LABEL[m],
        platform: `${formatPart(platMdr)}${platExtras}`,
        acquirer: `${formatPart(mdr)}${acqExtras}`,
        margin  : platTotal - acqTotal,
      });
    }

    // Saque
    r.push({
      key     : 'WITHDRAWAL',
      label   : 'Saque',
      platform: formatPart(platform.WITHDRAWAL),
      acquirer: formatPart(acquirer.WITHDRAWAL),
      margin  : partToCents(platform.WITHDRAWAL, SAMPLE) - partToCents(acquirer.WITHDRAWAL, SAMPLE),
    });

    return r;
  }, [platform, acquirer]);

  return (
    <div className="card space-y-3">
      <div className="flex items-center gap-2.5">
        <TrendingUp size={16} className="text-accent flex-shrink-0" />
        <div>
          <h3 className="font-semibold text-text">Simulação de Margem</h3>
          <p className="text-xs text-text3 mt-0.5">Lucro da plataforma em uma venda de <strong className="text-text">R$ 100,00</strong>.</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Método</th>
              <th>Taxa plataforma</th>
              <th>Taxa adquirente</th>
              <th>Margem</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.key}>
                <td className="text-text font-medium">{r.label}</td>
                <td className="text-text2 text-sm">{r.platform}</td>
                <td className="text-text3 text-xs">{r.acquirer}</td>
                <td>
                  <span className={`font-semibold ${r.margin < 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {r.margin >= 0 ? '+' : ''}{formatBRL(r.margin)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// TAXAS PERSONALIZADAS POR USUÁRIO
// ══════════════════════════════════════════════════════════════════

interface CustomFeeRowData {
  userId            : string;
  name              : string;
  email             : string;
  role              : 'PRODUCER' | 'AFFILIATE';
  customFees        : Partial<Record<PlatformMethod, FeePart>> | null;
  customPlatformBps : number | null;
}

function CustomFeesSection({ platform: _platform }: { platform: Record<PlatformMethod, FeePart> | null }) {
  const qc = useQueryClient();
  const [query, setQuery]           = useState('');
  const [onlyCustom, setOnlyCustom] = useState(true);
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'PRODUCER' | 'AFFILIATE'>('ALL');

  const { data: usersData } = useQuery<{ data: CustomFeeRowData[] }>({
    queryKey: ['admin-fees-users', query, onlyCustom, roleFilter],
    queryFn : () => api.get('/admin/fees/users', {
      params: {
        q         : query,
        onlyCustom: onlyCustom ? '1' : '0',
        role      : roleFilter === 'ALL' ? undefined : roleFilter,
      },
    }).then(r => r.data),
  });

  const saveOverride = useMutation({
    mutationFn: (vars: { userId: string; bps: number | null }) =>
      api.put(`/admin/fees/users/${vars.userId}/platform-bps`, { bps: vars.bps }),
    onSuccess: (res: any) => {
      toast.success(res?.data?.message || 'Taxa personalizada salva');
      qc.invalidateQueries({ queryKey: ['admin-fees-users'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erro ao salvar'),
  });

  return (
    <div className="card space-y-4">
      <div className="flex items-center gap-2.5">
        <Users size={16} className="text-accent flex-shrink-0" />
        <div>
          <h3 className="font-semibold text-text">Taxas Personalizadas por Usuário</h3>
          <p className="text-xs text-text3 mt-0.5">% única que substitui a taxa geral da plataforma para todos os métodos.</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text3" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome ou email..."
            className="input pl-9 h-9"
          />
        </div>

        <div className="inline-flex rounded-[7px] border border-border bg-bg overflow-hidden text-xs">
          {([
            { id: 'ALL',       label: 'Todos'     },
            { id: 'PRODUCER',  label: 'Produtor'  },
            { id: 'AFFILIATE', label: 'Afiliado'  },
          ] as const).map((r, i) => {
            const active = roleFilter === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setRoleFilter(r.id)}
                className={`px-3 py-1.5 font-semibold transition-colors ${
                  active ? 'bg-accent text-white' : 'text-text3 hover:text-text2'
                } ${i > 0 ? 'border-l border-border' : ''}`}
              >
                {r.label}
              </button>
            );
          })}
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
              <th>% da plataforma</th>
              <th className="w-40 text-right">Ações</th>
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
                <PlatformBpsRow
                  key={`${u.role}:${u.userId}`}
                  row={u}
                  onSave={(bps) => saveOverride.mutate({ userId: u.userId, bps })}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PlatformBpsRow({ row, onSave }: {
  row   : CustomFeeRowData;
  onSave: (bps: number | null) => void;
}) {
  const initialPct = row.customPlatformBps != null ? row.customPlatformBps / 100 : '';
  const [pct, setPct] = useState<string>(String(initialPct));
  useEffect(() => { setPct(String(initialPct)); }, [row.customPlatformBps]);

  const dirty = pct !== String(initialPct);
  const numericPct = pct.trim() === '' ? null : Number(pct);
  const validBps   = numericPct === null ? null : Math.round(numericPct * 100);
  const invalid    = numericPct !== null && (isNaN(numericPct) || numericPct < 0 || numericPct > 50);

  return (
    <tr>
      <td>
        <div className="text-text font-medium">{row.name}</div>
        <div className="text-text3 text-xs">{row.email}</div>
      </td>
      <td>
        <span className={row.role === 'PRODUCER' ? 'badge-blue' : 'badge-gray'}>
          {row.role === 'PRODUCER' ? 'Produtor' : 'Afiliado'}
        </span>
      </td>
      <td>
        <div className="flex items-center gap-2">
          <input
            type="number"
            step="0.5"
            min="0"
            max="50"
            value={pct}
            onChange={e => setPct(e.target.value)}
            placeholder="(usa geral)"
            className="input h-8 w-24"
          />
          <span className="text-text3 text-sm">%</span>
          {row.customPlatformBps != null && !dirty && (
            <span className="text-[11px] text-accent">override ativo</span>
          )}
          {invalid && <span className="text-[11px] text-red">0–50%</span>}
        </div>
      </td>
      <td>
        <div className="flex gap-2 justify-end">
          {row.customPlatformBps != null && (
            <button
              onClick={() => { if (confirm('Remover override deste usuário?')) onSave(null); }}
              className="btn-ghost btn-sm text-text3 hover:text-red-400"
              title="Remover override (volta a usar a taxa geral)"
            >
              <X size={14} />
            </button>
          )}
          <button
            onClick={() => onSave(validBps)}
            disabled={!dirty || invalid}
            className="btn-primary btn-sm flex items-center gap-1.5"
          >
            <Save size={13} /> Salvar
          </button>
        </div>
      </td>
    </tr>
  );
}

