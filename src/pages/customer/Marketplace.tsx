import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { formatBRL } from '@/lib/utils';
import { Search, Package, Monitor, ShoppingCart, SlidersHorizontal } from 'lucide-react';

const TYPE_FILTERS = [
  { key: '',         label: 'Todos'    },
  { key: 'DIGITAL',  label: 'Digital'  },
  { key: 'PHYSICAL', label: 'Físico'   },
] as const;

const TYPE_BADGE: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  DIGITAL : { label: 'Digital',  cls: 'bg-accent/10 text-accent border-accent/20',    icon: <Monitor size={10} /> },
  PHYSICAL: { label: 'Físico',   cls: 'bg-green/10 text-green border-green/20',       icon: <Package size={10} /> },
  BUNDLE  : { label: 'Bundle',   cls: 'bg-amber/10 text-amber border-amber/20',       icon: <Package size={10} /> },
  SUBSCRIPTION: { label: 'Assinatura', cls: 'bg-purple/10 text-purple border-purple/20', icon: <Package size={10} /> },
};

export default function Marketplace() {
  const navigate = useNavigate();
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch]         = useState('');
  const [searchInput, setSearchInput] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['customer-marketplace', typeFilter, search],
    queryFn : () => api.get(`/customer/marketplace${buildQuery(typeFilter, search)}`).then(r => r.data),
    staleTime: 60 * 1000,
  });

  function buildQuery(type: string, q: string) {
    const params = new URLSearchParams();
    if (type) params.set('type', type);
    if (q)    params.set('search', q);
    const s = params.toString();
    return s ? `?${s}` : '';
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
  }

  const products = data?.data || [];

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-text">Marketplace</h1>
        <p className="text-sm text-text3 mt-0.5">Explore todos os produtos disponíveis</p>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Busca */}
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text3" />
            <input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="input pl-9 w-full"
              placeholder="Buscar produto..."
            />
          </div>
          <button type="submit" className="btn-secondary flex-shrink-0">
            Buscar
          </button>
        </form>

        {/* Tipo */}
        <div className="flex items-center gap-1 bg-bg2 border border-border rounded-[8px] p-1">
          <SlidersHorizontal size={13} className="text-text3 ml-1.5 flex-shrink-0" />
          {TYPE_FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setTypeFilter(f.key)}
              className={`px-3 py-1.5 rounded-[6px] text-sm transition-all ${
                typeFilter === f.key
                  ? 'bg-accent text-white font-medium'
                  : 'text-text3 hover:text-text'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-40 bg-bg3 rounded-lg mb-3" />
              <div className="h-4 bg-bg3 rounded w-3/4 mb-2" />
              <div className="h-3 bg-bg3 rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* Vazio */}
      {!isLoading && products.length === 0 && (
        <div className="card flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 bg-bg3 rounded-2xl flex items-center justify-center mb-4">
            <Package size={26} className="text-text3" />
          </div>
          <p className="text-text font-medium mb-1">Nenhum produto encontrado</p>
          <p className="text-text3 text-sm">Tente outros filtros ou termos de busca.</p>
          {(typeFilter || search) && (
            <button onClick={() => { setTypeFilter(''); setSearch(''); setSearchInput(''); }} className="btn-secondary mt-4">
              Limpar filtros
            </button>
          )}
        </div>
      )}

      {/* Grid de produtos */}
      {!isLoading && products.length > 0 && (
        <>
          <p className="text-xs text-text3 mb-4">{products.length} produto{products.length !== 1 ? 's' : ''}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((p: any) => {
              const badge = TYPE_BADGE[p.type] || TYPE_BADGE.DIGITAL;
              return (
                <div
                  key={p.id}
                  className="card p-0 overflow-hidden group cursor-pointer hover:border-accent/40 transition-all"
                  onClick={() => navigate(`/checkout/${p.slug}`)}
                >
                  {/* Imagem */}
                  <div className="relative h-40 bg-bg3 overflow-hidden">
                    {p.imageUrl ? (
                      <img
                        src={p.imageUrl}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package size={36} className="text-text3/40" />
                      </div>
                    )}
                    {/* Badge de tipo */}
                    <span className={`absolute top-2 left-2 flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border ${badge.cls}`}>
                      {badge.icon}
                      {badge.label}
                    </span>
                  </div>

                  {/* Infos */}
                  <div className="p-3">
                    <p className="text-sm font-semibold text-text leading-snug line-clamp-2 mb-2">{p.name}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-base font-bold text-text">{formatBRL(p.price)}</span>
                      <button
                        onClick={e => { e.stopPropagation(); navigate(`/checkout/${p.slug}`); }}
                        className="flex items-center gap-1 text-[11px] text-accent font-medium hover:underline"
                      >
                        <ShoppingCart size={11} />
                        Comprar
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
