import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Eye, EyeOff, Lock, Mail, User, Phone, CheckCircle, CreditCard } from 'lucide-react';
import { maskDocument, maskPhone, validateDocument } from '@/lib/cpf';

const schema = z.object({
  name    : z.string().min(2, 'Nome obrigatório'),
  email   : z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  phone   : z.string().optional(),
  document: z.string().optional().refine(
    v => !v || validateDocument(v) === null,
    v => ({ message: validateDocument(v || '') || 'Documento inválido' })
  ),
});

type FormData = z.infer<typeof schema>;

// Zod converte '' em undefined, mas precisamos passar string vazia para o backend
function cleanDoc(value: string | undefined) {
  return value?.replace(/\D/g, '') || undefined;
}

const glassCard: React.CSSProperties = {
  background          : 'rgba(255, 255, 255, 0.04)',
  backdropFilter      : 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  boxShadow           : '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)',
};

const inputFocus = 'focus:!border-white/20 focus:!ring-0';

export default function AffiliateRegisterPage() {
  const [success,  setSuccess]  = useState(false);
  const [approved, setApproved] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [docValue, setDocValue] = useState('');
  const [phoneValue, setPhoneValue] = useState('');

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const res = await api.post('/affiliates/register', {
        ...data,
        document: cleanDoc(data.document),
        phone   : data.phone?.replace(/\D/g, '') || undefined,
      });
      setApproved(!!res?.data?.approved);
      setSuccess(true);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Erro ao cadastrar');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
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
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '60px 60px', animation: 'grid-move 12s linear infinite',
        }} />
        {/* Orbs */}
        <div className="absolute pointer-events-none" style={{ top:'30%',left:'-10%',width:900,height:900,borderRadius:'50%',background:'radial-gradient(circle,#124d86 0%,transparent 60%)',opacity:.9,filter:'blur(80px)',animation:'orb1 9s ease-in-out infinite' }} />
        <div className="absolute pointer-events-none" style={{ top:'-10%',right:'-10%',width:700,height:700,borderRadius:'50%',background:'radial-gradient(circle,#0c6b8a 0%,transparent 60%)',opacity:.85,filter:'blur(70px)',animation:'orb2 11s ease-in-out infinite' }} />
        <div className="absolute pointer-events-none" style={{ bottom:'-10%',left:'-5%',width:650,height:650,borderRadius:'50%',background:'radial-gradient(circle,#27d36a 0%,transparent 60%)',opacity:.65,filter:'blur(80px)',animation:'orb3 13s ease-in-out infinite' }} />
        <div className="absolute pointer-events-none" style={{ bottom:'5%',right:'-5%',width:500,height:500,borderRadius:'50%',background:'radial-gradient(circle,#1fe36f 0%,transparent 60%)',opacity:.35,filter:'blur(70px)',animation:'orb1 10s ease-in-out infinite reverse' }} />

        <div className="w-full max-w-sm relative z-10 animate-slide-up">
          <div className="text-center mb-8">
            <img src="/kairosLogo.png" alt="Kairos Way" className="w-16 h-16 object-contain mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-text">KAIROS WAY</h1>
            <p className="text-sm text-text2 mt-1">Gateway de Pagamentos</p>
          </div>

          <div className="p-8 rounded-2xl border border-white/10 text-center" style={glassCard}>
            <div className="w-14 h-14 bg-green/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={28} className="text-green" />
            </div>
            <h2 className="text-lg font-bold text-text mb-2">
              {approved ? 'Cadastro aprovado!' : 'Cadastro enviado!'}
            </h2>
            <p className="text-sm text-text2 mb-6">
              {approved
                ? 'Sua conta foi criada e já está ativa. Faça login pra começar a divulgar.'
                : 'Seu cadastro está em análise. Você receberá acesso assim que um produtor aprovar sua solicitação.'}
            </p>
            <Link to="/login" className="btn-primary w-full justify-center">
              {approved ? 'Ir pro login' : 'Voltar para o login'}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ background: '#080e1a' }}>
      <style>{`
        @keyframes orb1 {
          0%, 100% { transform: translate(-50%, -50%) scale(1);    opacity: 0.07; }
          50%       { transform: translate(-45%, -55%) scale(1.2); opacity: 0.13; }
        }
        @keyframes orb2 {
          0%, 100% { transform: translate(0, 0) scale(1);          opacity: 0.05; }
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
          <img src="/kairosLogo.png" alt="Kairos Way" className="w-16 h-16 object-contain mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-text">KAIROS WAY</h1>
          <p className="text-sm text-text2 mt-1">Quero ser afiliado</p>
        </div>

        {/* Card glass */}
        <div className="p-6 rounded-2xl border border-white/10" style={glassCard}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

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
                <input {...register('email')} type="email" className={`input pl-9 ${inputFocus}`} placeholder="seu@email.com" />
              </div>
              {errors.email && <span className="text-xs text-red">{errors.email.message}</span>}
            </div>

            <div className="form-group">
              <label className="label">Senha</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text3" />
                <input
                  {...register('password')}
                  type={showPass ? 'text' : 'password'}
                  className={`input pl-9 pr-10 ${inputFocus}`}
                  placeholder="Mínimo 6 caracteres"
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
                  inputMode="numeric"
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

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 mt-2">
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Enviando...
                </span>
              ) : 'Enviar cadastro'}
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
