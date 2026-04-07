import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { PageHeader, Loading, StatCard } from "@/components/ui";
import { formatBRL, formatDate, SUB_CYCLE_LABEL } from "@/lib/utils";
import { RefreshCw } from "lucide-react";
import type { Subscription } from "@/types";

export default function SubscriptionsPage() {
  const { data: mrr } = useQuery({ queryKey: ["mrr"], queryFn: () => api.get("/reports/mrr").then(r => r.data) });
  const { data, isLoading } = useQuery({ queryKey: ["subscriptions"], queryFn: () => api.get("/subscriptions").then(r => r.data) });
  const subs: Subscription[] = data?.data || [];

  return (
    <div>
      <PageHeader title="Assinaturas Recorrentes" sub="Dunning automático ativo" />
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="MRR" value={formatBRL(mrr?.mrrCents || 0)} icon={<RefreshCw size={16}/>} />
        <StatCard label="Assinaturas ativas" value={mrr?.activeSubscriptions || 0} />
        <StatCard label="Total" value={data?.total || 0} />
      </div>
      {isLoading ? <></> : (
        <div className="table-wrapper">
          <table className="table">
            <thead><tr><th>Cliente</th><th>Ciclo</th><th>Valor</th><th>Próxima cobrança</th><th>Status</th><th>Tentativas</th></tr></thead>
            <tbody>
              {subs.map(s => (
                <tr key={s.id}>
                  <td className="text-text">{s.customerName || s.customerEmail}</td>
                  <td><span className="badge-blue">{SUB_CYCLE_LABEL[s.cycle] || s.cycle}</span></td>
                  <td className="font-semibold text-text">{formatBRL(s.priceCents)}</td>
                  <td>{formatDate(s.nextChargeAt)}</td>
                  <td><span className={s.status === "ACTIVE" ? "badge-green" : s.status === "SUSPENDED" ? "badge-amber" : "badge-red"}>{s.status}</span></td>
                  <td>{s.retryCount > 0 ? <span className="badge-amber">{s.retryCount}/3</span> : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}