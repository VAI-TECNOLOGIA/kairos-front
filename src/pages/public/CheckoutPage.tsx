import { useState, useRef, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { formatBRL } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { Loading } from '@/components/ui';
import { useTracking } from '@/hooks/useTracking';
import { maskDocument, maskPhone, validateDocument } from '@/lib/cpf';
import {
  Shield, Lock, CheckCircle, QrCode, FileText,
  CreditCard, Zap, Clock, Copy, ExternalLink,
  ShieldCheck, BadgeCheck, Wifi, Eye, EyeOff,
  ShoppingBag, Star, Sparkles, ArrowRight,
} from 'lucide-react';
import { sanitizeHtml } from '@/components/RichTextEditor';
import { ICON_MAP, DEFAULT_SUCCESS_ICON, DEFAULT_SUCCESS_COLOR } from '@/lib/successConfig';

// ── HELPERS ───────────────────────────────────────────────────────
async function tokenizeCard(params: {
  number: string; holder: string; expMonth: string; expYear: string; cvv: string;
}): Promise<string> {
  const { data } = await api.post('/checkout/tokenize-card', params);
  if (!data.token) throw new Error('Servidor não retornou token do cartão');
  return data.token;
}

function formatCardNumber(value: string): string {
  return value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
}

function MethodIcon({ method }: { method: string }) {
  if (method === 'PIX')         return <Zap size={18} strokeWidth={1.5} />;
  if (method === 'CREDIT_CARD') return <CreditCard size={18} strokeWidth={1.5} />;
  return <FileText size={18} strokeWidth={1.5} />;
}

const METHOD_LABEL: Record<string, { title: string; sub: string }> = {
  PIX        : { title: 'Pix',    sub: 'Aprovação imediata'   },
  CREDIT_CARD: { title: 'Cartão', sub: 'Crédito em até 12x'   },
  BOLETO     : { title: 'Boleto', sub: 'Vence em 3 dias úteis' },
};

// ── CARTÃO ANIMADO ────────────────────────────────────────────────
function AnimatedCard({ number, holder, expMonth, expYear, flipped }: {
  number: string; holder: string; expMonth: string; expYear: string; flipped: boolean;
}) {
  const displayNumber = number
    ? number.padEnd(19, ' ').slice(0, 19)
    : '•••• •••• •••• ••••';

  return (
    <div style={{ perspective: '1000px', width: '100%', maxWidth: '340px', height: '200px' }}>
      <div style={{
        position: 'relative', width: '100%', height: '100%',
        transformStyle: 'preserve-3d',
        transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
      }}>
        {/* Frente */}
        <div style={{
          position: 'absolute', width: '100%', height: '100%',
          backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' as any,
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #080d24 0%, #0f1a4a 45%, #0a1535 100%)',
          border: '1px solid rgba(0,85,254,0.25)',
          boxShadow: '0 24px 48px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)',
          padding: '22px 24px',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '160px', height: '160px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,85,254,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ width: '40px', height: '30px', borderRadius: '5px', background: 'linear-gradient(135deg, #c8922a, #f5d06e, #b87d20)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gridTemplateRows: '1fr 1fr 1fr', gap: '2px', padding: '4px' }}>
              {[...Array(9)].map((_, i) => (
                <div key={i} style={{ background: i === 4 ? '#b87d20' : 'rgba(0,0,0,0.2)', borderRadius: '1px' }} />
              ))}
            </div>
            <Wifi size={20} style={{ color: 'rgba(255,255,255,0.3)', transform: 'rotate(90deg)' }} />
          </div>
          <div style={{ fontFamily: '"Courier New", monospace', fontSize: '16px', letterSpacing: '0.18em', color: 'rgba(220,230,255,0.92)', fontWeight: 700 }}>
            {displayNumber}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div style={{ flex: 1, minWidth: 0, marginRight: '16px' }}>
              <div style={{ fontSize: '8px', color: 'rgba(220,230,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '3px' }}>Titular</div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(220,230,255,0.88)', letterSpacing: '0.06em', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {holder || 'SEU NOME'}
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: '8px', color: 'rgba(220,230,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '3px' }}>Validade</div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(220,230,255,0.88)', fontFamily: 'monospace' }}>
                {expMonth || 'MM'}/{expYear ? expYear.slice(-2) : 'AA'}
              </div>
            </div>
          </div>
        </div>
        {/* Verso */}
        <div style={{
          position: 'absolute', width: '100%', height: '100%',
          backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' as any,
          transform: 'rotateY(180deg)', borderRadius: '16px',
          background: 'linear-gradient(135deg, #080d24 0%, #0f1a4a 45%, #0a1535 100%)',
          border: '1px solid rgba(0,85,254,0.25)',
          boxShadow: '0 24px 48px rgba(0,0,0,0.6)',
          overflow: 'hidden',
        }}>
          <div style={{ height: '46px', background: '#050810', marginTop: '26px' }} />
          <div style={{ padding: '14px 22px' }}>
            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '6px', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ flex: 1, height: '8px', background: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.07) 0px, rgba(255,255,255,0.07) 8px, transparent 8px, transparent 12px)', borderRadius: '2px' }} />
              <div style={{ fontFamily: 'monospace', fontSize: '14px', color: 'rgba(220,230,255,0.8)', letterSpacing: '0.25em', fontWeight: 700, marginLeft: '12px' }}>•••</div>
            </div>
            <div style={{ fontSize: '8px', color: 'rgba(220,230,255,0.3)', textAlign: 'right', marginTop: '4px', letterSpacing: '0.08em' }}>CVV</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── COMPONENTE PRINCIPAL ──────────────────────────────────────────
export default function CheckoutPage() {
  const { slug }       = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const affiliateRef   = searchParams.get('ref') || searchParams.get('aff') || undefined;

  // Captura UTMs (Utmify + tracking pixels) — persiste entre LP e checkout via sessionStorage.
  const utmParams = (() => {
    const KEYS = ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','src','sck','fbclid','gclid','xcod'];
    const stored = (() => { try { return JSON.parse(sessionStorage.getItem('kairos_utm') || '{}'); } catch { return {}; } })() as Record<string, string>;
    const fromUrl: Record<string, string> = {};
    for (const k of KEYS) {
      const v = searchParams.get(k);
      if (v) fromUrl[k] = v;
    }
    const merged = { ...stored, ...fromUrl };
    if (Object.keys(fromUrl).length > 0) {
      try { sessionStorage.setItem('kairos_utm', JSON.stringify(merged)); } catch {}
    }
    return merged;
  })();
  const navigate       = useNavigate();
  const { isAuthenticated, user, setAuth } = useAuthStore();
  const { fire }       = useTracking(slug);

  // ── Etapa: identificação ou pagamento
  const [step, setStep] = useState<'identify' | 'payment'>(
    isAuthenticated() ? 'payment' : 'identify'
  );

  // ── Estado da etapa de identificação
  const [idTab,      setIdTab]      = useState<'register' | 'login'>('register');
  const [idLoading,  setIdLoading]  = useState(false);
  const [showIdPass, setShowIdPass] = useState(false);
  const [idName,     setIdName]     = useState('');
  const [idEmail,    setIdEmail]    = useState('');
  const [idPass,     setIdPass]     = useState('');

  // ── Estado da etapa de pagamento
  const [result,     setResult]     = useState<any>(null);
  const [cvvFocused, setCvvFocused] = useState(false);

  // ── Polling do status — PIX/Boleto ficam PENDING/PROCESSING e precisam ser
  // atualizados para APPROVED quando o webhook confirmar o pagamento.
  useEffect(() => {
    if (!result?.orderId) return;
    if (result.status === 'APPROVED' || result.status === 'REJECTED' || result.status === 'REFUNDED') return;
    // Só faz polling para PIX/Boleto (cartão já resolve na primeira resposta)
    const isAsync = result.method === 'PIX' || result.method === 'BOLETO' || result.pixCode || result.boletoUrl;
    if (!isAsync) return;

    const interval = setInterval(async () => {
      try {
        const { data } = await api.get(`/checkout/order-status/${result.orderId}`);
        if (data.status === 'APPROVED' || data.status === 'REJECTED' || data.status === 'REFUNDED') {
          setResult((prev: any) => ({ ...prev, ...data }));
          fire('Purchase');
        }
      } catch { /* silencioso */ }
    }, 5000);
    return () => clearInterval(interval);
  }, [result?.orderId, result?.status, result?.method]);

  // ── Oferta
  const { data: offerData, isLoading } = useQuery({
    queryKey: ['checkout-offer', slug],
    queryFn : () => api.get(`/checkout/${slug}`).then(r => r.data),
  });

  // Fire ViewContent once offer loads (deferred so pixel scripts can initialize)
  const offerLoadedRef = useRef(false);
  if (offerData && !offerLoadedRef.current) {
    offerLoadedRef.current = true;
    setTimeout(() => {
      fire('ViewContent');
      // If user is already authenticated, they skip identify → fire InitiateCheckout now
      if (isAuthenticated()) fire('InitiateCheckout');
    }, 500);
  }

  const [docValue,   setDocValue]   = useState('');
  const [phoneValue, setPhoneValue] = useState('');
  const [docError,   setDocError]   = useState('');

  // Cupom de desconto
  const [couponInput,    setCouponInput]    = useState('');
  const [couponLoading,  setCouponLoading]  = useState(false);
  const [couponApplied,  setCouponApplied]  = useState<null | { code: string; discountBps: number; discountCents: number; finalCents: number; priceCents: number }>(null);
  const [couponError,    setCouponError]    = useState('');

  const applyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setCouponLoading(true);
    setCouponError('');
    try {
      const r = await api.get(`/coupons/validate/${encodeURIComponent(code)}?offerSlug=${slug}`);
      if (r.data.valid) {
        setCouponApplied({
          code,
          discountBps  : r.data.discountBps,
          discountCents: r.data.discountCents,
          finalCents   : r.data.finalCents,
          priceCents   : r.data.priceCents,
        });
      } else {
        setCouponError(r.data.reason || 'Cupom inválido');
        setCouponApplied(null);
      }
    } catch (e: any) {
      setCouponError(e?.response?.data?.message || 'Erro ao validar');
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    setCouponApplied(null);
    setCouponInput('');
    setCouponError('');
  };

  // ── Formulário de pagamento (sem nome/email — vêm do auth)
  const { register, handleSubmit, watch, control, setValue, formState: { errors } } = useForm<any>({
    defaultValues: { method: 'PIX', installments: 1 },
  });

  const method       = watch('method');
  const cardNumber   = watch('cardNumber')   || '';
  const cardHolder   = watch('cardHolder')   || '';
  const cardExpMonth = watch('cardExpMonth') || '';
  const cardExpYear  = watch('cardExpYear')  || '';

  // ── Handler: identificação ────────────────────────────────────
  async function handleIdentify(e: React.FormEvent) {
    e.preventDefault();
    if (idTab === 'register' && idName.trim().length < 2) {
      toast.error('Digite seu nome completo'); return;
    }
    if (!idEmail.includes('@')) {
      toast.error('E-mail inválido'); return;
    }
    if (idPass.length < 6) {
      toast.error('A senha precisa ter no mínimo 6 caracteres'); return;
    }
    setIdLoading(true);
    try {
      if (idTab === 'register') {
        const { data } = await api.post('/customer/register', {
          name: idName.trim(), email: idEmail.trim(), password: idPass,
        });
        if (data.user && data.accessToken && data.refreshToken) {
          setAuth(data.user, data.accessToken, data.refreshToken);
          toast.success(`Conta criada! Bem-vindo, ${data.user.name.split(' ')[0]}!`);
          fire('InitiateCheckout');
          setStep('payment');
        }
      } else {
        const { data } = await api.post('/auth/login', {
          email: idEmail.trim(), password: idPass,
        });
        if (data.user && data.accessToken && data.refreshToken) {
          setAuth(data.user, data.accessToken, data.refreshToken);
          try { await api.post('/customer/link-orders'); } catch {}
          toast.success(`Bem-vindo de volta, ${data.user.name.split(' ')[0]}!`);
          fire('InitiateCheckout');
          setStep('payment');
        }
      }
    } catch (err: any) {
      if (err?.response?.status === 409) {
        toast.error('E-mail já cadastrado. Faça login.');
        setIdTab('login');
        setIdPass('');
      } else {
        toast.error(err?.response?.data?.message || 'Erro. Tente novamente.');
      }
    } finally {
      setIdLoading(false);
    }
  }

  // ── Mutation de pagamento ─────────────────────────────────────
  const payMutation = useMutation({
    mutationFn: async (formData: any) => {
      // Bloquear se CPF digitado é inválido (campo preenchido mas com erro)
      if (docError) throw new Error(docError);
      // Validar telefone obrigatório
      if (!phoneValue || phoneValue.replace(/\D/g, '').length < 10) {
        throw new Error('Telefone obrigatório');
      }

      fire('AddPaymentInfo');
      let cardToken: string | undefined;
      if (formData.method === 'CREDIT_CARD') {
        const rawYear = (formData.cardExpYear || '').replace(/\D/g, '');
        const expYear = rawYear.length === 2 ? `20${rawYear}` : rawYear;
        cardToken = await tokenizeCard({
          number  : formData.cardNumber   || '',
          holder  : formData.cardHolder   || '',
          expMonth: (formData.cardExpMonth || '').replace(/\D/g, '').padStart(2, '0'),
          expYear,
          cvv     : formData.cardCvv      || '',
        });
      }
      const payload: any = {
        customerEmail : user?.email || '',
        customerName  : user?.name  || '',
        customerDoc   : docValue  ? docValue.replace(/\D/g, '')   : undefined,
        customerPhone : phoneValue ? phoneValue.replace(/\D/g, '') : undefined,
        method        : formData.method,
      };
      if (cardToken) {
        payload.cardToken    = cardToken;
        payload.cardHolder   = (formData.cardHolder || '').trim();
        payload.installments = Number(formData.installments) || 1;
      }
      // Endereço obrigatório em todos os métodos — necessário para:
      // - Pagar.me validar transações de cartão/boleto
      // - NFe.io emitir nota fiscal após aprovação do pagamento
      if (Object.keys(utmParams).length > 0) {
        payload.utm = utmParams;
      }
      if (couponApplied?.code) {
        payload.couponCode = couponApplied.code;
      }
      if (formData.zipCode && formData.street) {
        payload.billingAddress = {
          street       : formData.street,
          number       : formData.number       || 'S/N',
          complement   : formData.complement   || '',
          neighborhood : formData.neighborhood || '',
          city         : formData.city,
          state        : (formData.state || '').toUpperCase(),
          zipCode      : (formData.zipCode || '').replace(/\D/g, ''),
          country      : 'BR',
        };
      }
      return api.post(`/checkout/${slug}/pay${affiliateRef ? `?ref=${affiliateRef}` : ''}`, payload);
    },
    onSuccess: ({ data }) => {
      console.log('[checkout] payment result:', data);
      setResult(data);
      if (data.status === 'APPROVED') {
        toast.success('Pagamento aprovado!');
        fire('Purchase', { value: offerData?.offer?.priceCents, currency: 'BRL', orderId: data.orderId });
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Erro no pagamento');
    },
  });

  // ── Loading inicial ───────────────────────────────────────────
  if (isLoading) return (
    <div className="min-h-screen bg-bg flex items-center justify-center"><Loading /></div>
  );

  const offer  = offerData?.offer;
  const config = offerData?.config;

  const availableMethods = [
    { v: 'PIX',         show: config?.pixEnabled  !== false },
    { v: 'CREDIT_CARD', show: config?.cardEnabled !== false },
    { v: 'BOLETO',      show: true },
  ].filter(m => m.show);

  // ── TELAS DE RESULTADO ────────────────────────────────────────
  // (verificar antes do formulário principal)
  if (result?.status === 'APPROVED') {
    const iconName  = offer?.successIcon      || DEFAULT_SUCCESS_ICON;
    const iconColor = offer?.successIconColor || DEFAULT_SUCCESS_COLOR;
    const SuccessIcon = ICON_MAP[iconName] || CheckCircle;
    const hexAlpha = (a: string) => `${iconColor}${a}`;

    return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Ícone animado */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="absolute inset-0 rounded-full animate-ping" style={{ background: hexAlpha('1a'), animationDuration: '2s' }} />
            <div className="absolute -inset-2 rounded-full border" style={{ background: hexAlpha('12'), borderColor: hexAlpha('33') }} />
            <div className="w-20 h-20 rounded-full flex items-center justify-center relative" style={{ background: hexAlpha('22'), border: `1px solid ${hexAlpha('44')}` }}>
              <SuccessIcon size={38} strokeWidth={1.5} style={{ color: iconColor }} />
            </div>
          </div>
        </div>

        {/* Card principal */}
        <div className="bg-bg2 border border-border rounded-3xl overflow-hidden shadow-2xl">

          {/* Header com gradiente */}
          <div className="relative px-8 pt-8 pb-6 text-center" style={{ background: `linear-gradient(160deg, ${hexAlpha('14')} 0%, rgba(0,85,254,0.05) 100%)` }}>
            <div className="flex items-center justify-center gap-1.5 mb-2">
              <Sparkles size={14} style={{ color: iconColor }} />
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: iconColor }}>Compra aprovada</span>
              <Sparkles size={14} style={{ color: iconColor }} />
            </div>
            <h1 className="text-3xl font-bold text-text mb-1">Parabéns!</h1>
            <p className="text-sm text-text3">Seu pagamento foi confirmado com sucesso</p>
          </div>

          {/* Produto */}
          {offer && (
            <div className="mx-6 mb-5">
              <div className="flex items-center gap-3 bg-bg3 rounded-2xl p-3.5 border border-border">
                {offer.imageUrl ? (
                  <img src={offer.imageUrl} alt={offer.name} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <ShoppingBag size={20} className="text-accent" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-xs text-text3 mb-0.5">Produto adquirido</p>
                  <p className="text-sm font-semibold text-text leading-snug truncate">{offer.name}</p>
                  <p className="text-sm font-bold text-green mt-0.5">{formatBRL(offer.priceCents)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Detalhes da compra */}
          <div className="px-6 pb-6 space-y-2.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-text3">Número do pedido</span>
              <span className="font-mono font-semibold text-text text-xs bg-bg3 px-2.5 py-1 rounded-lg">
                #{result.orderId?.slice(-8).toUpperCase()}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text3">Status</span>
              <span className="flex items-center gap-1.5 text-green font-semibold text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-green inline-block" />
                Aprovado
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text3">Confirmação</span>
              <span className="text-text2 text-xs">Enviada ao seu e-mail</span>
            </div>
          </div>

          {/* Mensagem personalizada do produtor / plataforma */}
          {offer?.successMessage && (
            <div className="mx-6 mb-5">
              <div
                className="rich-content bg-bg3 border border-border rounded-2xl px-4 py-4 text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(offer.successMessage) }}
              />
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-border mx-6" />

          {/* Botão CTA */}
          <div className="px-6 py-6">
            <button
              onClick={() => navigate('/cliente/compras')}
              className="w-full flex items-center justify-center gap-2.5 bg-green hover:bg-green/90 text-bg font-bold py-4 rounded-2xl transition-all duration-200 text-sm shadow-lg hover:shadow-green/25 hover:scale-[1.01] active:scale-[0.99]"
            >
              <ShoppingBag size={18} />
              Ir para minhas compras
              <ArrowRight size={16} />
            </button>
          </div>
        </div>

        {/* Selos de segurança */}
        <div className="flex items-center justify-center gap-4 mt-5">
          <div className="flex items-center gap-1.5 text-text3">
            <ShieldCheck size={13} />
            <span className="text-xs">Compra segura</span>
          </div>
          <span className="text-border">·</span>
          <div className="flex items-center gap-1.5 text-text3">
            <Star size={13} />
            <span className="text-xs">Kairos Way</span>
          </div>
          <span className="text-border">·</span>
          <div className="flex items-center gap-1.5 text-text3">
            <Lock size={13} />
            <span className="text-xs">Dados protegidos</span>
          </div>
        </div>

      </div>
    </div>
    );
  }

  // ── TELA REJEITADO ────────────────────────────────────────────
  if (result?.status === 'REJECTED') return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-bg2 border border-red/30 rounded-2xl p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-red/10 border border-red/30 flex items-center justify-center mx-auto mb-5">
            <span className="text-red text-2xl">!</span>
          </div>
          <h2 className="text-xl font-semibold text-text mb-2">Pagamento recusado</h2>
          <p className="text-sm text-text2 mb-5">
            {(result as any).rejectionReason || 'O pagamento não foi aprovado pelo gateway. Verifique os dados informados (CPF, telefone, endereço) e tente novamente.'}
          </p>
          <button
            onClick={() => { setResult(null); }}
            className="w-full bg-accent hover:bg-blue-600 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
          >
            Tentar novamente
          </button>
          <p className="text-xs text-text3 mt-4">Pedido <span className="font-mono">{result.orderId?.slice(-8).toUpperCase()}</span></p>
        </div>
      </div>
    </div>
  );

  // ── TELA PIX ──────────────────────────────────────────────────
  if (result?.pixCode || result?.method === 'PIX') return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-bg2 border border-border rounded-2xl p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-5">
            <QrCode size={28} className="text-accent" strokeWidth={1.5} />
          </div>
          <h2 className="text-xl font-semibold text-text mb-1">Pague com Pix</h2>
          <p className="text-sm text-text2 mb-5">Escaneie o QR Code pelo app do seu banco</p>
          {result.pixExpiration && (
            <div className="flex items-center justify-center gap-1.5 text-xs text-amber mb-4">
              <Clock size={12} />
              <span>Expira às {new Date(result.pixExpiration).toLocaleTimeString('pt-BR')}</span>
            </div>
          )}
          {result.pixQrCode && (
            <div className="bg-white p-3 rounded-xl inline-block mb-5">
              <img src={result.pixQrCode} alt="QR Code Pix" className="w-44 h-44" />
            </div>
          )}
          <div className="bg-bg3 border border-border rounded-lg p-3 text-xs font-mono text-text2 break-all mb-4 select-all text-left leading-relaxed">
            {result.pixCode}
          </div>
          <button
            onClick={() => { navigator.clipboard.writeText(result.pixCode); toast.success('Código Pix copiado!'); }}
            className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-blue-600 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
          >
            <Copy size={15} /> Copiar código Pix
          </button>
          <p className="text-xs text-text3 mt-4">Pedido <span className="font-mono">{result.orderId?.slice(-8).toUpperCase()}</span></p>
        </div>
      </div>
    </div>
  );

  // ── TELA BOLETO ──────────────────────────────────────────────
  if (result?.method === 'BOLETO' || result?.boletoUrl || result?.boletoBarcode) return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-bg2 border border-border rounded-2xl p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-amber/10 border border-amber/20 flex items-center justify-center mx-auto mb-5">
            <FileText size={28} className="text-amber" strokeWidth={1.5} />
          </div>
          <h2 className="text-xl font-semibold text-text mb-1">Boleto gerado</h2>
          <p className="text-sm text-text2 mb-5">Vencimento em 3 dias úteis</p>
          {result.boletoBarcode ? (
            <div className="bg-bg3 border border-border rounded-lg p-3 text-xs font-mono text-text2 break-all mb-4 select-all text-left">
              {result.boletoBarcode}
            </div>
          ) : (
            <div className="bg-amber/5 border border-amber/20 rounded-lg p-4 mb-4 text-left">
              <p className="text-xs text-amber/80 leading-relaxed">O boleto será enviado para o seu e-mail em instantes.</p>
            </div>
          )}
          <div className="flex flex-col gap-2">
            {result.boletoUrl && (
              <a href={result.boletoUrl} target="_blank" rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-blue-600 text-white font-semibold py-3 rounded-xl transition-colors text-sm">
                <ExternalLink size={15} /> Abrir boleto em PDF
              </a>
            )}
            {result.boletoBarcode && (
              <button onClick={() => { navigator.clipboard.writeText(result.boletoBarcode); toast.success('Código copiado!'); }}
                className="w-full flex items-center justify-center gap-2 bg-bg3 hover:bg-bg3/80 text-text2 font-medium py-3 rounded-xl transition-colors text-sm border border-border">
                <Copy size={15} /> Copiar código de barras
              </button>
            )}
          </div>
          <p className="text-xs text-text3 mt-4">Pedido <span className="font-mono">{result.orderId?.slice(-8).toUpperCase()}</span></p>
        </div>
      </div>
    </div>
  );

  // ── FORMULÁRIO PRINCIPAL ──────────────────────────────────────
  return (
    <div className="min-h-screen bg-bg">
      {/* Barra de segurança */}
      <div className="border-b border-border bg-bg2">
        <div className="max-w-2xl mx-auto px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-text3">
            <Lock size={11} strokeWidth={2} />
            <span>Conexão segura</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-text3">
            <span className="flex items-center gap-1"><ShieldCheck size={11} /> PCI DSS</span>
            <span className="flex items-center gap-1"><Shield size={11} /> SSL/TLS 1.3</span>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Card do produto */}
        <div className="bg-bg2 border border-border rounded-2xl overflow-hidden mb-5">
          <div className="flex gap-0">
            {offer?.imageUrl ? (
              <div className="flex-shrink-0 w-40 sm:w-52">
                <img src={offer.imageUrl} alt={offer.name} className="w-full h-full object-cover" style={{ minHeight: '160px' }} />
              </div>
            ) : (
              <div className="flex-shrink-0 w-40 sm:w-52 bg-accent/10 flex items-center justify-center" style={{ minHeight: '160px' }}>
                <BadgeCheck size={40} className="text-accent/40" strokeWidth={1} />
              </div>
            )}
            <div className="flex-1 min-w-0 p-4 flex flex-col justify-between">
              <div>
                <p className="text-[10px] text-text3 uppercase tracking-widest mb-1">Você está comprando</p>
                <h1 className="text-base font-bold text-text leading-snug">{offer?.name}</h1>
                {offer?.description && (
                  <p className="text-xs text-text3 mt-1.5 leading-relaxed line-clamp-2">{offer.description}</p>
                )}
              </div>
              <div className="mt-3 pt-3 border-t border-border space-y-2">
                {couponApplied ? (
                  <>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-text3">Subtotal</span>
                      <span className="text-text2 line-through">{formatBRL(couponApplied.priceCents)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-accent">Cupom {couponApplied.code} ({(couponApplied.discountBps / 100).toFixed(1)}% off)</span>
                      <span className="text-accent">- {formatBRL(couponApplied.discountCents)}</span>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-text3">Total a pagar</span>
                      <span className="text-xl font-bold text-text">{formatBRL(couponApplied.finalCents)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text3">Total a pagar</span>
                    <span className="text-xl font-bold text-text">{offer && formatBRL(offer.priceCents)}</span>
                  </div>
                )}
              </div>

              {/* Cupom de desconto */}
              <div className="mt-3 pt-3 border-t border-border">
                {couponApplied ? (
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-text2">
                      <strong className="text-accent">Cupom aplicado:</strong> {couponApplied.code}
                    </span>
                    <button type="button" onClick={removeCoupon} className="text-text3 hover:text-red underline">remover</button>
                  </div>
                ) : (
                  <div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Cupom de desconto (opcional)"
                        value={couponInput}
                        onChange={e => { setCouponInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'')); setCouponError(''); }}
                        maxLength={20}
                        className="input flex-1 text-sm font-mono"
                      />
                      <button
                        type="button"
                        onClick={applyCoupon}
                        disabled={couponLoading || !couponInput.trim()}
                        className="btn-secondary btn-sm"
                      >{couponLoading ? '...' : 'Aplicar'}</button>
                    </div>
                    {couponError && <p className="text-xs text-red mt-1">{couponError}</p>}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── ETAPA 1: IDENTIFICAÇÃO ───────────────────────────────── */}
        {step === 'identify' && (
          <div className="bg-bg2 border border-border rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-sm font-semibold text-text">Identifique-se para continuar</h2>
              <p className="text-xs text-text3 mt-0.5">Crie uma conta ou entre para vincular o pedido ao seu perfil</p>
            </div>

            <div className="p-6">
              {/* Tabs */}
              <div className="flex gap-1 bg-bg3 rounded-[8px] p-1 mb-5">
                {(['register', 'login'] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => { setIdTab(t); setIdPass(''); }}
                    className={`flex-1 py-1.5 rounded-[6px] text-sm font-medium transition-all ${
                      idTab === t ? 'bg-accent text-white shadow-sm' : 'text-text3 hover:text-text2'
                    }`}
                  >
                    {t === 'register' ? 'Criar conta' : 'Já tenho conta'}
                  </button>
                ))}
              </div>

              <form onSubmit={handleIdentify} className="space-y-4">
                {idTab === 'register' && (
                  <div>
                    <label className="block text-xs font-medium text-text2 mb-1.5 tracking-wide uppercase">
                      Nome completo <span className="text-red">*</span>
                    </label>
                    <input
                      value={idName}
                      onChange={e => setIdName(e.target.value)}
                      className="w-full bg-bg3 border border-border rounded-xl px-4 py-2.5 text-sm text-text placeholder:text-text3 outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all"
                      placeholder="Seu nome completo"
                      autoComplete="name"
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-text2 mb-1.5 tracking-wide uppercase">
                    E-mail <span className="text-red">*</span>
                  </label>
                  <input
                    type="email"
                    value={idEmail}
                    onChange={e => setIdEmail(e.target.value)}
                    className="w-full bg-bg3 border border-border rounded-xl px-4 py-2.5 text-sm text-text placeholder:text-text3 outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all"
                    placeholder="seu@email.com"
                    autoComplete="email"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-text2 mb-1.5 tracking-wide uppercase">
                    Senha <span className="text-red">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showIdPass ? 'text' : 'password'}
                      value={idPass}
                      onChange={e => setIdPass(e.target.value)}
                      className="w-full bg-bg3 border border-border rounded-xl px-4 py-2.5 pr-10 text-sm text-text placeholder:text-text3 outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all"
                      placeholder={idTab === 'register' ? 'Crie uma senha (mín. 6 caracteres)' : 'Sua senha'}
                      autoComplete={idTab === 'register' ? 'new-password' : 'current-password'}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowIdPass(!showIdPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text3 hover:text-text2"
                    >
                      {showIdPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={idLoading}
                  className="w-full bg-accent hover:bg-blue-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
                >
                  {idLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Aguarde...
                    </>
                  ) : (
                    <>
                      <Lock size={14} />
                      {idTab === 'register' ? 'Criar conta e continuar' : 'Entrar e continuar'}
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ── ETAPA 2: PAGAMENTO ────────────────────────────────────── */}
        {step === 'payment' && (
          <div className="bg-bg2 border border-border rounded-2xl overflow-hidden">

            {/* Chip do usuário autenticado */}
            <div className="px-5 py-3 bg-accent/5 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-accent/20 rounded-full flex items-center justify-center text-accent text-xs font-bold flex-shrink-0">
                  {user?.name?.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-text leading-none">{user?.name}</p>
                  <p className="text-xs text-text3 mt-0.5">{user?.email}</p>
                </div>
              </div>
              {!isAuthenticated() && (
                <button
                  type="button"
                  onClick={() => setStep('identify')}
                  className="text-xs text-text3 hover:text-accent transition-colors flex-shrink-0"
                >
                  Trocar conta
                </button>
              )}
            </div>

            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-sm font-semibold text-text">Informações de pagamento</h2>
            </div>

            <form onSubmit={handleSubmit(d => payMutation.mutate(d))} className="p-6 space-y-5">

              {/* Telefone + CPF */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-text2 mb-1.5 tracking-wide uppercase">CPF / CNPJ</label>
                  <input
                    value={docValue}
                    onChange={e => {
                      const masked = maskDocument(e.target.value);
                      setDocValue(masked);
                      setValue('customerDoc', masked);
                      setDocError(validateDocument(masked) || '');
                    }}
                    className={`w-full bg-bg3 border rounded-xl px-4 py-2.5 text-sm text-text placeholder:text-text3 outline-none focus:ring-1 transition-all ${docError ? 'border-red focus:border-red focus:ring-red/20' : 'border-border focus:border-accent focus:ring-accent/20'}`}
                    placeholder="000.000.000-00"
                    maxLength={18}
                    inputMode="numeric"
                  />
                  {docError && <p className="text-xs text-red mt-1">{docError}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-text2 mb-1.5 tracking-wide uppercase">
                    Telefone / WhatsApp <span className="text-red">*</span>
                  </label>
                  <input
                    value={phoneValue}
                    onChange={e => {
                      const masked = maskPhone(e.target.value);
                      setPhoneValue(masked);
                      setValue('customerPhone', masked);
                    }}
                    className="w-full bg-bg3 border border-border rounded-xl px-4 py-2.5 text-sm text-text placeholder:text-text3 outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all"
                    placeholder="(11) 99999-9999"
                    maxLength={15}
                    inputMode="numeric"
                  />
                  {errors.customerPhone && <p className="text-xs text-red mt-1">{String(errors.customerPhone.message)}</p>}
                </div>
              </div>

              <div className="border-t border-border" />

              {/* Método de pagamento */}
              <div>
                <label className="block text-xs font-medium text-text2 mb-3 tracking-wide uppercase">
                  Forma de pagamento <span className="text-red">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {availableMethods.map(m => {
                    const info     = METHOD_LABEL[m.v];
                    const isActive = method === m.v;
                    return (
                      <label key={m.v} className={`relative cursor-pointer rounded-xl border p-3.5 transition-all ${isActive ? 'border-accent bg-accent/8 shadow-sm shadow-accent/10' : 'border-border hover:border-border/80 hover:bg-bg3/50'}`}>
                        <input {...register('method')} type="radio" value={m.v} className="sr-only" />
                        {isActive && <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-accent" />}
                        <MethodIcon method={m.v} />
                        <p className={`text-sm font-semibold mt-2 ${isActive ? 'text-accent' : 'text-text'}`}>{info.title}</p>
                        <p className="text-[10px] text-text3 mt-0.5 leading-tight">{info.sub}</p>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Endereço — obrigatório para emissão de nota fiscal */}
              <div className="bg-bg3 rounded-xl p-4 space-y-3 border border-border">
                <p className="text-xs font-medium text-text2 uppercase tracking-wide">
                  Endereço de cobrança
                  <span className="ml-1.5 text-[10px] text-text3 normal-case">(necessário para emitir nota fiscal)</span>
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                  <div className="col-span-2">
                    <label className="block text-xs text-text3 mb-1">CEP</label>
                    <input {...register('zipCode', { required: 'Obrigatório' })}
                      className="w-full bg-bg2 border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text3 outline-none focus:border-accent transition-all"
                      placeholder="00000-000" maxLength={9} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-text3 mb-1">Estado</label>
                    <input {...register('state', { required: 'Obrigatório' })}
                      className="w-full bg-bg2 border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text3 outline-none focus:border-accent transition-all"
                      placeholder="SP" maxLength={2} style={{ textTransform: 'uppercase' }} />
                  </div>
                  <div className="col-span-4">
                    <label className="block text-xs text-text3 mb-1">Cidade</label>
                    <input {...register('city', { required: 'Obrigatório' })}
                      className="w-full bg-bg2 border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text3 outline-none focus:border-accent transition-all"
                      placeholder="São Paulo" />
                  </div>
                  <div className="col-span-3">
                    <label className="block text-xs text-text3 mb-1">Rua / Logradouro</label>
                    <input {...register('street', { required: 'Obrigatório' })}
                      className="w-full bg-bg2 border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text3 outline-none focus:border-accent transition-all"
                      placeholder="Rua Exemplo" />
                  </div>
                  <div>
                    <label className="block text-xs text-text3 mb-1">Número</label>
                    <input {...register('number', { required: 'Obrigatório' })}
                      className="w-full bg-bg2 border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text3 outline-none focus:border-accent transition-all"
                      placeholder="123" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-text3 mb-1">Bairro</label>
                    <input {...register('neighborhood', { required: 'Obrigatório' })}
                      className="w-full bg-bg2 border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text3 outline-none focus:border-accent transition-all"
                      placeholder="Centro" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-text3 mb-1">Complemento <span className="text-text3/60">(opcional)</span></label>
                    <input {...register('complement')}
                      className="w-full bg-bg2 border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text3 outline-none focus:border-accent transition-all"
                      placeholder="Apto 42" />
                  </div>
                </div>
              </div>

              {/* Dados do cartão */}
              {method === 'CREDIT_CARD' && (
                <div className="bg-bg3 rounded-xl p-4 space-y-3 border border-border">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-text2 uppercase tracking-wide">Dados do cartão</p>
                    <div className="flex items-center gap-1 text-[10px] text-text3">
                      <Lock size={9} />
                      <span>Criptografado via Pagar.me</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-text3 mb-1">Número do cartão</label>
                    <Controller name="cardNumber" control={control} rules={{ required: 'Obrigatório' }}
                      render={({ field }) => (
                        <input
                          value={field.value || ''}
                          onChange={e => field.onChange(formatCardNumber(e.target.value))}
                          onBlur={field.onBlur}
                          className="w-full bg-bg2 border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text3 outline-none focus:border-accent transition-all font-mono tracking-widest"
                          placeholder="0000 0000 0000 0000" autoComplete="cc-number" maxLength={19}
                        />
                      )}
                    />
                    {errors.cardNumber && <p className="text-xs text-red mt-1">{String(errors.cardNumber.message)}</p>}
                  </div>
                  <div>
                    <label className="block text-xs text-text3 mb-1">Nome no cartão</label>
                    <input {...register('cardHolder', { required: 'Obrigatório' })}
                      className="w-full bg-bg2 border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text3 outline-none focus:border-accent transition-all uppercase"
                      placeholder="NOME COMO NO CARTÃO" autoComplete="cc-name" style={{ textTransform: 'uppercase' }} />
                    {errors.cardHolder && <p className="text-xs text-red mt-1">{String(errors.cardHolder.message)}</p>}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs text-text3 mb-1">Mês</label>
                      <input {...register('cardExpMonth', { required: true })}
                        className="w-full bg-bg2 border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text3 text-center outline-none focus:border-accent transition-all"
                        placeholder="MM" maxLength={2} inputMode="numeric" autoComplete="cc-exp-month" />
                    </div>
                    <div>
                      <label className="block text-xs text-text3 mb-1">Ano</label>
                      <input {...register('cardExpYear', { required: true })}
                        className="w-full bg-bg2 border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text3 text-center outline-none focus:border-accent transition-all"
                        placeholder="AA ou AAAA" maxLength={4} inputMode="numeric" autoComplete="cc-exp-year" />
                    </div>
                    <div>
                      <label className="block text-xs text-text3 mb-1">CVV</label>
                      <input {...register('cardCvv', { required: true })}
                        className="w-full bg-bg2 border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text3 text-center font-mono outline-none focus:border-accent transition-all"
                        placeholder="123" maxLength={4} type="password" autoComplete="cc-csc"
                        onFocus={() => setCvvFocused(true)}
                        onBlur={() => setCvvFocused(false)} />
                    </div>
                  </div>
                  {offer && (
                    <div>
                      <label className="block text-xs text-text3 mb-1">Parcelas</label>
                      <select {...register('installments', { valueAsNumber: true })}
                        className="w-full bg-bg2 border border-border rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-accent transition-all">
                        {Array.from({ length: config?.maxInstallments || 12 }, (_, i) => i + 1).map(n => (
                          <option key={n} value={n}>
                            {n}x de {formatBRL(Math.ceil((couponApplied?.finalCents ?? offer?.priceCents ?? 0) / n))}
                            {n === 1 ? ' — sem juros' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="flex justify-center pt-2">
                    <AnimatedCard
                      number={cardNumber} holder={cardHolder}
                      expMonth={cardExpMonth} expYear={cardExpYear}
                      flipped={cvvFocused}
                    />
                  </div>
                </div>
              )}

              {/* Botão de pagamento */}
              <button
                type="submit"
                disabled={payMutation.isPending}
                className="w-full bg-accent hover:bg-blue-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
              >
                {payMutation.isPending ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{method === 'CREDIT_CARD' ? 'Processando cartão...' : 'Processando...'}</span>
                  </>
                ) : (
                  <>
                    <Lock size={14} />
                    <span>Pagar {offer ? formatBRL(couponApplied?.finalCents ?? offer.priceCents) : ''} com segurança</span>
                  </>
                )}
              </button>

            </form>
          </div>
        )}

        {/* Rodapé de segurança */}
        <div className="mt-6 flex items-center justify-center gap-6 text-xs text-text3">
          <span className="flex items-center gap-1.5"><ShieldCheck size={12} strokeWidth={1.5} /> Ambiente PCI DSS</span>
          <span className="flex items-center gap-1.5"><Lock size={12} strokeWidth={1.5} /> Dados criptografados</span>
          <span className="flex items-center gap-1.5"><BadgeCheck size={12} strokeWidth={1.5} /> Transação segura</span>
        </div>

      </div>
    </div>
  );
}
