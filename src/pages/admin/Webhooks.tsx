import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import api from "@/lib/api";
import { PageHeader, Modal, Loading } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import toast from "react-hot-toast";
import { Webhook, Plus } from "lucide-react";
import type { WebhookEndpoint } from "@/types";

export default function WebhooksPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>(["payment.approved"]);

  const { data } = useQuery({ queryKey: ["webhook-endpoints"], queryFn: () => api.get("/webhooks/endpoints").then(r => r.data) });
  const create = useMutation({
    mutationFn: () => api.post("/webhooks/endpoints", { url, events }),
    onSuccess: () => { toast.success("Endpoint criado!"); qc.invalidateQueries({ queryKey: ["webhook-endpoints"] }); setOpen(false); setUrl(""); },
  });

  const endpoints: WebhookEndpoint[] = data || [];

  return (
    <div>
      <PageHeader title="Webhooks" sub="Endpoints e entregas" actions={<button onClick={() => setOpen(true)} className="btn-primary btn-sm"><Plus size={14}/> Novo endpoint</button>} />
      <div className="table-wrapper">
        <table className="table">
          <thead><tr><th>URL</th><th>Eventos</th><th>Status</th><th>Criado</th></tr></thead>
          <tbody>
            {endpoints.map(e => (
              <tr key={e.id}>
                <td className="font-mono text-xs text-text2 max-w-xs truncate">{e.url}</td>
                <td>{e.events.slice(0,2).map(ev => <span key={ev} className="badge-blue mr-1">{ev}</span>)}{e.events.length > 2 && <span className="badge-gray">+{e.events.length-2}</span>}</td>
                <td><span className={e.status === "ACTIVE" ? "badge-green" : "badge-gray"}>{e.status}</span></td>
                <td>{formatDate(e.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="Novo Webhook Endpoint"
        footer={<><button className="btn-ghost" onClick={() => setOpen(false)}>Cancelar</button><button className="btn-primary" onClick={() => create.mutate()}>Criar</button></>}>
        <div className="form-group">
          <label className="label">URL do endpoint</label>
          <input value={url} onChange={e => setUrl(e.target.value)} className="input" placeholder="https://seu-servidor.com/webhook" />
        </div>
        <div className="form-group">
          <label className="label">Eventos</label>
          <p className="text-xs text-text3">Selecione os eventos desejados</p>
          {["payment.approved","payment.failed","subscription.created","affiliate.sale","order.shipped"].map(ev => (
            <label key={ev} className="flex items-center gap-2 mt-2 cursor-pointer">
              <input type="checkbox" checked={events.includes(ev)} onChange={e => setEvents(prev => e.target.checked ? [...prev, ev] : prev.filter(x => x !== ev))} className="accent-accent" />
              <span className="text-sm text-text2">{ev}</span>
            </label>
          ))}
        </div>
      </Modal>
    </div>
  );
}