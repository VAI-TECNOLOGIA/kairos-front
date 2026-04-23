import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Mail, KeyRound, Lock, ArrowLeft, ArrowRight, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

type Step = 'email' | 'code' | 'password';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep]             = useState<Step>('email');
  const [email, setEmail]           = useState('');
  const [code, setCode]             = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPass, setNewPass]       = useState('');
  const [showPass, setShowPass]     = useState(false);

  // ── Passo 1: envia código ──
  const requestCode = useMutation({
    mutationFn: () => api.post('/auth/forgot-password', { email }),
    onSuccess: () => {
      toast.success('Se houver cadastro, você receberá um código por e-mail.');
      setStep('code');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Erro ao solicitar código'),
  });

  // ── Passo 2: valida código ──
  const verifyCode = useMutation({
    mutationFn: () => api.post<{ resetToken: string }>('/auth/verify-reset-code', { email, code }),
    onSuccess: (res) => {
      setResetToken(res.data.resetToken);
      setStep('password');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Código inválido ou expirado'),
  });

  // ── Passo 3: troca senha ──
  const resetPass = useMutation({
    mutationFn: () => api.post('/auth/reset-password', { resetToken, newPassword: newPass }),
    onSuccess: () => {
      toast.success('Senha alterada com sucesso. Faça login com a nova senha.');
      navigate('/login');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Erro ao alterar senha'),
  });

  const stepIndex = step === 'email' ? 1 : step === 'code' ? 2 : 3;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-bg">
      <div className="w-full max-w-md">
        <Link to="/login" className="inline-flex items-center gap-1.5 text-xs text-text3 hover:text-accent mb-4">
          <ArrowLeft size={13} /> Voltar ao login
        </Link>

        <div className="card">
          {/* Header */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center flex-shrink-0">
              <KeyRound size={18} className="text-accent" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-text">Recuperar senha</h1>
              <p className="text-xs text-text3">Passo {stepIndex} de 3</p>
            </div>
          </div>

          {/* Progresso */}
          <div className="flex gap-1.5 mb-5">
            {[1, 2, 3].map(n => (
              <div
                key={n}
                className={`flex-1 h-1 rounded-full transition-colors ${
                  n <= stepIndex ? 'bg-accent' : 'bg-bg3'
                }`}
              />
            ))}
          </div>

          {/* Passo 1 — Email */}
          {step === 'email' && (
            <form onSubmit={e => { e.preventDefault(); if (email) requestCode.mutate(); }}>
              <p className="text-sm text-text2 mb-4 leading-relaxed">
                Digite seu e-mail cadastrado. Enviaremos um código de 6 dígitos
                com validade de 15 minutos.
              </p>
              <div className="form-group">
                <label className="label">E-mail</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="input pl-9"
                    placeholder="seu@email.com"
                    autoComplete="email"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={requestCode.isPending || !email}
                className="btn-primary w-full justify-center py-2.5 mt-3"
              >
                {requestCode.isPending ? 'Enviando...' : <>Enviar código <ArrowRight size={14} /></>}
              </button>
            </form>
          )}

          {/* Passo 2 — Código */}
          {step === 'code' && (
            <form onSubmit={e => { e.preventDefault(); if (code.length === 6) verifyCode.mutate(); }}>
              <p className="text-sm text-text2 mb-1 leading-relaxed">
                Código enviado para <strong className="text-text">{email}</strong>.
              </p>
              <p className="text-xs text-text3 mb-4">
                Verifique também a caixa de spam. Válido por 15 minutos.
              </p>
              <div className="form-group">
                <label className="label">Código de 6 dígitos</label>
                <input
                  type="text"
                  required
                  inputMode="numeric"
                  maxLength={6}
                  pattern="\d{6}"
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="input font-mono text-center text-xl tracking-[0.5em]"
                  placeholder="000000"
                  autoComplete="one-time-code"
                  autoFocus
                />
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => setStep('email')}
                  className="btn-secondary"
                >
                  <ArrowLeft size={14} />
                </button>
                <button
                  type="submit"
                  disabled={verifyCode.isPending || code.length !== 6}
                  className="btn-primary flex-1 justify-center py-2.5"
                >
                  {verifyCode.isPending ? 'Validando...' : <>Validar <ArrowRight size={14} /></>}
                </button>
              </div>
              <button
                type="button"
                onClick={() => requestCode.mutate()}
                disabled={requestCode.isPending}
                className="text-xs text-text3 hover:text-accent mt-3 w-full text-center"
              >
                {requestCode.isPending ? 'Reenviando...' : 'Reenviar código'}
              </button>
            </form>
          )}

          {/* Passo 3 — Nova senha */}
          {step === 'password' && (
            <form onSubmit={e => { e.preventDefault(); if (newPass.length >= 12) resetPass.mutate(); }}>
              <div className="flex items-center gap-2 mb-4 text-xs text-green">
                <CheckCircle2 size={13} />
                <span>Código validado. Defina sua nova senha.</span>
              </div>
              <div className="form-group">
                <label className="label">Nova senha</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text3" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    required
                    minLength={12}
                    value={newPass}
                    onChange={e => setNewPass(e.target.value)}
                    className="input pl-9 pr-10"
                    placeholder="mínimo 12 caracteres"
                    autoComplete="new-password"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text3 hover:text-text2"
                  >
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <p className="text-[11px] text-text3 mt-1">
                  {newPass.length}/12 caracteres mínimos
                </p>
              </div>
              <button
                type="submit"
                disabled={resetPass.isPending || newPass.length < 12}
                className="btn-primary w-full justify-center py-2.5 mt-2"
              >
                {resetPass.isPending ? 'Alterando...' : 'Alterar senha'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
