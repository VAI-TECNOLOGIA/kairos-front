import { useParams, useNavigate, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Loading } from '@/components/ui';
import { cn } from '@/lib/utils';
import { ArrowLeft, Info, Tag, FileText, Users as UsersIcon, ShoppingBag, Link2, Activity, Image as ImageIcon, Handshake, Monitor } from 'lucide-react';

interface Product {
  id          : string;
  name        : string;
  status      : string;
  type        : string;
  imageUrl    : string | null;
  isActive    : boolean;
  offers?     : any[];
}

function buildSections(productType?: string) {
  const isDigital = productType === 'DIGITAL';
  const sections = [
    { group: 'Geral', items: [
      { to: '',                icon: Info,        label: 'Informações' },
      { to: 'ofertas',         icon: Tag,         label: 'Ofertas',         countKey: 'offers' as const },
    ]},
  ];
  // Entregas (Arquivos + Área de membros) só para produto DIGITAL (cursos, ebooks)
  if (isDigital) {
    sections.push({ group: 'Entregas', items: [
      { to: 'arquivos',        icon: FileText,    label: 'Arquivos' },
      { to: 'area-membros',    icon: Monitor,     label: 'Área de membros' },
    ]});
  }
  sections.push(
    { group: 'Checkout', items: [
      { to: 'checkout',        icon: ShoppingBag, label: 'Personalizar checkout' },
    ]},
    { group: 'Parceiros', items: [
      { to: 'afiliacao',       icon: Handshake,   label: 'Afiliação' },
      { to: 'cupons',          icon: Tag,         label: 'Cupons' },
      { to: 'coprodutores',    icon: UsersIcon,   label: 'Co produtores' },
    ]},
    { group: 'Tráfego', items: [
      { to: 'links',           icon: Link2,       label: 'Links de divulgação' },
      { to: 'pixels',          icon: Activity,    label: 'Integração de pixels' },
    ]},
  );
  return sections;
}

export default function ProductEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isAffiliateArea = location.pathname.startsWith('/afiliado/');
  const productBase = isAffiliateArea ? '/afiliado/meus-produtos' : '/produtor/produtos';

  const { data: product, isLoading } = useQuery<Product>({
    queryKey: ['producer-product', id],
    queryFn : () => api.get(`/products/${id}`).then(r => r.data),
    enabled : !!id,
  });

  if (isLoading) return <Loading />;
  if (!product) return <div className="p-6 text-text3">Produto não encontrado</div>;

  const counts = { offers: product.offers?.length ?? 0 };
  const statusBadge =
    product.status === 'APPROVED' ? 'bg-green/15 text-green' :
    product.status === 'PENDING'  ? 'bg-amber/15 text-amber' :
    product.status === 'REVIEW'   ? 'bg-accent/15 text-accent' :
    product.status === 'REJECTED' ? 'bg-red/15 text-red'   :
    'bg-bg3 text-text3';
  const statusLabel = product.status === 'APPROVED' ? 'Ativo' :
                      product.status === 'PENDING'  ? 'Em análise' :
                      product.status === 'REVIEW'   ? 'Em revisão' :
                      product.status === 'REJECTED' ? 'Recusado'   : product.status;

  return (
    <div>
      {/* Voltar */}
      <button onClick={() => navigate(productBase)} className="btn-ghost btn-sm mb-3 text-text3">
        <ArrowLeft size={14} /> Voltar para produtos
      </button>

      {/* Header card sticky topo */}
      <div className="card p-4 mb-4 flex items-start gap-4">
        <div className="w-16 h-16 rounded-xl bg-bg3 flex-shrink-0 overflow-hidden border border-border">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon size={20} className="text-text3" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full uppercase', statusBadge)}>{statusLabel}</span>
            <h1 className="text-base sm:text-lg font-bold text-text truncate">{product.name}</h1>
          </div>
          <div className="text-xs text-text3 mt-0.5">Tipo: {product.type}</div>
          <div className="text-[11px] text-text3 mt-1">* As atualizações podem levar até 1 minuto para serem aplicadas no checkout</div>
        </div>
      </div>

      {/* Layout 2 colunas */}
      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4">
        {/* Sidebar de seções */}
        <aside className="card p-2 h-fit md:sticky md:top-4">
          {buildSections(product.type).map((section, gi) => (
            <div key={section.group} className={gi > 0 ? 'mt-3' : ''}>
              <div className="text-[10px] uppercase font-semibold text-text3 px-3 py-1 tracking-wide">{section.group}</div>
              <div className="space-y-0.5">
                {section.items.map(item => {
                  const fullPath = `${productBase}/${id}${item.to ? `/${item.to}` : ''}`;
                  const isActive = location.pathname === fullPath || (item.to === '' && location.pathname === fullPath);
                  return (
                    <NavLink
                      key={item.to || 'index'}
                      to={fullPath}
                      end={item.to === ''}
                      className={({ isActive: navActive }) => cn(
                        'flex items-center gap-2 px-3 py-1.5 rounded-[7px] text-sm transition-colors',
                        navActive ? 'bg-accent/10 text-accent font-medium' : 'text-text2 hover:bg-bg3 hover:text-text',
                      )}
                    >
                      <item.icon size={14} />
                      <span className="flex-1">{item.label}</span>
                      {(item as any).countKey && counts[(item as any).countKey] > 0 && (
                        <span className="text-[10px] bg-bg3 px-1.5 py-0.5 rounded-full text-text2">
                          {counts[(item as any).countKey]}
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </aside>

        {/* Conteúdo da seção */}
        <main>
          <Outlet context={{ product }} />
        </main>
      </div>
    </div>
  );
}
