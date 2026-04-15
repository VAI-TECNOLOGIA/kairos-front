import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { PageHeader, Loading, EmptyState } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import type { Affiliate } from "@/types";
import { Link2 } from "lucide-react";

export default function AffiliatesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-affiliates"],
    queryFn: () => api.get('/affiliates/pending').then(r => r.data),
  });
  const affiliates: Affiliate[] = Array.isArray(data) ? data : [];

  return (
    <div>
      <PageHeader title="Afiliados" sub={`${affiliates.length} de 1.000 afiliados`} />
      {isLoading ? <Loading /> : affiliates.length === 0 ? (
        <EmptyState icon={<Link2 size={32}/>} title="Nenhum afiliado" />
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead><tr><th>Nome</th><th>Email</th><th>Código</th><th>Status</th><th>Cadastro</th></tr></thead>
            <tbody>
              {affiliates.map(a => (
                <tr key={a.id}>
                  <td className="font-medium text-text">{a.user.name}</td>
                  <td>{a.user.email}</td>
                  <td><code className="text-xs bg-bg3 px-2 py-0.5 rounded text-accent">{a.code}</code></td>
                  <td><span className={a.isActive ? "badge-green" : "badge-gray"}>{a.isActive ? "Ativo" : "Inativo"}</span></td>
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