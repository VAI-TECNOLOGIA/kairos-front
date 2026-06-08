import { useOutletContext, Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { publicOrigin } from '@/lib/share-url';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Copy, Construction, ShoppingBag, Activity, Link2, Users, Lock, MapPin, Save } from 'lucide-react';

function useIsAffiliateArea() {
  return useLocation().pathname.startsWith('/afiliado/');
}

function PlaceholderSection({ icon: Icon, title, description, ctaText, ctaTo }: any) {
  return (
    <div className="space-y-3">
      <h2 className="text-base font-semibold text-text">{title}</h2>
      <div className="card p-8 text-center text-text3">
        <Icon size={32} className="mx-auto mb-3 opacity-40" />
        <p className="text-sm mb-2">{description}</p>
        {ctaText && ctaTo && (
          <Link to={ctaTo} className="text-accent text-xs hover:underline">{ctaText} →</Link>
        )}
        {!ctaText && (
          <div className="inline-flex items-center gap-1.5 text-[10px] text-amber bg-amber/10 px-2 py-1 rounded mt-2">
            <Construction size={11} /> Em breve
          </div>
        )}
      </div>
    </div>
  );
}

export function ProductCheckoutSection() {
  const { product } = useOutletContext<{ product: any }>();
  const qc = useQueryClient();
  const isAffiliateArea = useIsAffiliateArea();

  // requireAddress mora em product.metadata.requireAddress; default true
  const initial = (product?.metadata as any)?.requireAddress !== false;
  const [requireAddress, setRequireAddress] = useState(initial);
  const [dirty, setDirty] = useState(false);

  useEffect(() => { setRequireAddress(initial); setDirty(false); }, [product?.id, initial]);

  const save = useMutation({
    mutationFn: () => api.patch(`/products/${product.id}`, { requireAddress }),
    onSuccess : () => {
      toast.success('Configuração salva!');
      qc.invalidateQueries({ queryKey: ['producer-product', product.id] });
      setDirty(false);
    },
    onError: () => toast.error('Erro ao salvar'),
  });

  // PHYSICAL sempre exige endereço pra envio — toggle fica desabilitado
  const isPhysical = product?.type === 'PHYSICAL';

  return (
    <div className="space-y-3">
      <h2 className="text-base font-semibold text-text">Personalizar checkout</h2>

      {/* ── Coleta de endereço ──────────────────────────────────── */}
      <div className="card p-4 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-2.5 min-w-0">
            <MapPin size={16} className="text-text2 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
            <div className="min-w-0">
              <h3 className="font-semibold text-text text-sm">Solicitar endereço no checkout</h3>
              <p className="text-xs text-text3 mt-0.5 leading-relaxed">
                {isPhysical
                  ? 'Produtos físicos exigem endereço para envio — não dá pra desligar.'
                  : 'Quando desligado, o cliente não precisa preencher endereço para pagar com Pix ou Cartão.'}
                <br />
                <span className="text-text3/80">Boleto sempre exige endereço (regra do Pagar.me).</span>
              </p>
            </div>
          </div>
          <label className={`relative inline-flex items-center flex-shrink-0 mt-1 ${isAffiliateArea || isPhysical ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
            <input
              type="checkbox"
              className="sr-only peer"
              checked={isPhysical ? true : requireAddress}
              disabled={isAffiliateArea || isPhysical}
              onChange={e => { setRequireAddress(e.target.checked); setDirty(true); }}
            />
            <div className="w-11 h-6 bg-bg3 border border-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-text after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent/30 peer-checked:border-accent/60" />
          </label>
        </div>

        {!isAffiliateArea && !isPhysical && (
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={() => save.mutate()}
              disabled={!dirty || save.isPending}
              className="btn-primary btn-sm flex items-center gap-1.5 disabled:opacity-50"
            >
              <Save size={13} />
              {save.isPending ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        )}
      </div>

      {/* ── Restante (placeholder) ──────────────────────────────── */}
      <div className="card p-8 text-center text-text3">
        <ShoppingBag size={32} className="mx-auto mb-3 opacity-40" />
        <p className="text-sm mb-2">Mais personalizações (cores, banner, order bump, upsell) em breve.</p>
        <div className="inline-flex items-center gap-1.5 text-[10px] text-amber bg-amber/10 px-2 py-1 rounded mt-2">
          <Construction size={11} /> Em breve
        </div>
      </div>
    </div>
  );
}

export function ProductCoproducersSection() {
  const { product } = useOutletContext<{ product: any }>();
  const list: any[] = product?.coproducers || [];
  const isAffiliateArea = useIsAffiliateArea();
  return (
    <div className="space-y-3">
      <h2 className="text-base font-semibold text-text">Co produtores</h2>
      <div className="card p-4">
        {list.length === 0 ? (
          <div className="text-center text-text3 py-6">
            <Users size={28} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">Nenhum co-produtor neste produto.</p>
            {!isAffiliateArea && (
              <Link to="/produtor/coprodutores" className="text-accent text-xs hover:underline mt-1 inline-block">Gerenciar parceiros</Link>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {list.map((c: any) => (
              <div key={c.id} className="flex items-center justify-between bg-bg3 rounded p-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent text-xs font-bold">
                    {c.coproducer?.user?.name?.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm text-text">{c.coproducer?.user?.name}</div>
                    <div className="text-xs text-text3">{c.coproducer?.user?.email}</div>
                  </div>
                </div>
                <span className="text-xs text-text2 bg-bg2 px-2 py-1 rounded">{(c.commissionBps / 100).toFixed(2)}%</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function ProductLinksSection() {
  const { product } = useOutletContext<{ product: any }>();
  const offers: any[] = product?.offers || [];
  const isApproved = product?.status === 'APPROVED';
  return (
    <div className="space-y-3">
      <h2 className="text-base font-semibold text-text">Links de divulgação</h2>
      {!isApproved && (
        <div className="card p-3 bg-amber/10 border border-amber/30 flex items-start gap-2 text-sm text-amber">
          <Lock size={14} className="flex-shrink-0 mt-0.5" />
          <div>
            <strong>Aguardando aprovação</strong> — Os links de checkout e convite de afiliação só funcionam depois que o admin aprovar o produto.
          </div>
        </div>
      )}
      <div className="space-y-2">
        {offers.length === 0 ? (
          <div className="card p-6 text-center text-text3">
            <Link2 size={24} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">Crie uma oferta primeiro pra gerar os links.</p>
          </div>
        ) : (
          offers.map((o: any) => {
            const url = `${publicOrigin()}/checkout/${o.slug}`;
            const inviteUrl = `${publicOrigin()}/afiliar/${o.slug}`;
            return (
              <div key={o.id} className={`card p-3 space-y-2 ${!isApproved ? 'opacity-60' : ''}`}>
                <div className="text-sm font-medium text-text">{o.name}</div>
                <div>
                  <div className="text-[10px] text-text3 uppercase mb-1 flex items-center gap-1">
                    Checkout
                    {!isApproved && <span className="text-amber normal-case inline-flex items-center gap-1 ml-1"><Lock size={9} /> bloqueado</span>}
                  </div>
                  {isApproved ? (
                    <div className="flex items-center justify-between gap-2 bg-bg3 rounded p-2">
                      <code className="text-xs text-text2 font-mono truncate flex-1">{url}</code>
                      <button onClick={() => { navigator.clipboard.writeText(url); toast.success('Copiado'); }} className="btn-ghost btn-sm flex-shrink-0"><Copy size={11} /></button>
                    </div>
                  ) : (
                    <div className="text-xs text-text3 italic bg-bg3 rounded p-2">Disponível após aprovação do admin</div>
                  )}
                </div>
                {o.affiliateConfig?.enabled && (
                  <div>
                    <div className="text-[10px] text-text3 uppercase mb-1 flex items-center gap-1">
                      Convite afiliação
                      {!isApproved && <span className="text-amber normal-case inline-flex items-center gap-1 ml-1"><Lock size={9} /> bloqueado</span>}
                    </div>
                    {isApproved ? (
                      <div className="flex items-center justify-between gap-2 bg-bg3 rounded p-2">
                        <code className="text-xs text-text2 font-mono truncate flex-1">{inviteUrl}</code>
                        <button onClick={() => { navigator.clipboard.writeText(inviteUrl); toast.success('Copiado'); }} className="btn-ghost btn-sm flex-shrink-0"><Copy size={11} /></button>
                      </div>
                    ) : (
                      <div className="text-xs text-text3 italic bg-bg3 rounded p-2">Disponível após aprovação do admin</div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export function ProductPixelsSection() {
  const isAffiliateArea = useIsAffiliateArea();
  return (
    <PlaceholderSection
      icon={Activity}
      title="Integração de pixels"
      description="Configure pixels de Facebook, Google Analytics, TikTok e outros para rastreamento de conversões deste produto."
      ctaText="Ir para configurações globais de pixels"
      ctaTo={isAffiliateArea ? '/afiliado/tracking' : '/produtor/tracking'}
    />
  );
}
