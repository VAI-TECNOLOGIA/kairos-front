import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { X } from 'lucide-react';

interface SpecialMessage {
  id     : string;
  title  : string;
  body   : string;
  icon   : string | null;
  ctaUrl : string | null;
  ctaText: string | null;
}

/**
 * Modal que mostra a mensagem especial ativa (se houver e o user ainda não dispensou).
 * Renderiza nos layouts de Producer e Affiliate.
 * Backend escolhe qual mensagem mostrar via /special-messages/active.
 */
export function SpecialMessageDialog() {
  const qc = useQueryClient();

  const { data } = useQuery<{ message: SpecialMessage | null }>({
    queryKey: ['special-message-active'],
    queryFn : () => api.get('/special-messages/active').then(r => r.data),
    retry   : false,
    staleTime: 5 * 60 * 1_000,
  });

  const dismiss = useMutation({
    mutationFn: (id: string) => api.post(`/special-messages/${id}/dismiss`),
    onSuccess : () => qc.invalidateQueries({ queryKey: ['special-message-active'] }),
  });

  const message = data?.message;
  if (!message) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="card max-w-md w-full relative shadow-2xl border border-primary/20">
        <button
          onClick={() => dismiss.mutate(message.id)}
          disabled={dismiss.isPending}
          className="absolute top-3 right-3 text-text3 hover:text-text transition-colors"
          title="Fechar"
        >
          <X size={18} />
        </button>

        <div className="text-center pt-2 pb-1">
          {message.icon && (
            <div className="text-5xl mb-3 leading-none">{message.icon}</div>
          )}
          <h2 className="text-lg font-bold text-text mb-2">{message.title}</h2>
          <p className="text-sm text-text2 whitespace-pre-line">{message.body}</p>
        </div>

        {message.ctaUrl && (
          <div className="mt-5 flex gap-2">
            <a
              href={message.ctaUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => dismiss.mutate(message.id)}
              className="btn-primary flex-1 text-center"
            >
              {message.ctaText || 'Saiba mais'}
            </a>
            <button
              onClick={() => dismiss.mutate(message.id)}
              disabled={dismiss.isPending}
              className="btn-ghost"
            >
              Depois
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
