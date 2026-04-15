import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, X, CheckCheck, AlertTriangle, DollarSign, Info } from 'lucide-react';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';

interface Notification {
  id      : string;
  type    : string;
  title   : string;
  body    : string;
  orderId?: string;
  isRead  : boolean;
  createdAt: string;
}

function notifIcon(type: string) {
  if (type.includes('REFUND'))  return <AlertTriangle size={14} className="text-amber flex-shrink-0 mt-0.5" />;
  if (type.includes('SALE') || type.includes('ORDER')) return <DollarSign size={14} className="text-green flex-shrink-0 mt-0.5" />;
  return <Info size={14} className="text-accent flex-shrink-0 mt-0.5" />;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref             = useRef<HTMLDivElement>(null);
  const queryClient     = useQueryClient();

  // Fecha ao clicar fora
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const { data: countData } = useQuery<{ count: number }>({
    queryKey    : ['notif-count'],
    queryFn     : () => api.get('/notifications/unread-count').then(r => r.data),
    refetchInterval: 30_000,
  });

  const { data: listData } = useQuery<{ data: Notification[] }>({
    queryKey: ['notifications'],
    queryFn : () => api.get('/notifications').then(r => r.data),
    enabled : open,
  });

  const readAllMutation = useMutation({
    mutationFn: () => api.put('/notifications/read-all'),
    onSuccess : () => {
      queryClient.invalidateQueries({ queryKey: ['notif-count'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const readOneMutation = useMutation({
    mutationFn: (id: string) => api.put(`/notifications/${id}/read`),
    onSuccess : () => {
      queryClient.invalidateQueries({ queryKey: ['notif-count'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const unread  = countData?.count ?? 0;
  const notifs  = listData?.data   ?? [];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="btn-ghost btn-sm relative"
        aria-label="Notificações"
      >
        <Bell size={16} />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red rounded-full text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 bg-bg2 border border-border rounded-xl shadow-xl z-50 flex flex-col max-h-[420px]">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
            <span className="text-sm font-semibold text-text">Notificações</span>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button
                  onClick={() => readAllMutation.mutate()}
                  className="flex items-center gap-1 text-[11px] text-accent hover:underline"
                >
                  <CheckCheck size={12} />
                  Marcar todas
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-text3 hover:text-text">
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Lista */}
          <div className="overflow-y-auto flex-1">
            {notifs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                <Bell size={22} className="text-text3 mb-2" />
                <p className="text-sm text-text3">Nenhuma notificação</p>
              </div>
            ) : (
              notifs.map(n => (
                <button
                  key={n.id}
                  onClick={() => { if (!n.isRead) readOneMutation.mutate(n.id); }}
                  className={`w-full text-left flex gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-bg3/50 transition-colors ${
                    !n.isRead ? 'bg-accent/5' : ''
                  }`}
                >
                  {notifIcon(n.type)}
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium leading-tight ${!n.isRead ? 'text-text' : 'text-text2'}`}>
                      {n.title}
                    </p>
                    <p className="text-[11px] text-text3 mt-0.5 leading-snug line-clamp-2">{n.body}</p>
                    <p className="text-[10px] text-text3 mt-1">{formatDate(n.createdAt)}</p>
                  </div>
                  {!n.isRead && (
                    <div className="w-2 h-2 bg-accent rounded-full flex-shrink-0 mt-1" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
