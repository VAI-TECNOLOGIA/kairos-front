import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui';
import { RichTextEditor, sanitizeHtml } from '@/components/RichTextEditor';
import {
  ICON_MAP, ICON_OPTIONS, COLOR_OPTIONS,
  DEFAULT_SUCCESS_ICON, DEFAULT_SUCCESS_COLOR,
} from '@/lib/successConfig';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Save, Info, RotateCcw, MapPin } from 'lucide-react';

export default function CheckoutConfig() {
  const qc = useQueryClient();
  const [msg,            setMsg]            = useState('');
  const [icon,           setIcon]           = useState(DEFAULT_SUCCESS_ICON);
  const [color,          setColor]          = useState(DEFAULT_SUCCESS_COLOR);
  const [requireAddress, setRequireAddress] = useState(true);
  const [preview,        setPreview]        = useState(false);
  const [dirty,          setDirty]          = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['producer-checkout-config'],
    queryFn : () => api.get('/producers/checkout-config').then(r => r.data),
  });

  useEffect(() => {
    if (!data) return;
    setMsg(data.html   ?? '');
    setIcon(data.icon  ?? DEFAULT_SUCCESS_ICON);
    setColor(data.color ?? DEFAULT_SUCCESS_COLOR);
    setRequireAddress(data.requireAddress !== false);
    setDirty(false);
  }, [data]);

  const save = useMutation({
    mutationFn: () => api.patch('/producers/checkout-config', { html: msg, icon, color, requireAddress }),
    onSuccess : () => { toast.success('Configuração salva!'); qc.invalidateQueries({ queryKey: ['producer-checkout-config'] }); setDirty(false); },
    onError   : () => toast.error('Erro ao salvar'),
  });

  const reset = () => {
    setMsg(''); setIcon(DEFAULT_SUCCESS_ICON); setColor(DEFAULT_SUCCESS_COLOR);
    setRequireAddress(true);
    setPreview(false); setDirty(true);
  };

  const PreviewIcon = ICON_MAP[icon] ?? ICON_MAP[DEFAULT_SUCCESS_ICON];
  const hexA = (a: string) => `${color}${a}`;

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          title="Checkout Builder"
          sub="Configure a tela de parabéns exibida após cada compra aprovada"
        />
        <div className="flex items-center gap-2 flex-shrink-0 pt-1">
          {dirty && (
            <button onClick={reset} className="btn-ghost btn-sm flex items-center gap-1.5">
              <RotateCcw size={13} /> Resetar
            </button>
          )}
          <button
            onClick={() => save.mutate()}
            disabled={save.isPending || !dirty}
            className="btn-primary btn-sm flex items-center gap-1.5 disabled:opacity-50"
          >
            <Save size={13} />
            {save.isPending ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>

      {/* Info hierarquia */}
      <div className="flex items-start gap-2.5 bg-accent/5 border border-accent/20 rounded-xl p-3.5">
        <Info size={14} className="text-accent flex-shrink-0 mt-0.5" />
        <p className="text-xs text-text2 leading-relaxed">
          Esta configuração define o padrão para <strong className="text-text">todos os seus produtos</strong>.
          Produtos individuais podem sobrescrever na aba <strong className="text-text">Pós-Venda</strong> da edição do produto.
          Caso deixe em branco, será usada a mensagem padrão da plataforma.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="h-32 bg-bg3 rounded-xl animate-pulse" />
          <div className="h-10 bg-bg3 rounded-xl animate-pulse" />
          <div className="h-48 bg-bg3 rounded-xl animate-pulse" />
        </div>
      ) : (
        <>
          {/* ── Ícone ─────────────────────────────────────────────── */}
          <div className="card space-y-4">
            <h3 className="font-semibold text-text text-sm">Ícone de confirmação</h3>

            {ICON_OPTIONS.map(group => (
              <div key={group.group}>
                <p className="text-[11px] font-semibold text-text3 uppercase tracking-wider mb-2">{group.group}</p>
                <div className="flex flex-wrap gap-2">
                  {group.items.map(opt => {
                    const Ic     = ICON_MAP[opt.id];
                    const active = icon === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        title={opt.label}
                        onClick={() => { setIcon(opt.id); setDirty(true); }}
                        className={`flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-xl border transition-all ${
                          active
                            ? 'border-accent/60 bg-accent/10 text-text shadow-sm'
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

          {/* ── Cor + Preview ──────────────────────────────────────── */}
          <div className="card space-y-4">
            <h3 className="font-semibold text-text text-sm">Cor do ícone</h3>

            <div className="flex flex-wrap gap-3">
              {COLOR_OPTIONS.map(c => (
                <button
                  key={c.hex}
                  type="button"
                  title={c.label}
                  onClick={() => { setColor(c.hex); setDirty(true); }}
                  className={`w-10 h-10 rounded-full border-2 transition-all hover:scale-110 ${
                    color === c.hex ? 'border-white scale-110 shadow-lg' : 'border-transparent'
                  }`}
                  style={{ background: c.hex }}
                />
              ))}
            </div>

            {/* Preview vivo */}
            <div className="flex items-center gap-4 bg-bg3 rounded-2xl p-4 border border-border">
              <div className="relative flex-shrink-0">
                <div className="absolute inset-0 rounded-full animate-ping" style={{ background: hexA('18'), animationDuration: '2.5s' }} />
                <div className="w-16 h-16 rounded-full flex items-center justify-center relative border" style={{ background: hexA('22'), borderColor: hexA('44') }}>
                  <PreviewIcon size={30} strokeWidth={1.5} style={{ color }} />
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-text">Parabéns!</p>
                <p className="text-xs text-text3 mt-0.5">Compra aprovada</p>
                <p className="text-xs mt-1" style={{ color }}>
                  {ICON_OPTIONS.flatMap(g => g.items).find(i => i.id === icon)?.label} · {COLOR_OPTIONS.find(c => c.hex === color)?.label}
                </p>
              </div>
            </div>
          </div>

          {/* ── Coleta de endereço ─────────────────────────────────── */}
          <div className="card space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-2.5 min-w-0">
                <MapPin size={16} className="text-text2 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                <div className="min-w-0">
                  <h3 className="font-semibold text-text text-sm">Solicitar endereço no checkout</h3>
                  <p className="text-xs text-text3 mt-0.5 leading-relaxed">
                    Quando desligado, o cliente não precisa preencher endereço para pagar com Pix ou Cartão em produtos digitais.
                    <br />
                    <span className="text-text3/80">Boleto e produtos físicos sempre exigem endereço (não dá pra desligar).</span>
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 mt-1">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={requireAddress}
                  onChange={e => { setRequireAddress(e.target.checked); setDirty(true); }}
                />
                <div className="w-11 h-6 bg-bg3 border border-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-text after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent/30 peer-checked:border-accent/60" />
              </label>
            </div>
          </div>

          {/* ── Mensagem ───────────────────────────────────────────── */}
          <div className="card space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-text text-sm">Mensagem de Pós-Venda</h3>
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
                className="rich-content border border-border rounded-xl px-4 py-4 bg-bg text-sm leading-relaxed"
                style={{ minHeight: 160 }}
                dangerouslySetInnerHTML={{
                  __html: sanitizeHtml(msg) || '<p style="color:var(--text3);font-style:italic">Sem mensagem — será usada a mensagem padrão da plataforma.</p>',
                }}
              />
            ) : (
              <RichTextEditor
                value={msg}
                onChange={v => { setMsg(v); setDirty(true); }}
                placeholder="Ex: Muito obrigado pela sua compra! Fique à vontade para entrar em contato caso precise de ajuda."
                minHeight={160}
              />
            )}

            {msg && (
              <button
                type="button"
                onClick={() => { setMsg(''); setDirty(true); }}
                className="text-xs text-text3 hover:text-red transition-colors"
              >
                Limpar mensagem (usar padrão da plataforma)
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
