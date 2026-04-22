import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { PageHeader, Loading, StatCard } from "@/components/ui";
import { formatBRL, formatDateTime, orderStatusVariant } from "@/lib/utils";
import type { Order } from "@/types";
import { ShoppingCart, FileText, Loader2 } from "lucide-react";

export default function MySales() {
  const { data, isLoading } = useQuery({ queryKey:["my-sales"], queryFn:()=>api.get("/reports/sales?limit=50").then(r=>r.data) });
  const orders: (Order & { metadata?: any })[] = data?.data || [];

  function renderNfeCell(o: any) {
    const nfe = o.metadata?.nfe;
    // Só considera "aguardando" por até 10 minutos após aprovação.
    // Depois disso assume que não vai mais emitir (ou falhou em algum lugar).
    const MAX_WAIT_MS = 10 * 60 * 1000;
    if (!nfe) {
      if (o.status !== 'APPROVED') return <span className="text-text3 text-xs">—</span>;
      const approvedAt = o.approvedAt ? new Date(o.approvedAt).getTime() : 0;
      if (approvedAt && Date.now() - approvedAt < MAX_WAIT_MS) {
        return (
          <span className="text-text3 text-xs flex items-center gap-1">
            <Loader2 size={11} className="animate-spin" /> aguardando
          </span>
        );
      }
      return <span className="text-text3 text-xs">—</span>;
    }
    if (nfe.status === 'issued' && nfe.pdfUrl) {
      return (
        <a href={nfe.pdfUrl} target="_blank" rel="noopener noreferrer"
           className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline font-medium">
          <FileText size={12} /> NF #{nfe.number || nfe.id?.slice(-6).toUpperCase() || ''}
        </a>
      );
    }
    if (nfe.status === 'processing') {
      return (
        <span className="text-text3 text-xs flex items-center gap-1">
          <Loader2 size={11} className="animate-spin" /> processando
        </span>
      );
    }
    if (nfe.status === 'failed') {
      return <span className="text-red-400 text-xs">erro na emissão</span>;
    }
    return <span className="text-text3 text-xs">—</span>;
  }

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
            <thead><tr><th>Cliente</th><th>Produto</th><th>Valor</th><th>Método</th><th>Status</th><th>Nota Fiscal</th><th>Data</th></tr></thead>
            <tbody>
              {orders.map(o=>(
                <tr key={o.id}>
                  <td className="text-text">{o.customerName||"—"}</td>
                  <td className="text-text2">{o.offer?.product?.name||"—"}</td>
                  <td className="font-semibold text-text">{formatBRL(o.amountCents)}</td>
                  <td><span className="badge-gray">{o.paymentMethod||"—"}</span></td>
                  <td><span className={orderStatusVariant(o.status)}>{o.status}</span></td>
                  <td>{renderNfeCell(o)}</td>
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