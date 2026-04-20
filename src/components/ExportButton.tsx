import { useState } from 'react';
import {
  Download, X, FileSpreadsheet, Check,
  Loader2, Calendar, ChevronDown, ChevronUp,
} from 'lucide-react';
import api from '@/lib/api';
import type { DateRange } from '@/components/DateFilter';

// ── Tipos ──────────────────────────────────────────────────────

type Role = 'ADMIN' | 'PRODUCER' | 'AFFILIATE' | 'STAFF';

interface FieldDef {
  id      : string;
  label   : string;
  getValue: (row: any) => string;
}

interface ExportOption {
  id    : string;
  label : string;
  roles : Role[];
  fields: FieldDef[];
}

interface Props {
  dateRange: DateRange; // valor inicial — usuário pode trocar dentro do modal
  role     : Role;
}

// ── Utilitários CSV ────────────────────────────────────────────

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCSV(headers: string[], rows: string[][]): string {
  return [
    headers.map(escapeCell).join(','),
    ...rows.map(r => r.map(escapeCell).join(',')),
  ].join('\n');
}

function formatCents(cents: number | null | undefined): string {
  if (cents == null) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

function fmt(iso: string | null | undefined): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function downloadCSV(filename: string, content: string) {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function toISO(d: Date) { return d.toISOString().slice(0, 10); }

// ── Definição de campos por dataset (sem status) ───────────────

const DATASETS: ExportOption[] = [
  {
    id   : 'vendas',
    label: 'Vendas',
    roles: ['ADMIN', 'PRODUCER', 'AFFILIATE', 'STAFF'],
    fields: [
      { id: 'data',          label: 'Data',          getValue: o => fmt(o.createdAt) },
      { id: 'produto',       label: 'Produto',       getValue: o => o.offer?.product?.name ?? '' },
      { id: 'oferta',        label: 'Oferta',        getValue: o => o.offer?.name ?? '' },
      { id: 'valor',         label: 'Valor',         getValue: o => formatCents(o.amountCents) },
      { id: 'metodo',        label: 'Metodo pagamento', getValue: o => o.paymentMethod ?? '' },
      { id: 'afiliado',      label: 'Afiliado',      getValue: o => o.affiliate?.user?.name ?? '' },
      { id: 'cliente',       label: 'Cliente',       getValue: o => o.customerName ?? '' },
      { id: 'email_cliente', label: 'Email cliente', getValue: o => o.customerEmail ?? '' },
    ],
  },
  {
    id   : 'afiliados',
    label: 'Afiliados',
    roles: ['ADMIN', 'PRODUCER'],
    fields: [
      { id: 'nome',         label: 'Nome',            getValue: a => a.name ?? '' },
      { id: 'email',        label: 'E-mail',          getValue: a => a.email ?? '' },
      { id: 'codigo',       label: 'Codigo',          getValue: a => a.code ?? '' },
      { id: 'total_vendas', label: 'Total de vendas', getValue: a => String(a.vendas ?? 0) },
      { id: 'receita',      label: 'Receita gerada',  getValue: a => formatCents(a.receitaCents) },
    ],
  },
  {
    id   : 'produtos',
    label: 'Produtos',
    roles: ['ADMIN', 'PRODUCER'],
    fields: [
      { id: 'produto', label: 'Produto',       getValue: p => p.name ?? '' },
      { id: 'tipo',    label: 'Tipo',          getValue: p => p.type ?? '' },
      { id: 'vendas',  label: 'Vendas',        getValue: p => String(p.vendas ?? 0) },
      { id: 'receita', label: 'Receita total', getValue: p => formatCents(p.receitaCents) },
    ],
  },
  {
    id   : 'chargebacks',
    label: 'Chargebacks',
    roles: ['ADMIN', 'PRODUCER'],
    fields: [
      { id: 'data',    label: 'Data',    getValue: o => fmt(o.chargebackAt ?? o.updatedAt) },
      { id: 'produto', label: 'Produto', getValue: o => o.offer?.product?.name ?? '' },
      { id: 'valor',   label: 'Valor',   getValue: o => formatCents(o.amountCents) },
      { id: 'metodo',  label: 'Metodo',  getValue: o => o.paymentMethod ?? '' },
      { id: 'cliente', label: 'Cliente', getValue: o => o.customerName ?? '' },
    ],
  },
  {
    id   : 'splits',
    label: 'Splits financeiros',
    roles: ['ADMIN', 'PRODUCER', 'AFFILIATE'],
    fields: [
      { id: 'data',       label: 'Data',               getValue: s => fmt(s.createdAt) },
      { id: 'destinatario', label: 'Tipo destinatario', getValue: s => s.recipientType ?? '' },
      { id: 'valor',      label: 'Valor',              getValue: s => formatCents(s.amountCents) },
    ],
  },
  {
    id   : 'saques',
    label: 'Saques',
    roles: ['ADMIN', 'PRODUCER', 'AFFILIATE'],
    fields: [
      { id: 'data',       label: 'Data',          getValue: w => fmt(w.createdAt) },
      { id: 'valor',      label: 'Valor',         getValue: w => formatCents(w.amountCents) },
      { id: 'chave_pix',  label: 'Chave PIX',     getValue: w => w.pixKey ?? '' },
      { id: 'tipo_chave', label: 'Tipo de chave', getValue: w => w.pixKeyType ?? '' },
    ],
  },
];

// ── Fetch de dados brutos por dataset ─────────────────────────

async function fetchRaw(id: string, range: DateRange): Promise<any[]> {
  const qs = `startDate=${range.startDate}&endDate=${range.endDate}&limit=9999&status=APPROVED`;
  switch (id) {
    case 'vendas':
      return (await api.get(`/reports/sales?${qs}`)).data.data ?? [];
    case 'afiliados':
      return (await api.get('/reports/affiliates')).data ?? [];
    case 'produtos':
      return (await api.get('/reports/products')).data ?? [];
    case 'chargebacks':
      return (await api.get('/reports/chargebacks')).data ?? [];
    case 'splits': {
      const r = await api.get(`/financial/splits?${qs}`);
      return r.data.data ?? r.data ?? [];
    }
    case 'saques': {
      const r = await api.get('/financial/withdrawals?limit=9999');
      return r.data.data ?? r.data ?? [];
    }
    default: return [];
  }
}

// ── Presets de data (copiados do DateFilter, sem dependência) ──

const RELATIVE_PRESETS = [
  { label: 'Hoje',    days: 0  },
  { label: '7 dias',  days: 7  },
  { label: '15 dias', days: 15 },
  { label: '30 dias', days: 30 },
  { label: '90 dias', days: 90 },
];

function buildRelative(days: number, label: string): DateRange {
  const end = new Date(); const start = new Date();
  if (days > 0) start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);
  return { startDate: toISO(start), endDate: toISO(end), label };
}
function buildOntem(): DateRange {
  const d = new Date(); d.setDate(d.getDate() - 1);
  const iso = toISO(d); return { startDate: iso, endDate: iso, label: 'Ontem' };
}
function buildSemanaPassada(): DateRange {
  const today = new Date(); const dow = today.getDay();
  const sun = new Date(today); sun.setDate(today.getDate() - dow - 7);
  const sat = new Date(sun);  sat.setDate(sun.getDate() + 6);
  return { startDate: toISO(sun), endDate: toISO(sat), label: 'Semana passada' };
}
function buildTudo(): DateRange {
  return { startDate: '2020-01-01', endDate: toISO(new Date()), label: 'Tudo' };
}

const ABSOLUTE_PRESETS = [
  { label: 'Ontem',          build: buildOntem },
  { label: 'Semana passada', build: buildSemanaPassada },
  { label: 'Tudo',           build: buildTudo },
];

// ── Componente principal ───────────────────────────────────────

export default function ExportButton({ dateRange, role }: Props) {
  const available = DATASETS.filter(d => d.roles.includes(role));

  // estado do modal
  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState(false);

  // seleção de datasets
  const [selected, setSelected] = useState<Set<string>>(new Set(['vendas']));

  // campos selecionados por dataset — default: todos
  const [fieldSel, setFieldSel] = useState<Record<string, Set<string>>>(() =>
    Object.fromEntries(available.map(d => [d.id, new Set(d.fields.map(f => f.id))]))
  );

  // dataset expandido (para ver/ocultar campos)
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // data interna do modal — inicializa com a prop mas é independente
  const [exportRange, setExportRange] = useState<DateRange>(dateRange);
  const [customStart, setCustomStart] = useState(dateRange.startDate);
  const [customEnd,   setCustomEnd]   = useState(dateRange.endDate);

  // ── helpers ──────────────────────────────────────────────────

  function toggleDataset(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }

  function toggleExpanded(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleField(datasetId: string, fieldId: string) {
    setFieldSel(prev => {
      const cur  = new Set(prev[datasetId] ?? []);
      cur.has(fieldId) ? cur.delete(fieldId) : cur.add(fieldId);
      return { ...prev, [datasetId]: cur };
    });
  }

  function setAllFields(datasetId: string, all: boolean) {
    const dataset = available.find(d => d.id === datasetId);
    if (!dataset) return;
    setFieldSel(prev => ({
      ...prev,
      [datasetId]: all ? new Set(dataset.fields.map(f => f.id)) : new Set(),
    }));
  }

  function applyCustomDate() {
    if (!customStart || !customEnd) return;
    const fmt2 = (s: string) =>
      new Date(s + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    setExportRange({
      startDate: customStart,
      endDate  : customEnd,
      label    : `${fmt2(customStart)} a ${fmt2(customEnd)}`,
    });
  }

  // ── exportar ─────────────────────────────────────────────────

  async function handleExport() {
    if (selected.size === 0) return;
    setLoading(true);
    const ts       = new Date().toISOString().slice(0, 10);
    const rangeTag = exportRange.label.replace(/\s/g, '_').replace(/\//g, '-');

    try {
      for (const dataset of available.filter(d => selected.has(d.id))) {
        const rows       = await fetchRaw(dataset.id, exportRange);
        const selFields  = dataset.fields.filter(f => (fieldSel[dataset.id] ?? new Set()).has(f.id));
        if (selFields.length === 0) continue;

        const headers  = selFields.map(f => f.label);
        const csvRows  = rows.map(row => selFields.map(f => f.getValue(row)));
        const csv      = toCSV(headers, csvRows);
        downloadCSV(`kairos_${dataset.id}_${rangeTag}_${ts}.csv`, csv);

        await new Promise(r => setTimeout(r, 300));
      }
      setOpen(false);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Erro ao exportar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  // ── render ────────────────────────────────────────────────────

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-bg3 text-text2 hover:text-text hover:bg-bg3/80 transition-colors border border-border"
      >
        <Download size={12} className="text-text3" />
        Exportar planilha
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-bg2 rounded-2xl shadow-xl w-full max-w-lg border border-border flex flex-col max-h-[92vh]">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
              <div className="flex items-center gap-2">
                <FileSpreadsheet size={15} className="text-accent" />
                <h2 className="text-sm font-semibold text-text">Exportar planilha</h2>
              </div>
              <button onClick={() => setOpen(false)} className="text-text3 hover:text-text">
                <X size={15} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-5 space-y-6">

              {/* ── Periodo ──────────────────────────────────── */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Calendar size={12} className="text-text3" />
                  <p className="text-[10px] font-semibold text-text3 uppercase tracking-wide">
                    Periodo
                  </p>
                  <span className="text-[10px] text-accent font-medium ml-auto">
                    {exportRange.label}
                  </span>
                </div>

                {/* Presets relativos */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {RELATIVE_PRESETS.map(p => (
                    <button
                      key={p.label}
                      onClick={() => setExportRange(buildRelative(p.days, p.label))}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors border ${
                        exportRange.label === p.label
                          ? 'bg-accent border-accent text-white'
                          : 'border-border bg-bg3 text-text3 hover:border-accent/40 hover:text-text2'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                  {ABSOLUTE_PRESETS.map(p => (
                    <button
                      key={p.label}
                      onClick={() => setExportRange(p.build())}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors border ${
                        exportRange.label === p.label
                          ? 'bg-accent border-accent text-white'
                          : 'border-border bg-bg3 text-text3 hover:border-accent/40 hover:text-text2'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Custom */}
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={customStart}
                    onChange={e => setCustomStart(e.target.value)}
                    className="input py-1 px-2 text-[11px] flex-1"
                  />
                  <span className="text-text3 text-[11px]">a</span>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={e => setCustomEnd(e.target.value)}
                    className="input py-1 px-2 text-[11px] flex-1"
                  />
                  <button
                    onClick={applyCustomDate}
                    disabled={!customStart || !customEnd}
                    className="btn-secondary text-[11px] py-1 px-2.5 disabled:opacity-40 flex-shrink-0"
                  >
                    Aplicar
                  </button>
                </div>
              </div>

              {/* ── Dados e campos ────────────────────────────── */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-semibold text-text3 uppercase tracking-wide">
                    Dados e campos
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelected(new Set(available.map(d => d.id)))}
                      className="text-[10px] text-accent hover:underline"
                    >
                      Selecionar tudo
                    </button>
                    <span className="text-border">·</span>
                    <button
                      onClick={() => setSelected(new Set())}
                      className="text-[10px] text-text3 hover:text-text hover:underline"
                    >
                      Limpar
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {available.map(dataset => {
                    const isChecked  = selected.has(dataset.id);
                    const isExpanded = expanded.has(dataset.id);
                    const selCount   = (fieldSel[dataset.id]?.size ?? 0);
                    const totalCount = dataset.fields.length;

                    return (
                      <div
                        key={dataset.id}
                        className={`rounded-xl border transition-colors ${
                          isChecked ? 'border-accent/40 bg-accent/5' : 'border-border bg-bg3'
                        }`}
                      >
                        {/* Linha principal do dataset */}
                        <div className="flex items-center gap-3 p-3">
                          {/* Checkbox dataset */}
                          <button
                            type="button"
                            onClick={() => toggleDataset(dataset.id)}
                            className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                              isChecked ? 'bg-accent border-accent' : 'border-border hover:border-accent/50'
                            }`}
                          >
                            {isChecked && <Check size={10} className="text-white" />}
                          </button>

                          {/* Label */}
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-semibold ${isChecked ? 'text-text' : 'text-text2'}`}>
                              {dataset.label}
                            </p>
                            {isChecked && (
                              <p className="text-[10px] text-text3 mt-0.5">
                                {selCount === totalCount
                                  ? 'Todos os campos'
                                  : `${selCount} de ${totalCount} campos`}
                              </p>
                            )}
                          </div>

                          {/* Botão expandir campos (só quando selecionado) */}
                          {isChecked && (
                            <button
                              type="button"
                              onClick={() => toggleExpanded(dataset.id)}
                              className="flex items-center gap-1 text-[10px] text-text3 hover:text-text transition-colors flex-shrink-0"
                            >
                              {isExpanded ? (
                                <><ChevronUp size={12} /> Ocultar campos</>
                              ) : (
                                <><ChevronDown size={12} /> Editar campos</>
                              )}
                            </button>
                          )}
                        </div>

                        {/* Painel de campos (expansível) */}
                        {isChecked && isExpanded && (
                          <div className="px-3 pb-3 border-t border-border/60 pt-3">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-[10px] text-text3">Escolha os campos a incluir:</p>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setAllFields(dataset.id, true)}
                                  className="text-[10px] text-accent hover:underline"
                                >
                                  Todos
                                </button>
                                <span className="text-border">·</span>
                                <button
                                  onClick={() => setAllFields(dataset.id, false)}
                                  className="text-[10px] text-text3 hover:text-text hover:underline"
                                >
                                  Nenhum
                                </button>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {dataset.fields.map(field => {
                                const fieldOn = fieldSel[dataset.id]?.has(field.id) ?? false;
                                return (
                                  <button
                                    key={field.id}
                                    type="button"
                                    onClick={() => toggleField(dataset.id, field.id)}
                                    className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-medium transition-colors border ${
                                      fieldOn
                                        ? 'bg-accent/10 border-accent/40 text-accent'
                                        : 'bg-bg2 border-border text-text3 hover:border-accent/30'
                                    }`}
                                  >
                                    <div
                                      className={`w-3 h-3 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                                        fieldOn ? 'bg-accent border-accent' : 'border-border'
                                      }`}
                                    >
                                      {fieldOn && <Check size={8} className="text-white" />}
                                    </div>
                                    {field.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {selected.size > 0 && (
                  <p className="text-[11px] text-text3 mt-3">
                    {selected.size} {selected.size === 1 ? 'arquivo CSV sera gerado' : 'arquivos CSV serao gerados'}.
                  </p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-2 px-5 py-4 border-t border-border flex-shrink-0">
              <button
                onClick={handleExport}
                disabled={selected.size === 0 || loading}
                className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-40 text-[12px]"
              >
                {loading
                  ? <><Loader2 size={13} className="animate-spin" /> Exportando...</>
                  : <><Download size={13} /> Exportar {selected.size > 0 ? `(${selected.size})` : ''}</>
                }
              </button>
              <button onClick={() => setOpen(false)} disabled={loading} className="btn-secondary text-[12px]">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
