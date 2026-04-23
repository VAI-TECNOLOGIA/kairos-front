import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { PageHeader, Loading } from "@/components/ui";
import { formatDateTime } from "@/lib/utils";
import type { AuditLog } from "@/types";
import { AlertTriangle } from "lucide-react";

const LEVEL_FILTERS = [
  { value: '',         label: 'Todos'    },
  { value: 'LOW',      label: 'Low'      },
  { value: 'MEDIUM',   label: 'Medium'   },
  { value: 'HIGH',     label: 'High'     },
  { value: 'CRITICAL', label: 'Critical' },
] as const;

export default function AuditLogPage() {
  const [level, setLevel] = useState<string>('');
  const { data, isLoading } = useQuery({
    queryKey: ["audit-log", level],
    queryFn : () => api.get(`/audit?limit=50${level ? `&level=${level}` : ''}`).then(r => r.data),
  });
  const logs: AuditLog[] = data?.data || [];
  const highCount = logs.filter(l => l.level === "HIGH" || l.level === "CRITICAL").length;

  const levelClass = (l: string) => ({ LOW: "badge-gray", MEDIUM: "badge-blue", HIGH: "badge-amber", CRITICAL: "badge-red" }[l] || "badge-gray");

  return (
    <div>
      <PageHeader title="Audit Log" sub="PCI DSS REQ-10 — Rastreamento completo de ações" />
      {highCount > 0 && (
        <div className="flex items-center gap-3 bg-red/10 border border-red/30 rounded-[10px] p-4 mb-6">
          <AlertTriangle size={18} className="text-red flex-shrink-0"/>
          <span className="font-semibold text-red">{highCount} evento(s) de nível ALTO/CRÍTICO detectados</span>
        </div>
      )}

      {/* Filtro por nível */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {LEVEL_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setLevel(f.value)}
            className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
              level === f.value
                ? 'bg-accent/10 border-accent text-accent font-semibold'
                : 'border-border text-text3 hover:border-accent/40 hover:text-text2'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
      {isLoading ? <Loading /> : (
        <div className="table-wrapper">
          <table className="table">
            <thead><tr><th>Ação</th><th>Usuário</th><th>IP</th><th>Recurso</th><th>Data/Hora</th><th>Nível</th></tr></thead>
            <tbody>
              {logs.map(l => (
                <tr key={l.id}>
                  <td><code className="text-xs bg-bg3 px-1.5 py-0.5 rounded text-accent">{l.action}</code></td>
                  <td className="text-text">{l.user?.email || l.userId || "sistema"}</td>
                  <td className="font-mono text-xs text-text3">{l.ip || "—"}</td>
                  <td className="text-text3 text-xs">{l.resource || "—"}</td>
                  <td className="text-text3">{formatDateTime(l.createdAt)}</td>
                  <td><span className={levelClass(l.level)}>{l.level}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}