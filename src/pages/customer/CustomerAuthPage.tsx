import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useTheme, logoForTheme } from '@/hooks/useTheme';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/stores/auth.store';
import api from '@/lib/api';
import type { LoginResponse } from '@/types';
import { Eye, EyeOff, Lock, Mail, User } from 'lucide-react';

// ── SCHEMAS ────────────────────────────────────────────────────────────────
const loginSchema = z.object({
  email   : z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
});

const registerSchema = z.object({
  name    : z.string().min(2, 'Nome obrigatório'),
  email   : z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});

type LoginData    = z.infer<typeof loginSchema>;
type RegisterData = z.infer<typeof registerSchema>;

const glassCard: React.CSSProperties = {
  background          : 'rgba(255,255,255,0.04)',
  backdropFilter      : 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  boxShadow           : '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)',
};

const inputFocus = 'focus:!border-white/20 focus:!ring-0';

export default function CustomerAuthPage() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [searchParams] = useSearchParams();
  const { setAuth }    = useAuthStore();

  // Tab inicial: se vier ?tab=register, abre em cadastro
  const [tab, setTab]         = useState<'login' | 'register'>(
    searchParams.get('tab') === 'register' ? 'register' : 'login'
  );
  const [showPass, setShowPass] = useState(false);

  // Email pré-preenchido (vindo do checkout)
  const prefillEmail = searchParams.get('email') || '';

  const loginForm = useForm<LoginData>({
    resolver     : zodResolver(loginSchema),
    defaultValues: { email: prefillEmail },
  });

  const registerForm = useForm<RegisterData>({
    resolver     : zodResolver(registerSchema),
    defaultValues: { email: prefillEmail },
  });

  // ── LOGIN ──────────────────────────────────────────────────────────
  const loginMutation = useMutation({
    mutationFn: (data: LoginData) =>
      api.post<LoginResponse>('/auth/login', data),
    onSuccess: async ({ data }) => {
      if (data.requiresMfa && data.tempToken) {
        sessionStorage.setItem('mfa_temp', data.tempToken);
        navigate('/mfa');
        return;
      }
      if (data.user && data.accessToken && data.refreshToken) {
        setAuth(data.user, data.accessToken, data.refreshToken);
        // Vincula orders por email após login
        try { await api.post('/customer/link-orders'); } catch {}
        toast.success(`Bem-vindo, ${data.user.name.split(' ')[0]}!`);
        navigate('/cliente/compras');
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Email ou senha incorretos');
    },
  });

  // ── REGISTER ──────────────────────────────────────────────────────
  const registerMutation = useMutation({
    mutationFn: (data: RegisterData) =>
      api.post('/customer/register', data),
    onSuccess: ({ data }) => {
      if (data.user && data.accessToken && data.refreshToken) {
        setAuth(data.user, data.accessToken, data.refreshToken);
        toast.success('Conta criada! Seus pedidos foram vinculados.');
        navigate('/cliente/compras');
      }
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Erro ao criar conta';
      // Conta já existe → manda para login
      if (err?.response?.status === 409) {
        toast.error('E-mail já cadastrado. Faça login para continuar.');
        setTab('login');
        loginForm.setValue('email', registerForm.getValues('email'));
      } else {
        toast.error(msg);
      }
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ background: '#080e1a' }}>
      <style>{`
        @keyframes orb1 { 0%,100%{transform:translate(-50%,-50%) scale(1);opacity:.07}50%{transform:translate(-45%,-55%) scale(1.2);opacity:.13} }
        @keyframes orb2 { 0%,100%{transform:translate(0,0) scale(1);opacity:.05}33%{transform:translate(-40px,30px) scale(1.15);opacity:.10}66%{transform:translate(20px,-20px) scale(.95);opacity:.07} }
        @keyframes orb3 { 0%,100%{transform:translate(0,0) scale(1);opacity:.04}50%{transform:translate(30px,-40px) scale(1.1);opacity:.09} }
        @keyframes grid-move { 0%{background-position:0 0}100%{background-position:60px 60px} }
      `}</style>

      {/* Grid */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.04) 1px,transparent 1px)',
        backgroundSize: '60px 60px', animation: 'grid-move 12s linear infinite',
      }} />
      {/* Orbs */}
      <div className="absolute pointer-events-none" style={{ top:'30%',left:'-10%',width:900,height:900,borderRadius:'50%',background:'radial-gradient(circle,#124d86 0%,transparent 60%)',opacity:.9,filter:'blur(80px)',animation:'orb1 9s ease-in-out infinite' }} />
      <div className="absolute pointer-events-none" style={{ top:'-10%',right:'-10%',width:700,height:700,borderRadius:'50%',background:'radial-gradient(circle,#0c6b8a 0%,transparent 60%)',opacity:.85,filter:'blur(70px)',animation:'orb2 11s ease-in-out infinite' }} />
      <div className="absolute pointer-events-none" style={{ bottom:'-10%',left:'-5%',width:650,height:650,borderRadius:'50%',background:'radial-gradient(circle,#27d36a 0%,transparent 60%)',opacity:.65,filter:'blur(80px)',animation:'orb3 13s ease-in-out infinite' }} />
      <div className="absolute pointer-events-none" style={{ bottom:'5%',right:'-5%',width:500,height:500,borderRadius:'50%',background:'radial-gradient(circle,#1fe36f 0%,transparent 60%)',opacity:.35,filter:'blur(70px)',animation:'orb1 10s ease-in-out infinite reverse' }} />

      <div className="w-full max-w-sm relative z-10 animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src={logoForTheme(theme)} alt="Kairos Way" className="w-16 h-16 object-contain mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-text">KAIROS WAY</h1>
          <p className="text-sm text-text2 mt-1">Acompanhe seus pedidos</p>
        </div>

        {/* Card glass */}
        <div className="p-6 rounded-2xl border border-white/10" style={glassCard}>

          {/* Tabs */}
          <div className="flex gap-1 mb-6 bg-black/20 rounded-[8px] p-1">
            {(['login', 'register'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-1.5 rounded-[6px] text-sm font-medium transition-all ${
                  tab === t
                    ? 'bg-accent text-white shadow-sm'
                    : 'text-text3 hover:text-text2'
                }`}
              >
                {t === 'login' ? 'Entrar' : 'Criar conta'}
              </button>
            ))}
          </div>

          {/* ── LOGIN ─────────────────────────────────────────── */}
          {tab === 'login' && (
            <form onSubmit={loginForm.handleSubmit(d => loginMutation.mutate(d))} className="space-y-4">
              <div className="form-group">
                <label className="label">Email</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text3" />
                  <input
                    {...loginForm.register('email')}
                    type="email"
                    className={`input pl-9 ${inputFocus}`}
                    placeholder="seu@email.com"
                    autoComplete="email"
                  />
                </div>
                {loginForm.formState.errors.email && (
                  <span className="text-xs text-red">{loginForm.formState.errors.email.message}</span>
                )}
              </div>

              <div className="form-group">
                <label className="label">Senha</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text3" />
                  <input
                    {...loginForm.register('password')}
                    type={showPass ? 'text' : 'password'}
                    className={`input pl-9 pr-10 ${inputFocus}`}
                    placeholder="••••••••••••"
                    autoComplete="current-password"
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text3 hover:text-text2">
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {loginForm.formState.errors.password && (
                  <span className="text-xs text-red">{loginForm.formState.errors.password.message}</span>
                )}
              </div>

              <button type="submit" disabled={loginMutation.isPending}
                className="btn-primary w-full justify-center py-3 mt-2">
                {loginMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Entrando...
                  </span>
                ) : 'Entrar'}
              </button>
            </form>
          )}

          {/* ── REGISTER ──────────────────────────────────────── */}
          {tab === 'register' && (
            <form onSubmit={registerForm.handleSubmit(d => registerMutation.mutate(d))} className="space-y-4">
              <div className="form-group">
                <label className="label">Nome completo</label>
                <div className="relative">
                  <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text3" />
                  <input {...registerForm.register('name')}
                    className={`input pl-9 ${inputFocus}`} placeholder="Seu nome completo" />
                </div>
                {registerForm.formState.errors.name && (
                  <span className="text-xs text-red">{registerForm.formState.errors.name.message}</span>
                )}
              </div>

              <div className="form-group">
                <label className="label">Email</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text3" />
                  <input {...registerForm.register('email')} type="email"
                    className={`input pl-9 ${inputFocus}`} placeholder="seu@email.com" />
                </div>
                {registerForm.formState.errors.email && (
                  <span className="text-xs text-red">{registerForm.formState.errors.email.message}</span>
                )}
              </div>

              <div className="form-group">
                <label className="label">Senha</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text3" />
                  <input {...registerForm.register('password')}
                    type={showPass ? 'text' : 'password'}
                    className={`input pl-9 pr-10 ${inputFocus}`}
                    placeholder="Mínimo 6 caracteres" />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text3 hover:text-text2">
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {registerForm.formState.errors.password && (
                  <span className="text-xs text-red">{registerForm.formState.errors.password.message}</span>
                )}
              </div>

              <button type="submit" disabled={registerMutation.isPending}
                className="btn-primary w-full justify-center py-3 mt-2">
                {registerMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Criando conta...
                  </span>
                ) : 'Criar conta grátis'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-text3 mt-4">
          <Link to="/cliente/marketplace" className="text-accent hover:underline">
            Ver produtos sem entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
