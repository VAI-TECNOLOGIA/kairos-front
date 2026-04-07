import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './styles/globals.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime          : 1000 * 60, // 1 min
      refetchOnWindowFocus: false,
      retry              : 1,
    },
  },
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
      {/* FIX F-54: DevTools apenas em desenvolvimento */}
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  </React.StrictMode>
);