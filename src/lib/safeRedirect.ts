/**
 * safeRedirect — barreira contra open redirect (CWE-601).
 *
 * Aceita SÓ URLs cujo host bate com:
 *   - mesma origem da app (self)
 *   - allowlist explícita (OAuth dos parceiros: Pagar.me, Bling, MelhorEnvio)
 *
 * Path/relative URLs (começam com "/") são sempre OK — não saem do site.
 *
 * Se rejeitar, loga warn no console e devolve `'/'` (volta pra raiz com segurança).
 */

const ALLOWED_EXTERNAL_HOSTS = new Set<string>([
  'dashboard.pagar.me',
  'api.pagar.me',
  'www.bling.com.br',
  'bling.com.br',
  'melhorenvio.com.br',
  'www.melhorenvio.com.br',
  'sandbox.melhorenvio.com.br',
  'app.vaicrm.com.br',
  'api.vaicrm.com.br',
]);

export function safeRedirect(url: string | undefined | null): string {
  if (!url || typeof url !== 'string') return '/';
  const trimmed = url.trim();
  if (!trimmed) return '/';

  // Path relativo dentro do app — sempre permitido
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return trimmed;

  // URL absoluta — valida host
  try {
    const parsed = new URL(trimmed, window.location.origin);
    // Mesma origem
    if (parsed.origin === window.location.origin) return parsed.pathname + parsed.search + parsed.hash;
    // Host externo permitido (OAuth)
    if (ALLOWED_EXTERNAL_HOSTS.has(parsed.host)) return parsed.toString();
    // Rejeita
    console.warn(`[safeRedirect] redirect bloqueado: ${parsed.host} não está na allowlist`);
    return '/';
  } catch {
    console.warn(`[safeRedirect] URL inválida: ${trimmed}`);
    return '/';
  }
}

/** Atalho seguro pra `window.location.href = url`. */
export function navigateSafely(url: string | undefined | null): void {
  window.location.href = safeRedirect(url);
}
