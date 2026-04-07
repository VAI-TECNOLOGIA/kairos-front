import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { PageHeader, Loading, StatCard } from "@/components/ui";
import { formatBRL, formatDateTime, orderStatusVariant } from "@/lib/utils";
import type { Order } from "@/types";
import { ShoppingCart } from "lucide-react";
export default function MySales() {
  const { data, isLoading } = useQuery({ queryKey:["my-sales"], queryFn:()=>api.get("/reports/sales?limit=50").then(r=>r.data) });
  const orders: Order[] = data?.data || [];
  return (
    <div>
      <PageHeader title="Minhas Vendas" />
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Total de vendas" value={data?.total||0} icon={<ShoppingCart size={16}/>}/>
        <StatCard label="Receita total" value={formatBRL(data?.totalRevenueCents||0)}/>
        <StatCard label="Ticket médio" value={data?.total?formatBRL(Math.round((data.totalRevenueCents||0)/data.total)):"—"}/>
      </div>
      {isLoading ? <Loading/> : (
        <div className="table-wrapper">
          <table className="table">
            <thead><tr><th>Cliente</th><th>Produto</th><th>Valor</th><th>Método</th><th>Status</th><th>Data</th></tr></thead>
            <tbody>
              {orders.map(o=>(
                <tr key={o.id}>
                  <td className="text-text">{o.customerName||"—"}</td>
                  <td className="text-text2">{o.offer?.product?.name||"—"}</td>
                  <td className="font-semibold text-text">{formatBRL(o.amountCents)}</td>
                  <td><span className="badge-gray">{o.paymentMethod||"—"}</span></td>
                  <td><span className={orderStatusVariant(o.status)}>{o.status}</span></td>
                  <td className="text-text3">{formatDateTime(o.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}