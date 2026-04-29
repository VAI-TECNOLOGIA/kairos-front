import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTheme, logoForTheme } from '@/hooks/useTheme';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Eye, EyeOff, Lock, Mail, User, Phone, Building2, CreditCard } from 'lucide-react';
import { maskDocument, maskPhone, validateDocument } from '@/lib/cpf';

const schema = z.object({
  name       : z.string().min(3, 'Nome obrigatório'),
  email      : z.string().email('Email inválido'),
  password   : z.string().min(12, 'Mínimo 12 caracteres'),
  companyName: z.string().optional(),
  phone      : z.string().optional(),
  document   : z.string().optional().refine(
    v => !v || validateDocument(v) === null,
    v => ({ message: validateDocument(v || '') || 'Documento inválido' })
  ),
});

type FormData = z.infer<typeof schema>;

const glassCard: React.CSSProperties = {
  background          : 'rgba(255, 255, 255, 0.04)',
  backdropFilter      : 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  boxShadow           : '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)',
};

const inputFocus = 'focus:!border-white/20 focus:!ring-0';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [showPass,    setShowPass]    = useState(false);
  const [phoneValue,  setPhoneValue]  = useState('');
  const [docValue,    setDocValue]    = useState('');

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const mutation = useMutation({
    mutationFn: (d: FormData) => api.post('/auth/register', {
      ...d,
      phone   : d.phone?.replace(/\D/g, '') || undefined,
      document: d.document?.replace(/\D/g, '') || undefined,
    }),
    onSuccess: () => {
      toast.success('Cadastro enviado! Aguarde a aprovação do administrador.');
      navigate('/login');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Erro ao cadastrar'),
  });

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ background: '#080e1a' }}>

      <style>{`
        @keyframes orb1 {
          0%, 100% { transform: translate(-50%, -50%) scale(1);    opacity: 0.07; }
          50%       { transform: translate(-45%, -55%) scale(1.2); opacity: 0.13; }
        }
        @keyframes orb2 {
          0%, 100% { transform: translate(0, 0) scale(1);           opacity: 0.05; }
          33%       { transform: translate(-40px, 30px) scale(1.15); opacity: 0.10; }
          66%       { transform: translate(20px, -20px) scale(0.95); opacity: 0.07; }
        }
        @keyframes orb3 {
          0%, 100% { transform: translate(0, 0) scale(1);           opacity: 0.04; }
          50%       { transform: translate(30px, -40px) scale(1.1);  opacity: 0.09; }
        }
        @keyframes grid-move {
          0%   { background-position: 0 0; }
          100% { background-position: 60px 60px; }
        }
      `}</style>

      {/* Grid animado */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
        backgroundSize : '60px 60px',
        animation      : 'grid-move 12s linear infinite',
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
          <p className="text-sm text-text2 mt-1">Solicitar cadastro de produtor</p>
        </div>

        {/* Card glass */}
        <div className="p-6 rounded-2xl border border-white/10" style={glassCard}>
          <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">

            <div className="form-group">
              <label className="label">Nome completo</label>
              <div className="relative">
                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text3" />
                <input {...register('name')} className={`input pl-9 ${inputFocus}`} placeholder="Seu nome completo" />
              </div>
              {errors.name && <span className="text-xs text-red">{errors.name.message}</span>}
            </div>

            <div className="form-group">
              <label className="label">Email</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text3" />
                <input {...register('email')} type="email" className={`input pl-9 ${inputFocus}`} placeholder="seu@email.com" autoComplete="email" />
              </div>
              {errors.email && <span className="text-xs text-red">{errors.email.message}</span>}
            </div>

            <div className="form-group">
              <label className="label">Senha <span className="text-text3">(mínimo 12 caracteres)</span></label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text3" />
                <input
                  {...register('password')}
                  type={showPass ? 'text' : 'password'}
                  className={`input pl-9 pr-10 ${inputFocus}`}
                  placeholder="••••••••••••"
                  autoComplete="new-password"
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
            </div>

            <div className="form-group">
              <label className="label">Empresa <span className="text-text3">(opcional)</span></label>
              <div className="relative">
                <Building2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text3" />
                <input {...register('companyName')} className={`input pl-9 ${inputFocus}`} placeholder="Nome da empresa" />
              </div>
            </div>

            <div className="form-group">
              <label className="label">Telefone <span className="text-text3">(opcional)</span></label>
              <div className="relative">
                <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text3" />
                <input
                  value={phoneValue}
                  onChange={e => {
                    const masked = maskPhone(e.target.value);
                    setPhoneValue(masked);
                    setValue('phone', masked);
                  }}
                  className={`input pl-9 ${inputFocus}`}
                  placeholder="(11) 99999-9999"
                  maxLength={15}
                  inputMode="tel"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="label">CPF / CNPJ <span className="text-text3">(opcional)</span></label>
              <div className="relative">
                <CreditCard size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text3" />
                <input
                  value={docValue}
                  onChange={e => {
                    const masked = maskDocument(e.target.value);
                    setDocValue(masked);
                    setValue('document', masked, { shouldValidate: true });
                  }}
                  className={`input pl-9 ${inputFocus}`}
                  placeholder="000.000.000-00"
                  maxLength={18}
                  inputMode="numeric"
                />
              </div>
              {errors.document && <span className="text-xs text-red">{errors.document.message}</span>}
            </div>

            <button
              type="submit"
              disabled={mutation.isPending}
              className="btn-primary w-full justify-center py-3 mt-2"
            >
              {mutation.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Enviando...
                </span>
              ) : 'Enviar solicitação'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-text3 mt-4">
          Já tem conta?{' '}
          <Link to="/login" className="text-accent hover:underline">Fazer login</Link>
        </p>
      </div>
    </div>
  );
}
