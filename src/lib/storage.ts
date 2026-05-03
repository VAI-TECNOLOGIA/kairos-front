import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const isNative = Capacitor.isNativePlatform();

export async function setStorageItem(key: string, value: string): Promise<void> {
  if (isNative) {
    await Preferences.set({ key, value });
  } else {
    localStorage.setItem(key, value);
  }
}

export async function getStorageItem(key: string): Promise<string | null> {
  if (isNative) {
    const { value } = await Preferences.get({ key });
    return value;
  }
  return localStorage.getItem(key);
}

export async function removeStorageItem(key: string): Promise<void> {
  if (isNative) {
    await Preferences.remove({ key });
  } else {
    localStorage.removeItem(key);
  }
}

export async function clearStorage(): Promise<void> {
  if (isNative) {
    await Preferences.clear();
  } else {
    localStorage.clear();
  }
}

export function getStorageItemSync(key: string): string | null {
  if (isNative) {
    return null;
  }
  return localStorage.getItem(key);
}
