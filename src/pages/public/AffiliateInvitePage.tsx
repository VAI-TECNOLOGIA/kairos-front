import { useState } from 'react';
import { Link, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useTheme, logoForTheme } from '@/hooks/useTheme';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { formatBRL } from '@/lib/utils';
import { maskDocument, maskPhone, validateDocument } from '@/lib/cpf';
import { Eye, EyeOff, Lock, Mail, User, Phone, CreditCard, CheckCircle, Image as ImageIcon, Sparkles, Cookie, Percent } from 'lucide-react';

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

const glassCard: React.CSSProperties = {
  background          : 'rgba(255, 255, 255, 0.04)',
  backdropFilter      : 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  boxShadow           : '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)',
};

interface InviteData {
  offerId      : string;
  offerName    : string;
  productName  : string;
  productImage : string | null;
  producerName : string | null;
  priceCents   : number;
  commissionBps: number;
  commissionPct: number;
  cookieDays   : number;
  description  : string | null;
}

export default function AffiliateInvitePage() {
  const { offerSlug } = useParams<{ offerSlug: string }>();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const [searchParams] = useSearchParams();
  const upline = searchParams.get('upline');
  const [success, setSuccess] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [docValue, setDocValue] = useState('');
  const [phoneValue, setPhoneValue] = useState('');

  const { data: invite, isLoading, error } = useQuery<InviteData>({
    queryKey: ['affiliate-invite', offerSlug],
    queryFn : () => api.get(`/affiliates/invite/${offerSlug}`).then(r => r.data),
    enabled : !!offerSlug,
    retry   : false,
  });

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const registerMut = useMutation({
    mutationFn: (data: FormData) => api.post(`/affiliates/invite/${offerSlug}/register`, {
      ...data,
      document: data.document?.replace(/\D/g, '') || undefined,
      phone   : data.phone?.replace(/\D/g, '') || undefined,
      ...(upline ? { referrerCode: upline } : {}),
    }),
    onSuccess: () => setSuccess(true),
    onError  : (e: any) => toast.error(e?.response?.data?.message || 'Erro ao cadastrar'),
  });

  const enrollMut = useMutation({
    mutationFn: () => api.post(`/affiliates/invite/${offerSlug}/enroll`, upline ? { referrerCode: upline } : {}).then(r => r.data),
    onSuccess : (data: any) => {
      if (data.alreadyEnrolled) {
        toast.success('Você já está afiliado a essa oferta!');
      } else {
        toast.success('Afiliação criada! Veja em "Meus links".');
      }
      navigate('/afiliado/links');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erro ao se afiliar'),
  });

  const wrap = (children: React.ReactNode) => (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ background: '#080e1a' }}>
      <style>{`
        @keyframes orb1 { 0%,100%{transform:translate(-50%,-50%) scale(1);opacity:.07}50%{transform:translate(-45%,-55%) scale(1.2);opacity:.13} }
        @keyframes orb2 { 0%,100%{transform:translate(0,0) scale(1);opacity:.05}33%{transform:translate(-40px,30px) scale(1.15);opacity:.10}66%{transform:translate(20px,-20px) scale(.95);opacity:.07} }
        @keyframes grid-move { 0%{background-position:0 0}100%{background-position:60px 60px} }
      `}</style>
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
        backgroundSize: '60px 60px', animation: 'grid-move 12s linear infinite',
      }} />
      <div className="absolute pointer-events-none" style={{ top:'30%',left:'-10%',width:900,height:900,borderRadius:'50%',background:'radial-gradient(circle,#124d86 0%,transparent 60%)',opacity:.9,filter:'blur(80px)',animation:'orb1 9s ease-in-out infinite' }} />
      <div className="absolute pointer-events-none" style={{ top:'-10%',right:'-10%',width:700,height:700,borderRadius:'50%',background:'radial-gradient(circle,#0c6b8a 0%,transparent 60%)',opacity:.85,filter:'blur(70px)',animation:'orb2 11s ease-in-out infinite' }} />
      <div className="w-full max-w-md relative z-10 animate-slide-up">{children}</div>
    </div>
  );

  if (isLoading) return wrap(<div className="text-center text-text2">Carregando convite...</div>);

  if (error || !invite) {
    return wrap(
      <div className="p-8 rounded-2xl border border-white/10 text-center" style={glassCard}>
        <h2 className="text-lg font-bold text-text mb-2">Convite indisponível</h2>
        <p className="text-sm text-text2 mb-6">
          {(error as any)?.response?.data?.message || 'Esta oferta não está disponível para afiliação.'}
        </p>
        <Link to="/login" className="btn-primary w-full justify-center">Voltar</Link>
      </div>
    );
  }

  if (success) {
    return wrap(
      <div className="p-8 rounded-2xl border border-white/10 text-center" style={glassCard}>
        <div className="w-14 h-14 bg-green/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={28} className="text-green" />
        </div>
        <h2 className="text-lg font-bold text-text mb-2">Cadastro enviado!</h2>
        <p className="text-sm text-text2 mb-6">
          Você já está pré-afiliado à oferta <strong>{invite.offerName}</strong>. Aguarde a aprovação para começar a divulgar.
        </p>
        <Link to="/login" className="btn-primary w-full justify-center">Ir para o login</Link>
      </div>
    );
  }

  const inviteCard = (
    <div className="p-5 rounded-2xl border border-white/10 mb-4" style={glassCard}>
      <div className="flex gap-4 items-start">
        <div className="w-20 h-20 rounded-xl bg-bg3 flex-shrink-0 overflow-hidden border border-white/10">
          {invite.productImage ? (
            <img src={invite.productImage} alt={invite.productName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center"><ImageIcon size={28} className="text-text3" /></div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-text3 uppercase tracking-wide">Convite para afiliação</div>
          <div className="font-bold text-text leading-tight">{invite.productName}</div>
          <div className="text-xs text-text2 mt-0.5">{invite.offerName} · {formatBRL(invite.priceCents)}</div>
          {invite.producerName && (
            <div className="text-[11px] text-text3 mt-1">Produtor: {invite.producerName}</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-4">
        <div className="bg-green/10 border border-green/20 rounded-[7px] p-2.5 flex items-center gap-2">
          <Percent size={14} className="text-green flex-shrink-0" />
          <div>
            <div className="text-[10px] text-text3 uppercase">Comissão</div>
            <div className="text-sm font-bold text-green">{invite.commissionPct}%</div>
          </div>
        </div>
        <div className="bg-accent/10 border border-accent/20 rounded-[7px] p-2.5 flex items-center gap-2">
          <Cookie size={14} className="text-accent flex-shrink-0" />
          <div>
            <div className="text-[10px] text-text3 uppercase">Cookie</div>
            <div className="text-sm font-bold text-accent">{invite.cookieDays} dias</div>
          </div>
        </div>
      </div>

      {invite.description && (
        <p className="text-xs text-text2 mt-3 leading-relaxed">{invite.description}</p>
      )}

      <div className="mt-3 text-[11px] text-text3 flex items-center gap-1">
        <Sparkles size={11} /> Comissão sai automaticamente da parte do produtor — você não tem custo.
      </div>
    </div>
  );

  if (user) {
    return wrap(
      <>
        <div className="text-center mb-6">
          <img src={logoForTheme(theme)} alt="Kairos Way" className="w-14 h-14 object-contain mx-auto mb-3" />
          <h1 className="text-xl font-bold text-text">KAIROS WAY</h1>
        </div>
        {inviteCard}
        <div className="p-5 rounded-2xl border border-white/10 text-center" style={glassCard}>
          <p className="text-sm text-text2 mb-4">
            Logado como <strong>{user.name}</strong>
          </p>
          <button
            onClick={() => enrollMut.mutate()}
            disabled={enrollMut.isPending}
            className="btn-primary w-full justify-center py-3"
          >
            {enrollMut.isPending ? 'Afiliando...' : 'Quero me afiliar'}
          </button>
        </div>
      </>
    );
  }

  return wrap(
    <>
      <div className="text-center mb-6">
        <img src={logoForTheme(theme)} alt="Kairos Way" className="w-14 h-14 object-contain mx-auto mb-3" />
        <h1 className="text-xl font-bold text-text">KAIROS WAY</h1>
      </div>
      {inviteCard}
      <div className="p-6 rounded-2xl border border-white/10" style={glassCard}>
        <form onSubmit={handleSubmit(d => registerMut.mutate(d))} className="space-y-3">
          <div className="form-group">
            <label className="label">Nome completo</label>
            <div className="relative">
              <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text3" />
              <input {...register('name')} className="input pl-9" placeholder="Seu nome completo" />
            </div>
            {errors.name && <span className="text-xs text-red">{errors.name.message}</span>}
          </div>
          <div className="form-group">
            <label className="label">Email</label>
            <div className="relative">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text3" />
              <input {...register('email')} type="email" className="input pl-9" placeholder="seu@email.com" />
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
                className="input pl-9 pr-10"
                placeholder="Mínimo 6 caracteres"
              />
              <button type="button" onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text3 hover:text-text2">
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {errors.password && <span className="text-xs text-red">{errors.password.message}</span>}
          </div>
          <div className="form-group">
            <label className="label">Telefone <span className="text-text3">(opcional)</span></label>
            <div className="relative">
              <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text3" />
              <input value={phoneValue} onChange={e => { const m = maskPhone(e.target.value); setPhoneValue(m); setValue('phone', m); }}
                className="input pl-9" placeholder="(11) 99999-9999" maxLength={15} inputMode="numeric" />
            </div>
          </div>
          <div className="form-group">
            <label className="label">CPF / CNPJ <span className="text-text3">(opcional)</span></label>
            <div className="relative">
              <CreditCard size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text3" />
              <input value={docValue} onChange={e => { const m = maskDocument(e.target.value); setDocValue(m); setValue('document', m, { shouldValidate: true }); }}
                className="input pl-9" placeholder="000.000.000-00" maxLength={18} inputMode="numeric" />
            </div>
            {errors.document && <span className="text-xs text-red">{errors.document.message}</span>}
          </div>
          <button type="submit" disabled={registerMut.isPending} className="btn-primary w-full justify-center py-3 mt-2">
            {registerMut.isPending ? 'Enviando...' : 'Quero me afiliar'}
          </button>
        </form>
      </div>
      <p className="text-center text-sm text-text3 mt-4">
        Já tem conta?{' '}
        <Link to={`/login?next=/afiliar/${offerSlug}`} className="text-accent hover:underline">Fazer login</Link>
      </p>
    </>
  );
}
