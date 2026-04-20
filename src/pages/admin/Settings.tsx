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
import { MessageSquareHeart, Eye, EyeOff, Save } from 'lucide-react';

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
