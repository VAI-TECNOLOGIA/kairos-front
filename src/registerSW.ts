/// <reference types="vite-plugin-pwa/client" />
/**
 * Registra o Service Worker do PWA e força reload silencioso quando detectar
 * uma versão nova no servidor.
 *
 * Antes (configuração `registerType: 'autoUpdate'` sem este módulo):
 *   - O SW novo é instalado e ativado (skipWaiting/clientsClaim) mas o JS já
 *     carregado em memória continua rodando até o user fechar todas as abas.
 *     Resultado: bug do usuário ver UI antiga após deploy.
 *
 * Depois (este módulo):
 *   - A cada navegação E a cada 60s, o browser checa /sw.js.
 *   - Quando detecta nova versão, dispara `onNeedRefresh` → `updateSW(true)`
 *     que troca o SW e dá location.reload() automático.
 *
 * Sem prompt visível ao user — atualização silenciosa.
 */

import { registerSW } from 'virtual:pwa-register';

const POLL_INTERVAL_MS = 60_000; // checa /sw.js a cada 60s

const updateSW = registerSW({
  immediate: true,
  onRegisteredSW(swUrl, registration) {
    if (!registration) return;
    const checkForUpdate = () => registration.update().catch(() => {});

    // Poll periódico — MAS o navegador estrangula timers em aba de fundo,
    // então sozinho ele atrasa a atualização (causa de usuário ver versão antiga).
    setInterval(checkForUpdate, POLL_INTERVAL_MS);

    // Gatilhos imediatos que cobrem o timer estrangulado: quando o usuário
    // volta o foco, reabre/torna a aba visível, ou reconecta à internet,
    // checamos atualização NA HORA — garante que ninguém fica preso na versão antiga.
    window.addEventListener('focus', checkForUpdate);
    window.addEventListener('online', checkForUpdate);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') checkForUpdate();
    });
  },
  onNeedRefresh() {
    // Nova versão detectada → avisa a UI (banner "Atualizar agora").
    // Não recarrega no susto: o usuário decide quando, e o botão limpa o cache.
    window.dispatchEvent(new CustomEvent('pwa:need-refresh'));
  },
});

/**
 * Chamado pelo botão "Atualizar agora" do banner: limpa TODOS os caches do
 * PWA e ativa a nova versão com reload — garante carregamento 100% limpo.
 */
export async function applyUpdateAndReload(): Promise<void> {
  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {
    /* se a limpeza falhar, segue pro reload mesmo assim */
  }
  await updateSW(true); // skipWaiting + ativa o SW novo + recarrega
}
