// ── MFA PAGE ──────────────────────────────────────────────────────
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/stores/auth.store';
import api from '@/lib/api';
import type { LoginResponse } from '@/types';
import { Shield } from 'lucide-react';

export default function MfaPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const tempToken = sessionStorage.getItem('mfa_temp') || '';

  const mfaMutation = useMutation({
    mutationFn: (code: string) =>
      api.post<LoginResponse>('/auth/mfa/verify', { tempToken, code }),
    onSuccess: ({ data }) => {
      if (data.user && data.accessToken && data.refreshToken) {
        setAuth(data.user, data.accessToken, data.refreshToken);
        sessionStorage.removeItem('mfa_temp');
        toast.success('MFA verificado! Bem-vindo.');
        // Usa location.href para garantir que o store persist foi gravado
        // antes de renderizar as rotas protegidas
        const dest = data.user.role === 'PRODUCER' ? '/produtor/dashboard' : '/admin/dashboard';
        window.location.href = dest;
      }
    },
    onError: () => toast.error('Código inválido. Tente novamente.'),
  });

  const handleInput = (i: number, v: string) => {
    if (!/^\d?$/.test(v)) return;
    const next = [...code];
    next[i] = v;
    setCode(next);
    if (v && i < 5) inputsRef.current[i + 1]?.focus();
    if (next.every((d) => d !== '')) mfaMutation.mutate(next.join(''));
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[i] && i > 0) inputsRef.current[i - 1]?.focus();
  };

  useEffect(() => { inputsRef.current[0]?.focus(); }, []);
  if (!tempToken) { navigate('/login'); return null; }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm animate-slide-up">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-accent/15 border border-accent/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield size={24} className="text-accent" />
          </div>
          <h1 className="text-xl font-bold text-text">Verificação em 2 Fatores</h1>
          <p className="text-sm text-text2 mt-1">Digite o código de 6 dígitos do seu app autenticador</p>
        </div>

        <div className="card p-6">
          <div className="bg-accent/5 border border-accent/20 rounded-[7px] p-3 mb-5 flex items-center gap-2">
            <Shield size={13} className="text-accent flex-shrink-0" />
            <span className="text-xs text-text2">MFA obrigatório para Admin — PCI DSS REQ-8</span>
          </div>

          <div className="flex gap-2 justify-center mb-6">
            {code.map((d, i) => (
              <input
                key={i}
                ref={(el) => { inputsRef.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={(e) => handleInput(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="w-11 h-12 text-center text-xl font-bold font-mono bg-bg3 border border-border rounded-[7px] text-text outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-colors"
              />
            ))}
          </div>

          <button
            onClick={() => mfaMutation.mutate(code.join(''))}
            disabled={code.some((d) => !d) || mfaMutation.isPending}
            className="btn-primary w-full justify-center py-3"
          >
            {mfaMutation.isPending ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Verificando...
              </span>
            ) : 'Verificar código'}
          </button>

          <button onClick={() => { sessionStorage.removeItem('mfa_temp'); navigate('/login'); }}
            className="btn-ghost w-full justify-center mt-2 text-text3">
            Voltar ao login
          </button>
        </div>
      </div>
    </div>
  );
}