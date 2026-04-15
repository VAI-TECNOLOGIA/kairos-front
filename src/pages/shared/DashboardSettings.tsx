import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui';
import { useDashboardConfig, WidgetConfig } from '@/hooks/useDashboardConfig';
import { LayoutDashboard, Eye, EyeOff, Save, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';

export default function DashboardSettings() {
  const { getMergedConfig, availableWidgets, save, isLoading } = useDashboardConfig();

  const [local, setLocal] = useState<WidgetConfig[]>([]);

  // Inicializa com o estado atual (salvo ou padrão)
  useEffect(() => {
    if (!isLoading) {
      setLocal(getMergedConfig());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  const enabledCount = local.filter(w => w.enabled).length;

  function toggle(id: string) {
    setLocal(prev =>
      prev.map(w => w.id === id ? { ...w, enabled: !w.enabled } : w)
    );
  }

  function enableAll() {
    setLocal(prev => prev.map(w => ({ ...w, enabled: true })));
  }

  function handleSave() {
    save.mutate(local, {
      onSuccess: () => toast.success('Dashboard atualizado!'),
      onError  : () => toast.error('Erro ao salvar. Tente novamente.'),
    });
  }

  if (isLoading || local.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-text3 text-sm">
        Carregando configurações...
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Configurar Dashboard"
        sub="Escolha quais informações aparecem no seu painel principal"
      />

      {/* Header card */}
      <div className="card mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[8px] bg-accent/15 flex items-center justify-center flex-shrink-0">
            <LayoutDashboard size={18} className="text-accent" />
          </div>
          <div>
            <div className="text-sm font-semibold text-text">
              {enabledCount} de {availableWidgets.length} itens visíveis
            </div>
            <div className="text-xs text-text3">
              Selecione o que quer ver no seu dashboard
            </div>
          </div>
        </div>
        <button
          onClick={enableAll}
          className="btn-secondary btn-sm flex-shrink-0"
        >
          <RotateCcw size={13} />
          Restaurar padrão
        </button>
      </div>

      {/* Lista de widgets */}
      <div className="space-y-2 mb-6">
        {availableWidgets.map((widget) => {
          const cfg     = local.find(w => w.id === widget.id);
          const enabled = cfg ? cfg.enabled : true;

          return (
            <button
              key={widget.id}
              onClick={() => toggle(widget.id)}
              className={[
                'w-full flex items-center gap-4 px-4 py-3.5 rounded-[10px] border transition-all duration-150 text-left',
                enabled
                  ? 'bg-bg2 border-border hover:border-accent/40'
                  : 'bg-bg border-border/50 opacity-50 hover:opacity-70',
              ].join(' ')}
            >
              {/* Toggle visual */}
              <div className={[
                'w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-colors',
                enabled ? 'bg-accent text-white' : 'bg-bg3 text-text3',
              ].join(' ')}>
                {enabled
                  ? <Eye size={11} />
                  : <EyeOff size={11} />
                }
              </div>

              {/* Texto */}
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium ${enabled ? 'text-text' : 'text-text3'}`}>
                  {widget.label}
                </div>
                <div className="text-xs text-text3 truncate">{widget.desc}</div>
              </div>

              {/* Badge de status */}
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
                enabled
                  ? 'bg-green/10 text-green border border-green/20'
                  : 'bg-bg3 text-text3 border border-border'
              }`}>
                {enabled ? 'Visível' : 'Oculto'}
              </span>
            </button>
          );
        })}
      </div>

      {/* Salvar */}
      <button
        onClick={handleSave}
        disabled={save.isPending}
        className="btn-primary w-full justify-center"
      >
        {save.isPending ? (
          <>
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Salvando...
          </>
        ) : (
          <>
            <Save size={15} />
            Salvar configurações
          </>
        )}
      </button>
    </div>
  );
}
