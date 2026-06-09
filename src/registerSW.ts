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
    // Nova versão disponível → recarrega silencioso sem perguntar.
    // `true` = chama skipWaiting e ativa o novo SW imediatamente.
    updateSW(true);
  },
});
