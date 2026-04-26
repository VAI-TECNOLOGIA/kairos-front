import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/stores/auth.store';
import api from '@/lib/api';
import type { LoginResponse } from '@/types';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';

const schema = z.object({
  email   : z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [showPass, setShowPass] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const loginMutation = useMutation({
    mutationFn: (data: FormData) =>
      api.post<LoginResponse>('/auth/login', { email: data.email, password: data.password }),
    onSuccess: ({ data }) => {
      if (data.requiresMfa && data.tempToken) {
        sessionStorage.setItem('mfa_temp', data.tempToken);
        navigate('/mfa');
        return;
      }
      if (data.user && data.accessToken && data.refreshToken) {
        setAuth(data.user, data.accessToken, data.refreshToken);
        toast.success(`Bem-vindo, ${data.user.name}!`);
        if (data.user.role === 'CUSTOMER')  { navigate('/cliente/compras');  return; }
        if (data.user.role === 'PRODUCER')  { navigate('/produtor/dashboard'); return; }
        if (data.user.role === 'AFFILIATE') { navigate('/afiliado/dashboard'); return; }
        navigate('/admin/dashboard');
      }
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Erro ao fazer login';
      toast.error(msg);
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ background: '#080e1a' }}>

      {/* Animations */}
      <style>{`
        @keyframes orb1 {
          0%, 100% { transform: translate(-50%, -50%) scale(1);   opacity: 0.07; }
          50%       { transform: translate(-45%, -55%) scale(1.2); opacity: 0.13; }
        }
        @keyframes orb2 {
          0%, 100% { transform: translate(0, 0) scale(1);         opacity: 0.05; }
          33%       { transform: translate(-40px, 30px) scale(1.15); opacity: 0.10; }
          66%       { transform: translate(20px, -20px) scale(0.95); opacity: 0.07; }
        }
        @keyframes orb3 {
          0%, 100% { transform: translate(0, 0) scale(1);    opacity: 0.04; }
          50%       { transform: translate(30px, -40px) scale(1.1); opacity: 0.09; }
        }
        @keyframes grid-move {
          0%   { background-position: 0 0; }
          100% { background-position: 60px 60px; }
        }
      `}</style>

      {/* Grid animado */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
        animation: 'grid-move 12s linear infinite',
      }} />

      {/* Orbs */}
      <div className="absolute pointer-events-none" style={{
        top: '30%', left: '-10%',
        width: 900, height: 900, borderRadius: '50%',
        background: 'radial-gradient(circle, #124d86 0%, transparent 60%)',
        opacity: 0.9, filter: 'blur(80px)',
        animation: 'orb1 9s ease-in-out infinite',
      }} />
      <div className="absolute pointer-events-none" style={{
        top: '-10%', right: '-10%',
        width: 700, height: 700, borderRadius: '50%',
        background: 'radial-gradient(circle, #0c6b8a 0%, transparent 60%)',
        opacity: 0.85, filter: 'blur(70px)',
        animation: 'orb2 11s ease-in-out infinite',
      }} />
      <div className="absolute pointer-events-none" style={{
        bottom: '-10%', left: '-5%',
        width: 650, height: 650, borderRadius: '50%',
        background: 'radial-gradient(circle, #27d36a 0%, transparent 60%)',
        opacity: 0.65, filter: 'blur(80px)',
        animation: 'orb3 13s ease-in-out infinite',
      }} />
      <div className="absolute pointer-events-none" style={{
        bottom: '5%', right: '-5%',
        width: 500, height: 500, borderRadius: '50%',
        background: 'radial-gradient(circle, #1fe36f 0%, transparent 60%)',
        opacity: 0.35, filter: 'blur(70px)',
        animation: 'orb1 10s ease-in-out infinite reverse',
      }} />

      <div className="w-full max-w-sm relative z-10 animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/kairosLogo.png" alt="Kairos Way" className="w-16 h-16 object-contain mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-text">KAIROS WAY</h1>
          <p className="text-sm text-text2 mt-1">Gateway de Pagamentos</p>
        </div>

        {/* Card com efeito glass */}
        <div
          className="p-6 rounded-2xl border border-white/10"
          style={{
            background    : 'rgba(255, 255, 255, 0.04)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            boxShadow     : '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)',
          }}
        >
          <form onSubmit={handleSubmit((d) => loginMutation.mutate(d))}>
            {/* Email */}
            <div className="form-group">
              <label className="label">Email</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text3" />
                <input
                  {...register('email')}
                  type="email"
                  className="input pl-9 focus:!border-white/20 focus:!ring-0"
                  placeholder="seu@email.com"
                  autoComplete="email"
                />
              </div>
              {errors.email && <span className="text-xs text-red">{errors.email.message}</span>}
            </div>

            {/* Password */}
            <div className="form-group">
              <label className="label">Senha</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text3" />
                <input
                  {...register('password')}
                  type={showPass ? 'text' : 'password'}
                  className="input pl-9 pr-10 focus:!border-white/20 focus:!ring-0"
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text3 hover:text-text2"
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.password && <span className="text-xs text-red">{errors.password.message}</span>}
              <div className="text-right mt-1">
                <Link to="/esqueci-senha" className="text-xs text-text3 hover:text-accent">
                  Esqueci minha senha
                </Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="btn-primary w-full justify-center py-3 mt-2"
            >
              {loginMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Entrando...
                </span>
              ) : 'Entrar'}
            </button>
          </form>
        </div>

        {/* Register link */}
        <p className="text-center text-sm text-text3 mt-4">
          Quer ser produtor?{' '}
          <Link to="/cadastro" className="text-accent hover:underline">
            Solicitar cadastro
          </Link>
        </p>
      </div>
    </div>
  );
}
