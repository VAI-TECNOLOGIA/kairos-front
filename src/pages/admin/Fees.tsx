import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Save, Percent, TrendingUp, Users, Search, X } from 'lucide-react';
import pagarmeLogo from '@/assets/pagarme.png';

// ── TIPOS ─────────────────────────────────────────────────────────

const ACQUIRERS = ['PAGARME'] as const;
type Acquirer = typeof ACQUIRERS[number];

const ACQUIRER_BRAND: Record<Acquirer, { name: string; color: string; logo: string }> = {
  PAGARME: { name: 'Pagar.me', color: '#08ac54', logo: pagarmeLogo },
};

interface FeesData {
  platformBps: number;
  platformPct: number;
  acquirers  : Record<Acquirer, { cents: number }>;
}

interface CustomFeeRow {
  userId      : string;
  name        : string;
  email       : string;
  role        : 'PRODUCER' | 'AFFILIATE';
  customFeeBps: number | null;
}

// ── HELPERS ───────────────────────────────────────────────────────

function bpsToPct(bps: number): string  { return (bps / 100).toFixed(2); }
function pctToBps(pct: string): number  {
  const n = parseFloat(pct.replace(',', '.'));
  if (isNaN(n) || n < 0) return 0;
  return Math.round(n * 100);
}
function centsToReais(cents: number): string { return (cents / 100).toFixed(2); }
function reaisToCents(reais: string): number {
  const n = parseFloat(reais.replace(',', '.'));
  if (isNaN(n) || n < 0) return 0;
  return Math.round(n * 100);
}

// ── PÁGINA ────────────────────────────────────────────────────────

export default function AdminFees() {
  const qc = useQueryClient();

  const { data: fees, isLoading } = useQuery<FeesData>({
    queryKey: ['admin-fees'],
    queryFn : () => api.get('/admin/fees').then(r => r.data),
  });

  const [platformPct,   setPlatformPct]   = useState('');
  const [acquirerReais, setAcquirerReais] = useState<Record<Acquirer, string>>({ PAGARME: '' });

  useEffect(() => {
    if (!fees) return;
    setPlatformPct(bpsToPct(fees.platformBps));
    setAcquirerReais({
      PAGARME: centsToReais(fees.acquirers.PAGARME?.cents ?? 0),
    });
  }, [fees]);

  const save = useMutation({
    mutationFn: () => api.post('/admin/fees', {
      platformBps: pctToBps(platformPct),
      acquirers  : { PAGARME: reaisToCents(acquirerReais.PAGARME) },
    }),
    onSuccess: () => { toast.success('Taxas atualizadas!'); qc.invalidateQueries({ queryKey: ['admin-fees'] }); },
    onError  : () => toast.error('Erro ao salvar taxas'),
  });

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
    <div className="space-y-6">
      <PageHeader title="Taxas e Comissões" sub="Configuração da taxa geral, adquirentes e taxas personalizadas por usuário" />

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
            <p className="text-xs text-text3 mt-0.5">Valor fixo em R$ cobrado por transação. Lucro por venda = (taxa plataforma × valor) − taxa adquirente.</p>
          </div>
        </div>

        {isLoading ? <div className="h-32 bg-bg3 rounded-xl animate-pulse" /> : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Adquirente</th>
                  <th>Taxa cobrada (R$ por transação)</th>
                  <th>Lucro da plataforma (por venda de R$ 100)</th>
                </tr>
              </thead>
              <tbody>
                {ACQUIRERS.map(acq => {
                  const brand = ACQUIRER_BRAND[acq];
                  const acqCents = reaisToCents(acquirerReais[acq]);
                  const EXAMPLE_SALE = 10000;
                  const platformGain = Math.round(EXAMPLE_SALE * platformBpsNow / 10000);
                  const profitCents  = platformGain - acqCents;
                  const isLoss       = profitCents < 0;
                  return (
                    <tr key={acq}>
                      <td>
                        <div className="flex items-center gap-2.5">
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
                      </td>
                      <td className="w-56">
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text3 text-xs">R$</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={acquirerReais[acq]}
                            onChange={(e) => setAcquirerReais(prev => ({ ...prev, [acq]: e.target.value }))}
                            className="input pl-9 h-9"
                            placeholder="0,01"
                          />
                        </div>
                      </td>
                      <td>
                        <span className={`font-semibold ${isLoss ? 'text-red-400' : 'text-green-400'}`}>
                          {profitCents >= 0 ? '+' : ''}R$ {(profitCents / 100).toFixed(2)}
                        </span>
                        <span className="text-text3 text-xs ml-2">
                          ({(platformBpsNow / 100).toFixed(2)}% − R$ {(acqCents / 100).toFixed(2)})
                        </span>
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
    </div>
  );
}

function CustomFeeRow({
  row, onSave, onReset,
}: {
  row    : CustomFeeRow;
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
