import { Capacitor } from '@capacitor/core';
import {
  PushNotifications,
  Token,
  ActionPerformed,
  PushNotificationSchema,
} from '@capacitor/push-notifications';
import { Preferences } from '@capacitor/preferences';
import { navigateSafely } from './safeRedirect';

const API_BASE = (import.meta as any).env?.VITE_API_URL ?? '';

interface PushState {
  setupStarted: boolean;
  setupCompleted: boolean;
  permissionState: PermissionState | 'unknown';
  registeredToken: string | null;
  lastSubscribeStatus: number | null;
  lastError: string | null;
}

type PermissionState = 'granted' | 'denied' | 'prompt' | 'prompt-with-rationale';

// Estado em memória — exposto via getPushState() pra debug visual no app.
const state: PushState = {
  setupStarted: false,
  setupCompleted: false,
  permissionState: 'unknown',
  registeredToken: null,
  lastSubscribeStatus: null,
  lastError: null,
};

export function getPushState(): Readonly<PushState> {
  return { ...state };
}

// Provider de JWT mais recente (lê do auth.store na hora do fetch, não captura no closure).
// Isso evita usar JWT expirado quando o evento 'registration' demora pra emitir.
type JwtProvider = () => string | null;
let getJwt: JwtProvider = () => null;
export function setPushJwtProvider(provider: JwtProvider): void {
  getJwt = provider;
}

async function postSubscribe(token: string, platform: string): Promise<void> {
  const jwt = getJwt();
  if (!jwt) {
    state.lastError = 'no JWT available at registration time';
    return;
  }
  try {
    const res = await fetch(`${API_BASE}/notifications/subscribe`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type' : 'application/json',
      },
      body: JSON.stringify({ token, platform }),
    });
    state.lastSubscribeStatus = res.status;
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      state.lastError = `subscribe HTTP ${res.status}: ${txt.slice(0, 200)}`;
    } else {
      state.registeredToken = token;
      state.lastError = null;
    }
  } catch (err: any) {
    state.lastError = `subscribe network: ${err?.message || err}`;
  }
}

/**
 * Idempotente: se já rodou nesta sessão, retorna sem refazer.
 * Pode ser chamado tanto no login quanto no boot (se já houver auth).
 */
export async function setupPushNotifications(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  if (state.setupStarted) return;
  state.setupStarted = true;

  try {
    // Permissão runtime (Android 13+ e iOS). Retorna {receive: 'granted'|'denied'|'prompt'}.
    const perm = await PushNotifications.requestPermissions();
    state.permissionState = perm.receive as PermissionState;
    if (perm.receive !== 'granted') {
      state.lastError = `permission ${perm.receive}`;
      return;
    }

    // ⚠️ ORDEM CORRETA: attach listeners ANTES de register().
    // Senão o evento 'registration' (com o FCM token) pode emitir antes do listener
    // estar pronto, e o token é perdido pra sempre nesta sessão.
    await PushNotifications.addListener('registration', async (token: Token) => {
      let actualToken = token.value;

      // iOS: the stock @capacitor/push-notifications plugin emits the APNs
      // device token in hex (64 chars). The backend uses Firebase Admin SDK
      // (sendEachForMulticast) which needs FCM registration tokens — APNs hex
      // is rejected with messaging/invalid-registration-token.
      // AppDelegate's `messaging:didReceiveRegistrationToken` saves the FCM
      // token under UserDefaults key `CapacitorStorage.fcmToken`, which is
      // exactly what Capacitor Preferences reads. We poll briefly because the
      // FCM token may arrive a few hundred ms AFTER the APNs registration
      // callback fires.
      if (Capacitor.getPlatform() === 'ios') {
        for (let attempt = 0; attempt < 10; attempt++) {
          const { value: fcm } = await Preferences.get({ key: 'fcmToken' });
          if (fcm && fcm.length > 80) {
            actualToken = fcm;
            break;
          }
          await new Promise(r => setTimeout(r, 500));
        }
      }

      await postSubscribe(actualToken, Capacitor.getPlatform());
    });

    await PushNotifications.addListener('registrationError', (err) => {
      state.lastError = `registrationError: ${JSON.stringify(err)}`;
    });

    await PushNotifications.addListener('pushNotificationReceived', (_notif: PushNotificationSchema) => {
      // foreground notification — Capacitor mostra automaticamente se presentationOptions
      // estiver setado no capacitor.config (já está: ['badge','sound','alert']).
    });

    await PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
      const url = action.notification.data?.url;
      if (url && typeof url === 'string') {
        navigateSafely(url);                              // valida host antes (defesa contra notificação maliciosa)
      }
    });

    // Agora sim: dispara o registration. O listener acima vai capturar o token.
    await PushNotifications.register();
    state.setupCompleted = true;
  } catch (err: any) {
    state.lastError = `setup: ${err?.message || err}`;
  }
}

export async function unsubscribePushNotifications(jwt: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  const tokenToUnsubscribe = state.registeredToken;

  try {
    await PushNotifications.removeAllListeners();
  } catch {
    // ignore
  }

  // Reset estado pra que próximo login refaça setup.
  state.setupStarted = false;
  state.setupCompleted = false;
  state.permissionState = 'unknown';
  state.registeredToken = null;
  state.lastSubscribeStatus = null;
  state.lastError = null;

  try {
    await fetch(`${API_BASE}/notifications/unsubscribe`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type' : 'application/json',
      },
      body: JSON.stringify(tokenToUnsubscribe ? { token: tokenToUnsubscribe } : {}),
    });
  } catch {
    // best-effort, ignore
  }
}
