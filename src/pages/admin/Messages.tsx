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
import { MessageSquareHeart, PartyPopper, Eye, EyeOff, Save } from 'lucide-react';

const DEFAULT_PROMOTED_MESSAGE =
  '<p>🎉 Parabéns! Você agora é um <strong>produtor</strong> na Kairos Way.</p>' +
  '<p>Você já pode cadastrar seus próprios produtos e gerenciar ofertas. Bons negócios!</p>';

export default function AdminMessages() {
  const qc = useQueryClient();

  // ── Estado: Mensagem de Compra ────────────────────────────────
  const [purchaseMsg,   setPurchaseMsg]   = useState(DEFAULT_SUCCESS_MESSAGE);
  const [purchaseIcon,  setPurchaseIcon]  = useState(DEFAULT_SUCCESS_ICON);
  const [purchaseColor, setPurchaseColor] = useState(DEFAULT_SUCCESS_COLOR);
  const [purchasePreview, setPurchasePreview] = useState(false);

  // ── Estado: Mensagem de Parabéns (Afiliado → Produtor) ────────
  const [promotedMsg, setPromotedMsg]         = useState(DEFAULT_PROMOTED_MESSAGE);
  const [promotedPreview, setPromotedPreview] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn : () => api.get('/admin/settings').then(r => r.data),
  });

  useEffect(() => {
    if (!settings) return;
    const purchase = settings.checkout_success_message ?? {};
    if (purchase.html  !== undefined) setPurchaseMsg(purchase.html);
    if (purchase.icon  !== undefined) setPurchaseIcon(purchase.icon);
    if (purchase.color !== undefined) setPurchaseColor(purchase.color);

    const promoted = settings.affiliate_promoted_message ?? {};
    if (promoted.html !== undefined) setPromotedMsg(promoted.html);
  }, [settings]);

  const savePurchase = useMutation({
    mutationFn: () => api.patch('/admin/settings', {
      checkout_success_message: { html: purchaseMsg, icon: purchaseIcon, color: purchaseColor },
    }),
    onSuccess: () => { toast.success('Mensagem de compra salva!'); qc.invalidateQueries({ queryKey: ['admin-settings'] }); },
    onError  : () => toast.error('Erro ao salvar'),
  });

  const savePromoted = useMutation({
    mutationFn: () => api.patch('/admin/settings', {
      affiliate_promoted_message: { html: promotedMsg },
    }),
    onSuccess: () => { toast.success('Mensagem de promoção salva!'); qc.invalidateQueries({ queryKey: ['admin-settings'] }); },
    onError  : () => toast.error('Erro ao salvar'),
  });

  const PreviewIcon = ICON_MAP[purchaseIcon] ?? ICON_MAP[DEFAULT_SUCCESS_ICON];
  const hexA = (c: string, a: string) => `${c}${a}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mensagens da Plataforma"
        sub="Mensagens automáticas exibidas em momentos-chave da jornada do usuário"
      />

      {/* ══════════════════════════════════════════════════════════ */}
      {/* 1) MENSAGEM DE COMPRA CONFIRMADA                           */}
      {/* ══════════════════════════════════════════════════════════ */}
      <div className="card space-y-6">
        <div className="flex items-center gap-2.5">
          <MessageSquareHeart size={16} className="text-accent flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-text">Mensagem de Compra Confirmada — Padrão</h3>
            <p className="text-xs text-text3 mt-0.5">Exibida na tela de confirmação após toda venda aprovada. Produtores podem personalizar por produto.</p>
          </div>
        </div>

        {isLoading ? <div className="h-48 bg-bg3 rounded-xl animate-pulse" /> : (
          <>
            {/* Ícone */}
            <div>
              <label className="label mb-3">Ícone de confirmação</label>
              {ICON_OPTIONS.map(group => (
                <div key={group.group} className="mb-4">
                  <p className="text-[11px] font-semibold text-text3 uppercase tracking-wider mb-2">{group.group}</p>
                  <div className="flex flex-wrap gap-2">
                    {group.items.map(opt => {
                      const Ic = ICON_MAP[opt.id];
                      const active = purchaseIcon === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          title={opt.label}
                          onClick={() => setPurchaseIcon(opt.id)}
                          className={`flex flex-col items-center gap-1 px-3 py-2.5 rounded-xl border transition-all ${
                            active
                              ? 'border-accent/60 bg-accent/10 text-text'
                              : 'border-border bg-bg3 text-text3 hover:border-border/80 hover:text-text2'
                          }`}
                        >
                          <Ic size={20} style={active ? { color: purchaseColor } : undefined} strokeWidth={1.5} />
                          <span className="text-[10px] leading-none">{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Cor */}
            <div>
              <label className="label mb-3">Cor do ícone</label>
              <div className="flex flex-wrap gap-2.5">
                {COLOR_OPTIONS.map(c => (
                  <button
                    key={c.hex}
                    type="button"
                    title={c.label}
                    onClick={() => setPurchaseColor(c.hex)}
                    className={`w-9 h-9 rounded-full border-2 transition-all hover:scale-110 ${
                      purchaseColor === c.hex ? 'border-white scale-110 shadow-lg' : 'border-transparent'
                    }`}
                    style={{ background: c.hex }}
                  />
                ))}
              </div>
            </div>

            {/* Preview ícone */}
            <div className="bg-bg3 rounded-2xl p-4 flex items-center gap-4">
              <div className="relative flex-shrink-0">
                <div className="absolute inset-0 rounded-full" style={{ background: hexA(purchaseColor, '18') }} />
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center relative border"
                  style={{ background: hexA(purchaseColor, '20'), borderColor: hexA(purchaseColor, '40') }}
                >
                  <PreviewIcon size={26} strokeWidth={1.5} style={{ color: purchaseColor }} />
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-text">Pré-visualização do ícone</p>
                <p className="text-xs text-text3 mt-0.5">
                  {ICON_OPTIONS.flatMap(g => g.items).find(i => i.id === purchaseIcon)?.label ?? purchaseIcon} · {COLOR_OPTIONS.find(c => c.hex === purchaseColor)?.label ?? purchaseColor}
                </p>
              </div>
            </div>

            {/* Texto */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label mb-0">Mensagem de Pós-Venda</label>
                <button
                  type="button"
                  onClick={() => setPurchasePreview(p => !p)}
                  className="flex items-center gap-1.5 text-xs text-text2 hover:text-text transition-colors"
                >
                  {purchasePreview ? <EyeOff size={13} /> : <Eye size={13} />}
                  {purchasePreview ? 'Editar' : 'Pré-visualizar'}
                </button>
              </div>

              {purchasePreview ? (
                <div
                  className="rich-content border border-border rounded-xl px-4 py-3 bg-bg text-sm leading-relaxed"
                  style={{ minHeight: 160 }}
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(purchaseMsg) || '<p style="color:var(--text3);font-style:italic">Sem mensagem.</p>' }}
                />
              ) : (
                <RichTextEditor
                  value={purchaseMsg}
                  onChange={setPurchaseMsg}
                  placeholder="Ex: Muito obrigado pela sua compra!..."
                  minHeight={160}
                />
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <p className="text-xs text-text3">
                Produtores podem personalizar por produto na aba <strong className="text-text2">Pós-Venda</strong>.
              </p>
              <button
                onClick={() => savePurchase.mutate()}
                disabled={savePurchase.isPending}
                className="btn-primary btn-sm flex items-center gap-1.5"
              >
                <Save size={13} />
                {savePurchase.isPending ? 'Salvando...' : 'Salvar mensagem de compra'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* 2) MENSAGEM DE PARABÉNS (AFILIADO → PRODUTOR)              */}
      {/* ══════════════════════════════════════════════════════════ */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2.5">
          <PartyPopper size={16} className="text-accent flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-text">Mensagem de Parabéns — Afiliado virou Produtor</h3>
            <p className="text-xs text-text3 mt-0.5">Exibida ao afiliado quando ele é promovido a produtor (pode cadastrar produtos).</p>
          </div>
        </div>

        {isLoading ? <div className="h-40 bg-bg3 rounded-xl animate-pulse" /> : (
          <>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label mb-0">Conteúdo da mensagem</label>
                <button
                  type="button"
                  onClick={() => setPromotedPreview(p => !p)}
                  className="flex items-center gap-1.5 text-xs text-text2 hover:text-text transition-colors"
                >
                  {promotedPreview ? <EyeOff size={13} /> : <Eye size={13} />}
                  {promotedPreview ? 'Editar' : 'Pré-visualizar'}
                </button>
              </div>

              {promotedPreview ? (
                <div
                  className="rich-content border border-border rounded-xl px-4 py-3 bg-bg text-sm leading-relaxed"
                  style={{ minHeight: 140 }}
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(promotedMsg) || '<p style="color:var(--text3);font-style:italic">Sem mensagem.</p>' }}
                />
              ) : (
                <RichTextEditor
                  value={promotedMsg}
                  onChange={setPromotedMsg}
                  placeholder="Parabéns! Você agora é produtor..."
                  minHeight={140}
                />
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-border">
              <button
                onClick={() => savePromoted.mutate()}
                disabled={savePromoted.isPending}
                className="btn-primary btn-sm flex items-center gap-1.5"
              >
                <Save size={13} />
                {savePromoted.isPending ? 'Salvando...' : 'Salvar mensagem de promoção'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
