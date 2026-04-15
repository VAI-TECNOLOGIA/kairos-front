import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth.store';
import api from '@/lib/api';
import { WIDGETS_BY_ROLE, WidgetId } from '@/lib/widgets';

export interface WidgetConfig {
  id     : string;
  enabled: boolean;
}

export function useDashboardConfig() {
  const { user } = useAuthStore();
  const qc       = useQueryClient();
  const role     = user?.role ?? '';

  const availableWidgets = WIDGETS_BY_ROLE[role] ?? [];

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-config', user?.id],
    queryFn : () => api.get('/dashboard/config').then(r => r.data),
    enabled : !!user?.id,
  });

  const save = useMutation({
    mutationFn: (widgets: WidgetConfig[]) =>
      api.put('/dashboard/config', { widgets }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['dashboard-config', user?.id] }),
  });

  // Config salva no banco, ou todos habilitados por padrão
  const savedWidgets: WidgetConfig[] = data?.config?.widgets ?? [];

  function isEnabled(id: WidgetId): boolean {
    if (savedWidgets.length === 0) return true; // padrão: tudo visível
    const found = savedWidgets.find(w => w.id === id);
    return found ? found.enabled : true;
  }

  // Mescla: garante que novos widgets adicionados no catálogo apareçam habilitados
  function getMergedConfig(): WidgetConfig[] {
    return availableWidgets.map(w => {
      const saved = savedWidgets.find(s => s.id === w.id);
      return { id: w.id, enabled: saved ? saved.enabled : true };
    });
  }

  return {
    isLoading,
    isEnabled,
    getMergedConfig,
    availableWidgets,
    save,
  };
}
