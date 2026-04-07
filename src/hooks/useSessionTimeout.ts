import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import toast from 'react-hot-toast';

const TIMEOUT_MS = 15 * 60 * 1000; // 15 min — PCI REQ-8

export function useSessionTimeout() {
  const { isAuthenticated, logout } = useAuthStore();
  const [remaining, setRemaining] = useState(TIMEOUT_MS);
  const timerRef    = useRef<ReturnType<typeof setTimeout>>();
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const startRef    = useRef<number>(Date.now());

  const reset = useCallback(() => {
    clearTimeout(timerRef.current);
    clearInterval(intervalRef.current);
    startRef.current = Date.now();
    setRemaining(TIMEOUT_MS);

    timerRef.current = setTimeout(() => {
      logout();
      toast('⏱ Sessão expirada por inatividade (15 min)', { icon: '🔒' });
    }, TIMEOUT_MS);

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      const r = Math.max(0, TIMEOUT_MS - elapsed);
      setRemaining(r);
      if (r === 0) clearInterval(intervalRef.current);
    }, 5000);
  }, [logout]);

  useEffect(() => {
    if (!isAuthenticated()) return;
    const events = ['click', 'keydown', 'mousemove', 'scroll', 'touchstart'];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      events.forEach((e) => window.removeEventListener(e, reset));
      clearTimeout(timerRef.current);
      clearInterval(intervalRef.current);
    };
  }, [isAuthenticated, reset]);

  const mins    = Math.floor(remaining / 60000);
  const secs    = Math.floor((remaining % 60000) / 1000);
  const pct     = (remaining / TIMEOUT_MS) * 100;
  const warning = remaining < 2 * 60 * 1000;
  const danger  = remaining < 60 * 1000;

  return {
    remaining,
    label: `${mins}m${secs.toString().padStart(2, '0')}s`,
    pct,
    warning,
    danger,
  };
}
