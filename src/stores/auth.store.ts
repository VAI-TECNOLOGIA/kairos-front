import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Capacitor } from '@capacitor/core';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'STAFF' | 'PRODUCER' | 'COPRODUCER' | 'AFFILIATE' | 'CUSTOMER';
  mfaEnabled?: boolean;
}

interface AuthState {
  user        : AuthUser | null;
  accessToken : string | null;
  refreshToken: string | null;
  sessionStart: number | null;
  hydrated    : boolean;

  setAuth        : (user: AuthUser, accessToken: string, refreshToken: string) => void;
  setTokens      : (accessToken: string, refreshToken: string) => void;
  logout         : () => void;
  clearAuth      : () => void;
  isAuthenticated: () => boolean;
  isAdmin        : () => boolean;
  isProducer     : () => boolean;
  setHydrated    : (v: boolean) => void;
}

// QueryClient é injetado externamente para evitar dependência circular
let _queryClient: { clear: () => void } | null = null;
export function injectQueryClient(qc: { clear: () => void }) {
  _queryClient = qc;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user        : null,
      accessToken : null,
      refreshToken: null,
      sessionStart: null,
      hydrated    : false,

      setAuth: (user, accessToken, refreshToken) => {
        // Limpa todo o cache do React Query ao trocar de usuário
        _queryClient?.clear();
        set({ user, accessToken, refreshToken, sessionStart: Date.now() });
        if (Capacitor.isNativePlatform()) {
          import('@/lib/push-notifications')
            .then(m => {
              m.setPushJwtProvider(() => get().accessToken);
              return m.setupPushNotifications();
            })
            .catch(err => console.error('[push] setup failed', err));
        }
      },

      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken, sessionStart: Date.now() }),

      logout: () => {
        const prevToken = get().accessToken;
        _queryClient?.clear();
        set({ user: null, accessToken: null, refreshToken: null, sessionStart: null });
        if (Capacitor.isNativePlatform() && prevToken) {
          import('@/lib/push-notifications')
            .then(m => m.unsubscribePushNotifications(prevToken))
            .catch(err => console.error('[push] unsubscribe failed', err));
        }
      },

      clearAuth: () => {
        const prevToken = get().accessToken;
        _queryClient?.clear();
        set({ user: null, accessToken: null, refreshToken: null, sessionStart: null });
        if (Capacitor.isNativePlatform() && prevToken) {
          import('@/lib/push-notifications')
            .then(m => m.unsubscribePushNotifications(prevToken))
            .catch(err => console.error('[push] unsubscribe failed', err));
        }
      },

      isAuthenticated: () => !!get().accessToken && !!get().user,
      isAdmin        : () => ['ADMIN', 'STAFF'].includes(get().user?.role || ''),
      isProducer     : () => get().user?.role === 'PRODUCER',
      setHydrated    : (v) => set({ hydrated: v }),
    }),
    {
      name   : 'kairos-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user        : state.user,
        accessToken : state.accessToken,
        refreshToken: state.refreshToken,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);