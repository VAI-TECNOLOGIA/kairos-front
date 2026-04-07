import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'STAFF' | 'PRODUCER' | 'COPRODUCER' | 'AFFILIATE';
  mfaEnabled?: boolean;
}

interface AuthState {
  user        : AuthUser | null;
  accessToken : string | null;
  refreshToken: string | null;
  sessionStart: number | null;
  hydrated: boolean;

  setAuth       : (user: AuthUser, accessToken: string, refreshToken: string) => void;
  setTokens     : (accessToken: string, refreshToken: string) => void;
  logout        : () => void;
  isAuthenticated: () => boolean;
  isAdmin       : () => boolean;
  isProducer    : () => boolean;
  setHydrated: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user        : null,
      accessToken : null,
      refreshToken: null,
      sessionStart: null,
      hydrated: false,

      setAuth: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken, sessionStart: Date.now() }),

      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken, sessionStart: Date.now() }),

      logout: () =>
        set({ user: null, accessToken: null, refreshToken: null, sessionStart: null }),

      isAuthenticated: () => !!get().accessToken && !!get().user,

      isAdmin   : () => ['ADMIN', 'STAFF'].includes(get().user?.role || ''),
      isProducer: () => get().user?.role === 'PRODUCER',

      setHydrated: (v) => set({ hydrated: v }),
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