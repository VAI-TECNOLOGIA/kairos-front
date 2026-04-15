import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './styles/globals.css';
import { injectQueryClient, useAuthStore } from '@/stores/auth.store';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime           : 1000 * 60, // 1 min
      refetchOnWindowFocus: false,
      retry               : 1,
    },
  },
});

// Injeta o queryClient no auth store para limpeza de cache ao trocar de usuário
injectQueryClient(queryClient);

// Detecta troca de sessão entre abas (ex: admin em uma aba, afiliado em outra)
// Quando o localStorage muda em outra aba, força reload se o userId mudou
window.addEventListener('storage', (e) => {
  if (e.key !== 'kairos-auth') return;

  const prev = e.oldValue ? JSON.parse(e.oldValue) : null;
  const next = e.newValue ? JSON.parse(e.newValue) : null;

  const prevId = prev?.state?.user?.id;
  const nextId = next?.state?.user?.id;

  // Usuário mudou em outra aba — limpa e redireciona para login
  if (prevId && nextId && prevId !== nextId) {
    queryClient.clear();
    useAuthStore.getState().clearAuth();
    window.location.href = '/login';
  }

  // Outra aba fez logout — sincroniza
  if (prevId && !nextId) {
    queryClient.clear();
    useAuthStore.getState().clearAuth();
    window.location.href = '/login';
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background  : '#0D1130',
              color       : '#E8EEFF',
              border      : '1px solid rgba(61,69,96,0.5)',
              borderRadius: '8px',
              fontSize    : '13px',
            },
            success: { iconTheme: { primary: '#00C9A7', secondary: '#0D1130' } },
            error  : { iconTheme: { primary: '#FF4D6D', secondary: '#0D1130' } },
          }}
        />
      </BrowserRouter>
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  </React.StrictMode>
);