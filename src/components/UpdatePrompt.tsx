import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { applyUpdateAndReload } from '@/registerSW';

/**
 * Banner fixo que aparece quando o PWA detecta uma nova versão em produção.
 * O botão "Atualizar agora" limpa TODO o cache e recarrega 100% limpo — o
 * usuário não precisa saber atalho de teclado nem mexer em configuração.
 *
 * Disparado pelo evento `pwa:need-refresh` (ver src/registerSW.ts).
 */
export default function UpdatePrompt() {
  const [show, setShow]         = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const onNeed = () => setShow(true);
    window.addEventListener('pwa:need-refresh', onNeed);
    return () => window.removeEventListener('pwa:need-refresh', onNeed);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[200] w-[calc(100%-2rem)] max-w-sm">
      <div className="rounded-xl border border-accent/40 bg-bg2 shadow-xl p-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-accent/15 flex items-center justify-center flex-shrink-0">
            <RefreshCw size={16} className={`text-accent ${updating ? 'animate-spin' : ''}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-text leading-tight">Nova versão disponível</p>
            <p className="text-xs text-text3 leading-tight mt-0.5">Atualize para pegar as últimas correções.</p>
          </div>
        </div>
        <button
          onClick={async () => { setUpdating(true); await applyUpdateAndReload(); }}
          disabled={updating}
          className="btn-primary btn-sm w-full justify-center mt-3 disabled:opacity-60"
        >
          {updating ? 'Atualizando…' : 'Atualizar agora'}
        </button>
      </div>
    </div>
  );
}
