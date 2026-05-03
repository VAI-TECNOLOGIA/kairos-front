import { Capacitor } from '@capacitor/core';
import {
  PushNotifications,
  Token,
  ActionPerformed,
  PushNotificationSchema,
} from '@capacitor/push-notifications';

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL ?? '';

let registeredToken: string | null = null;

export async function setupPushNotifications(jwt: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  const permission = await PushNotifications.requestPermissions();
  if (permission.receive !== 'granted') {
    console.info('[push] permission denied');
    return;
  }

  await PushNotifications.register();

  await PushNotifications.addListener('registration', async (token: Token) => {
    registeredToken = token.value;
    try {
      await fetch(`${API_BASE}/notifications/subscribe`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type' : 'application/json',
        },
        body: JSON.stringify({
          token   : token.value,
          platform: Capacitor.getPlatform(),
        }),
      });
    } catch (err) {
      console.error('[push] subscribe failed', err);
    }
  });

  await PushNotifications.addListener('registrationError', (err) => {
    console.error('[push] registration error', err);
  });

  await PushNotifications.addListener('pushNotificationReceived', (notif: PushNotificationSchema) => {
    console.info('[push] foreground notification', notif);
  });

  await PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
    const url = action.notification.data?.url;
    if (url && typeof url === 'string') {
      window.location.href = url;
    }
  });
}

export async function unsubscribePushNotifications(jwt: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await PushNotifications.removeAllListeners();
  } catch {
    // safe ignore
  }

  try {
    await fetch(`${API_BASE}/notifications/unsubscribe`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type' : 'application/json',
      },
      body: JSON.stringify(registeredToken ? { token: registeredToken } : {}),
    });
  } catch (err) {
    console.error('[push] unsubscribe failed', err);
  } finally {
    registeredToken = null;
  }
}
