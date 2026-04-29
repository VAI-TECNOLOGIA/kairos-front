import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import api from '@/lib/api';

/**
 * Rota pública /auth/impersonate?token=...
 * Recebe um JWT temporário gerado pelo admin e loga automaticamente
 * com o perfil alvo. Redireciona pra dashboard apropriada.
 */
export default function ImpersonatePage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = params.get('token');
    if (!token) { setError('Link inválido — token ausente.'); setLoading(false); return; }

    (async () => {
      try {
        // Busca o /auth/me usando o token temporário pra obter o user completo
        const res = await fetch(`${api.defaults.baseURL || ''}/auth/me`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!res.ok) {
          setError(res.status === 401 ? 'Link expirado ou inválido.' : 'Falha ao acessar conta.');
          setLoading(false);
          return;
        }
        const user = await res.json();

        // Guarda o token de impersonate como accessToken — refreshToken vazio (impersonate é stateless)
        setAuth(
          { id: user.id, name: user.name, email: user.email, role: user.role, mfaEnabled: user.mfaEnabled },
          token,
          token, // sem refresh real
        );

        // Marca flag pra UI mostrar banner
        sessionStorage.setItem('kairos_impersonating', '1');

        // Redireciona conforme papel
        const target =
          user.role === 'ADMIN' || user.role === 'STAFF' ? '/admin/dashboard' :
          user.role === 'PRODUCER'  ? '/produtor/dashboard' :
          user.role === 'AFFILIATE' || user.role === 'COPRODUCER' ? '/afiliado/dashboard' :
          '/cliente/compras';
        navigate(target, { replace: true });
      } catch (e: any) {
        setError(e?.message || 'Erro inesperado.');
        setLoading(false);
      }
    })();
  }, [params, navigate, setAuth]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-6">
      <div className="card max-w-md w-full p-6 text-center">
        {loading && !error && (
          <>
            <div className="w-10 h-10 border-2 border-accent/30 border-t-accent rounded-full animate-spin mx-auto mb-4" />
            <h1 className="text-base font-semibold text-text">Acessando conta…</h1>
            <p className="text-xs text-text3 mt-2">Aguarde — você será redirecionado.</p>
          </>
        )}
        {error && (
          <>
            <h1 className="text-base font-semibold text-red mb-2">Não foi possível acessar</h1>
            <p className="text-sm text-text2">{error}</p>
            <p className="text-xs text-text3 mt-3">Peça ao admin pra gerar um novo link (válido por 5 minutos).</p>
          </>
        )}
      </div>
    </div>
  );
}
