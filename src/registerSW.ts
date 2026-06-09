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
    // Polling adicional: além da checagem automática do browser, força
    // registration.update() periódico pra pegar atualização sem precisar reload.
    if (registration) {
      setInterval(() => {
        registration.update().catch(() => {});
      }, POLL_INTERVAL_MS);
    }
  },
  onNeedRefresh() {
    // Nova versão disponível → recarrega silencioso sem perguntar.
    // `true` = chama skipWaiting e ativa o novo SW imediatamente.
    updateSW(true);
  },
});
