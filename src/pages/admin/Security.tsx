import { PageHeader } from "@/components/ui";
import { Shield, CheckCircle, Clock, AlertCircle } from "lucide-react";

const reqs = [
  { id:"REQ-1", name:"Firewall e controle de rede", status:"Em Andamento" },
  { id:"REQ-2", name:"Configurações seguras padrão", status:"Implementado" },
  { id:"REQ-3", name:"Proteção dados armazenados", status:"Implementado" },
  { id:"REQ-4", name:"Criptografia em trânsito (TLS)", status:"Implementado" },
  { id:"REQ-5", name:"Proteção antimalware", status:"Em Andamento" },
  { id:"REQ-6", name:"Desenvolvimento seguro (OWASP)", status:"Implementado" },
  { id:"REQ-7", name:"Controle de acesso RBAC", status:"Implementado" },
  { id:"REQ-8", name:"Autenticação e MFA", status:"Implementado" },
  { id:"REQ-9", name:"Segurança física/cloud", status:"Implementado" },
  { id:"REQ-10", name:"Logs e auditoria", status:"Implementado" },
  { id:"REQ-11", name:"Testes de segurança", status:"Implementado" },
  { id:"REQ-12", name:"Políticas organizacionais", status:"Implementado" },
];

const statusIcon = (s: string) => s === "Implementado" ? <CheckCircle size={14} className="text-green"/> : s === "Em Andamento" ? <Clock size={14} className="text-amber"/> : <AlertCircle size={14} className="text-text3"/>;
const statusBadge = (s: string) => s === "Implementado" ? "badge-green" : s === "Em Andamento" ? "badge-amber" : "badge-gray";

export default function SecurityPage() {
  const done = reqs.filter(r => r.status === "Implementado").length;
  return (
    <div>
      <PageHeader title="Segurança & PCI DSS" sub={`${done}/12 requisitos implementados`} />
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card flex flex-col gap-1"><div className="stat-label">Implementados</div><div className="stat-value text-green">{done}</div></div>
        <div className="card flex flex-col gap-1"><div className="stat-label">Em andamento</div><div className="stat-value text-amber">{reqs.filter(r=>r.status==="Em Andamento").length}</div></div>
        <div className="card flex flex-col gap-1"><div className="stat-label">Conformidade</div><div className="stat-value">{Math.round(done/12*100)}%</div></div>
      </div>
      <div className="card">
        <div className="section-title mb-4">Checklist PCI DSS — 12 Requisitos</div>
        <div className="space-y-2">
          {reqs.map(r => (
            <div key={r.id} className="flex items-center justify-between py-2.5 px-3 bg-bg3 rounded-[7px] border-l-2" style={{borderLeftColor: r.status==="Implementado"?"#00C9A7":r.status==="Em Andamento"?"#F59E0B":"#4A5568"}}>
              <div className="flex items-center gap-3">
                {statusIcon(r.status)}
                <code className="text-xs text-text3 font-mono">{r.id}</code>
                <span className="text-sm text-text">{r.name}</span>
              </div>
              <span className={statusBadge(r.status)}>{r.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}