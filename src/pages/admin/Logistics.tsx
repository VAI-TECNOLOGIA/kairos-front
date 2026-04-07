import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { PageHeader, Loading } from "@/components/ui";
import { Truck } from "lucide-react";

export default function LogisticsPage() {
  const { data, isLoading } = useQuery({ queryKey: ["logistics"], queryFn: () => api.get("/logistics/orders").then(r => r.data) });
  return (
    <div>
      <PageHeader title="Logística" sub="Pedidos físicos e rastreamento" />
      {isLoading ? <Loading /> : (
        <div className="table-wrapper">
          <table className="table">
            <thead><tr><th>Pedido</th><th>Transportadora</th><th>Rastreio</th><th>Status</th></tr></thead>
            <tbody>
              {(data?.data || []).map((s: any) => (
                <tr key={s.id}>
                  <td className="font-mono text-xs text-text2">{s.orderId?.slice(-8)}</td>
                  <td>{s.carrier}</td>
                  <td><code className="text-xs bg-bg3 px-2 py-0.5 rounded">{s.trackingCode || "—"}</code></td>
                  <td><span className="badge-blue">{s.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}