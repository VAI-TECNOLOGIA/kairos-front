import { useOutletContext, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Copy, Construction, ShoppingBag, Activity, Link2, Users } from 'lucide-react';

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
  return (
    <PlaceholderSection
      icon={ShoppingBag}
      title="Personalizar checkout"
      description="Customize cores, banner, ordem de campos e ofertas extras no checkout deste produto."
      ctaText="Ir para configurações globais de checkout"
      ctaTo="/produtor/checkout"
    />
  );
}

export function ProductCoproducersSection() {
  const { product } = useOutletContext<{ product: any }>();
  const list: any[] = product?.coproducers || [];
  return (
    <div className="space-y-3">
      <h2 className="text-base font-semibold text-text">Co produtores</h2>
      <div className="card p-4">
        {list.length === 0 ? (
          <div className="text-center text-text3 py-6">
            <Users size={28} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">Nenhum co-produtor neste produto.</p>
            <Link to="/produtor/coprodutores" className="text-accent text-xs hover:underline mt-1 inline-block">Gerenciar parceiros</Link>
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
  return (
    <div className="space-y-3">
      <h2 className="text-base font-semibold text-text">Links de divulgação</h2>
      <div className="space-y-2">
        {offers.length === 0 ? (
          <div className="card p-6 text-center text-text3">
            <Link2 size={24} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">Crie uma oferta primeiro pra gerar os links.</p>
          </div>
        ) : (
          offers.map((o: any) => {
            const url = `${window.location.origin}/checkout/${o.slug}`;
            const inviteUrl = `${window.location.origin}/afiliar/${o.slug}`;
            return (
              <div key={o.id} className="card p-3 space-y-2">
                <div className="text-sm font-medium text-text">{o.name}</div>
                <div>
                  <div className="text-[10px] text-text3 uppercase mb-1">Checkout</div>
                  <div className="flex items-center justify-between gap-2 bg-bg3 rounded p-2">
                    <code className="text-xs text-text2 font-mono truncate flex-1">{url}</code>
                    <button onClick={() => { navigator.clipboard.writeText(url); toast.success('Copiado'); }} className="btn-ghost btn-sm flex-shrink-0"><Copy size={11} /></button>
                  </div>
                </div>
                {o.affiliateConfig?.enabled && (
                  <div>
                    <div className="text-[10px] text-text3 uppercase mb-1">Convite afiliação</div>
                    <div className="flex items-center justify-between gap-2 bg-bg3 rounded p-2">
                      <code className="text-xs text-text2 font-mono truncate flex-1">{inviteUrl}</code>
                      <button onClick={() => { navigator.clipboard.writeText(inviteUrl); toast.success('Copiado'); }} className="btn-ghost btn-sm flex-shrink-0"><Copy size={11} /></button>
                    </div>
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
  return (
    <PlaceholderSection
      icon={Activity}
      title="Integração de pixels"
      description="Configure pixels de Facebook, Google Analytics, TikTok e outros para rastreamento de conversões deste produto."
      ctaText="Ir para configurações globais de pixels"
      ctaTo="/produtor/tracking"
    />
  );
}
