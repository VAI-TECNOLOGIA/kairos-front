import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import api from '@/lib/api';
import { PageHeader, Loading, EmptyState } from '@/components/ui';
import { formatDate } from '@/lib/utils';
import type { Affiliate, Offer } from '@/types';
import { Link2, Copy, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function MyAffiliates() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['my-affiliates'],
    queryFn : () => api.get('/affiliates').then(r => r.data),
  });

  // Carrega as ofertas do produtor para montar links com slug correto
  const { data: productsData } = useQuery({
    queryKey: ['my-products-offers'],
    queryFn : () => api.get('/products').then(r => r.data),
  });

  const affiliates: Affiliate[] = data?.data || [];

  // Pega o primeiro slug de oferta ativa do produtor
  const firstOfferSlug: string | null = productsData?.data
    ?.flatMap((p: any) => p.offers || [])
    ?.find((o: any) => o.isActive)
    ?.slug || null;

  const copyLink = (code: string, slug?: string) => {
    const base = window.location.origin;
    const url  = slug
      ? `${base}/checkout/${slug}?aff=${code}`  // FIX F-44: link com slug de oferta
      : `${base}/checkout?aff=${code}`;
    navigator.clipboard.writeText(url);
    setCopiedId(code);
    toast.success('Link copiado!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div>
      <PageHeader
        title="Afiliados"
        sub={`${affiliates.length} afiliado(s) cadastrado(s)`}
      />

      {!firstOfferSlug && affiliates.length > 0 && (
        <div className="bg-amber/10 border border-amber/30 rounded-[10px] p-4 mb-6">
          <p className="text-sm text-amber">
            ⚠ Crie pelo menos uma oferta ativa para gerar links de afiliados com slug correto.
          </p>
        </div>
      )}

      {isLoading ? <Loading /> : affiliates.length === 0 ? (
        <EmptyState
          icon={<Link2 size={32} />}
          title="Nenhum afiliado"
          sub="Os afiliados cadastrados pelo administrador aparecem aqui."
        />
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Nome</th><th>Email</th><th>Código</th>
                <th>Link de afiliado</th><th>Status</th><th>Cadastro</th>
              </tr>
            </thead>
            <tbody>
              {affiliates.map(a => (
                <tr key={a.id}>
                  <td className="font-medium text-text">{a.user.name}</td>
                  <td>{a.user.email}</td>
                  <td>
                    <code className="text-xs bg-bg3 px-2 py-0.5 rounded text-accent">{a.code}</code>
                  </td>
                  <td>
                    <button
                      onClick={() => copyLink(a.code, firstOfferSlug || undefined)}
                      className="btn-ghost btn-sm text-xs gap-1"
                    >
                      {copiedId === a.code ? (
                        <><CheckCircle size={12} className="text-green" /> Copiado</>
                      ) : (
                        <><Copy size={12} /> Copiar link</>
                      )}
                    </button>
                    {firstOfferSlug && (
                      <div className="text-[10px] text-text3 mt-0.5 truncate max-w-[200px]">
                        /checkout/{firstOfferSlug}?aff={a.code}
                      </div>
                    )}
                  </td>
                  <td>
                    <span className={a.isActive ? 'badge-green' : 'badge-gray'}>
                      {a.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td>{formatDate(a.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}