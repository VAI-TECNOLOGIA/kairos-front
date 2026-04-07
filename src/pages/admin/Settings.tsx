import { PageHeader } from "@/components/ui";
import { Settings } from "lucide-react";
export default function AdminSettings() {
  return (
    <div>
      <PageHeader title="Configurações" sub="Configurações da plataforma" />
      <div className="card"><p className="text-text2">Configurações gerais da plataforma em desenvolvimento:</p></div>
      
    </div>
  );
}