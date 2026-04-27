import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { PageHeader, Loading, StatCard } from "@/components/ui";
import { formatBRL, formatDateTime, orderStatusVariant } from "@/lib/utils";
import type { Order } from "@/types";
import { ShoppingCart, FileText, ExternalLink } from "lucide-react";

const STATUS_FILTERS = [
  { value: '',           label: 'Todas'      },
  { value: 'APPROVED',   label: 'Aprovadas'  },
  { value: 'PENDING',    label: 'Pendentes'  },
  { value: 'PROCESSING', label: 'Processando'},
  { value: 'REJECTED',   label: 'Recusadas'  },
  { value: 'REFUNDED',   label: 'Reembolsadas'},
  { value: 'CANCELLED',  label: 'Canceladas' },
] as const;

export default function MySales() {
  const [status, setStatus] = useState<string>('');
  const { data, isLoading } = useQuery({
    queryKey:["my-sales", status],
    queryFn :()=>api.get(`/reports/sales?limit=50${status ? `&status=${status}` : ''}`).then(r=>r.data),
  });
  const orders: Order[] = data?.data || [];

  return (
    <div>
      <PageHeader title="Minhas Vendas" />

      {/* Acesso às notas fiscais no painel NFe.io */}
      <div className="card mb-6 p-4 flex items-start gap-3 border-l-4 border-accent">
        <FileText size={18} className="text-accent flex-shrink-0 mt-0.5" />
        <div className="flex-1 text-sm">
          <div className="font-semibold text-text mb-1">Ver todas as notas fiscais emitidas</div>
          <div className="text-text3 mb-2">
            Acesse o painel da NFe.io e siga: <strong>Empresas</strong> → selecione sua empresa →
            aba <strong>NFS-e</strong> → botão <strong>Listar NFS-e</strong>. Todas as notas
            emitidas para os pedidos aprovados ficam listadas lá, com PDF e XML para download.
          </div>
          <a
            href="https://app.nfe.io"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary py-1.5 px-3 text-xs inline-flex items-center gap-1.5"
          >
            Abrir painel NFe.io <ExternalLink size={12} />
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total de vendas" value={data?.total||0} icon={<ShoppingCart size={16}/>}/>
        <StatCard label="Receita total" value={formatBRL(data?.totalRevenueCents||0)}/>
        <StatCard label="Ticket médio" value={data?.total?formatBRL(Math.round((data.totalRevenueCents||0)/data.total)):"—"}/>
      </div>

      {/* Filtro por status */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {STATUS_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setStatus(f.value)}
            className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
              status === f.value
                ? 'bg-accent/10 border-accent text-accent font-semibold'
                : 'border-border text-text3 hover:border-accent/40 hover:text-text2'
            }`}
          >
            {f.label}
          </button>
        ))}
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