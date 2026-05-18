import { Capacitor } from '@capacitor/core';

/**
 * URL pública usada quando o app gera links pra COMPARTILHAR com terceiros
 * (checkout, afiliação, etc).
 *
 * Em web (browser): usa `window.location.origin` (sempre dev.kairosway.com.br
 * em produção, ou localhost em dev).
 *
 * Em native (iOS/Android via Capacitor): retorna a URL pública oficial. Sem
 * isso, `window.location.origin` retorna `capacitor://localhost` (iOS) ou
 * `https://localhost` (Android) — links impossíveis de abrir fora do app.
 */
export function publicOrigin(): string {
  if (Capacitor.isNativePlatform()) {
    return 'https://dev.kairosway.com.br';
  }
  return window.location.origin;
}
