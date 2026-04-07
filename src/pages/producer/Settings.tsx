import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { PageHeader, Modal } from '@/components/ui';
import { useAuthStore } from '@/stores/auth.store';
import { Lock, Eye, EyeOff, ShieldCheck, ShieldOff } from 'lucide-react';

interface PasswordForm {
  currentPassword: string;
  newPassword    : string;
  confirmPassword: string;
}

export default function ProducerSettings() {
  const { user, setUser } = useAuthStore();
  const qc = useQueryClient();

  // Senha
  const [openPwd, setOpenPwd]     = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]         = useState(false);

  // MFA
  const [openMfa, setOpenMfa]     = useState(false);
  const [mfaStep, setMfaStep]     = useState<'qr' | 'code'>('qr');
  const [qrCode, setQrCode]       = useState<string>('');
  const [mfaCode, setMfaCode]     = useState('');

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<PasswordForm>();
  const newPwd = watch('newPassword');

  // ── Alterar senha ─────────────────────────────────────────────
  const changePwd = useMutation({
    mutationFn: (d: PasswordForm) => api.put('/auth/password', {
      currentPassword: d.currentPassword,
      newPassword    : d.newPassword,
    }),
    onSuccess: () => {
      toast.success('Senha alterada com sucesso!');
      setOpenPwd(false);
      reset();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Senha atual incorreta'),
  });

  // ── Setup MFA — gera QR Code ──────────────────────────────────
  const setupMfa = useMutation({
    mutationFn: () => api.post('/auth/mfa/setup'),
    onSuccess : (res) => {
      setQrCode(res.data.qrCode || res.data.qr_code || res.data.otpauth);
      setMfaStep('qr');
      setOpenMfa(true);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erro ao configurar MFA'),
  });

  // ── Enable MFA — confirma com código ─────────────────────────
  const enableMfa = useMutation({
    mutationFn: () => api.post('/auth/mfa/enable', { code: mfaCode }),
    onSuccess : () => {
      toast.success('MFA ativado com sucesso!');
      setOpenMfa(false);
      setMfaCode('');
      // Atualiza o usuário no store
      if (setUser && user) setUser({ ...user, mfaEnabled: true });
      qc.invalidateQueries({ queryKey: ['me'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Código inválido'),
  });

  const handleOpenMfa = () => {
    setMfaCode('');
    setMfaStep('qr');
    setupMfa.mutate();
  };

  return (
    <div>
      <PageHeader title="Configurações" sub="Dados da sua conta" />

      <div className="grid grid-cols-2 gap-4">
        {/* Dados da conta */}
        <div className="card">
          <div className="section-title mb-4">Informações da conta</div>
          <div className="space-y-3">
            {[
              ['Nome',   user?.name  || '—'],
              ['Email',  user?.email || '—'],
              ['Perfil', user?.role  || '—'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between py-2 border-b border-border">
                <span className="text-text3 text-sm">{k}</span>
                <span className="font-medium text-text text-sm">{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Segurança */}
        <div className="card">
          <div className="section-title mb-4">Segurança</div>
          <div className="space-y-3">

            {/* Senha */}
            <div className="flex items-center justify-between py-2 border-b border-border">
              <div>
                <div className="text-sm font-medium text-text">Senha</div>
                <div className="text-xs text-text3">Última alteração desconhecida</div>
              </div>
              <button onClick={() => setOpenPwd(true)} className="btn-sec btn-sm">
                <Lock size={13} /> Alterar
              </button>
            </div>

            {/* MFA */}
            <div className="flex items-center justify-between py-2">
              <div>
                <div className="text-sm font-medium text-text">Autenticação em dois fatores (MFA)</div>
                <div className="text-xs text-text3">
                  {user?.mfaEnabled
                    ? 'Ativo — login exige código do autenticador'
                    : 'Inativo — recomendamos ativar para maior segurança'}
                </div>
              </div>
              {user?.mfaEnabled ? (
                <span className="badge-green flex items-center gap-1">
                  <ShieldCheck size={11} /> Habilitado
                </span>
              ) : (
                <button
                  onClick={handleOpenMfa}
                  disabled={setupMfa.isPending}
                  className="btn-primary btn-sm"
                >
                  <ShieldOff size={13} />
                  {setupMfa.isPending ? 'Gerando...' : 'Ativar MFA'}
                </button>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Modal alterar senha */}
      <Modal
        open={openPwd}
        onClose={() => { setOpenPwd(false); reset(); }}
        title="Alterar senha"
        size="sm"
        footer={
          <div className="flex gap-2">
            <button className="btn-ghost" onClick={() => { setOpenPwd(false); reset(); }}>Cancelar</button>
            <button className="btn-primary" onClick={handleSubmit(d => changePwd.mutate(d))} disabled={changePwd.isPending}>
              {changePwd.isPending ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="form-group">
            <label className="label">Senha atual *</label>
            <div className="relative">
              <input {...register('currentPassword', { required: 'Obrigatório' })}
                type={showCurrent ? 'text' : 'password'} className="input pr-10" placeholder="••••••••••••" />
              <button type="button" onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text3 hover:text-text2">
                {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {errors.currentPassword && <span className="text-xs text-red">{errors.currentPassword.message}</span>}
          </div>

          <div className="form-group">
            <label className="label">Nova senha * (mínimo 12 caracteres)</label>
            <div className="relative">
              <input {...register('newPassword', {
                required  : 'Obrigatório',
                minLength : { value: 12, message: 'Mínimo 12 caracteres' },
                validate  : v => {
                  if (!/[A-Z]/.test(v)) return 'Precisa de letra maiúscula';
                  if (!/[0-9]/.test(v)) return 'Precisa de número';
                  if (!/[^A-Za-z0-9]/.test(v)) return 'Precisa de símbolo (!@#$...)';
                  return true;
                }
              })} type={showNew ? 'text' : 'password'} className="input pr-10" placeholder="••••••••••••" />
              <button type="button" onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text3 hover:text-text2">
                {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {errors.newPassword && <span className="text-xs text-red">{errors.newPassword.message}</span>}
          </div>

          <div className="form-group">
            <label className="label">Confirmar nova senha *</label>
            <input {...register('confirmPassword', {
              required: 'Obrigatório',
              validate: v => v === newPwd || 'As senhas não conferem',
            })} type="password" className="input" placeholder="••••••••••••" />
            {errors.confirmPassword && <span className="text-xs text-red">{errors.confirmPassword.message}</span>}
          </div>
        </div>
      </Modal>

      {/* Modal MFA */}
      <Modal
        open={openMfa}
        onClose={() => { setOpenMfa(false); setMfaCode(''); }}
        title="Ativar autenticação em dois fatores"
        size="sm"
        footer={
          <div className="flex gap-2">
            <button className="btn-ghost" onClick={() => { setOpenMfa(false); setMfaCode(''); }}>Cancelar</button>
            {mfaStep === 'qr' ? (
              <button className="btn-primary" onClick={() => setMfaStep('code')}>
                Já escaneei — continuar
              </button>
            ) : (
              <button
                className="btn-primary"
                onClick={() => enableMfa.mutate()}
                disabled={mfaCode.length !== 6 || enableMfa.isPending}
              >
                {enableMfa.isPending ? 'Verificando...' : 'Ativar MFA'}
              </button>
            )}
          </div>
        }
      >
        {mfaStep === 'qr' ? (
          <div className="text-center space-y-4">
            <p className="text-sm text-text2">
              Abra o <strong>Google Authenticator</strong> ou <strong>Authy</strong> e escaneie o QR Code abaixo.
            </p>
            {qrCode && (
              <div className="flex justify-center">
                {qrCode.startsWith('data:image') ? (
                  <img src={qrCode} alt="QR Code MFA" className="w-48 h-48 rounded-lg border border-border" />
                ) : qrCode.startsWith('otpauth://') ? (
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=192x192&data=${encodeURIComponent(qrCode)}`}
                    alt="QR Code MFA"
                    className="w-48 h-48 rounded-lg border border-border"
                  />
                ) : (
                  <img src={qrCode} alt="QR Code MFA" className="w-48 h-48 rounded-lg border border-border" />
                )}
              </div>
            )}
            <p className="text-xs text-text3">
              Após escanear, clique em "Já escaneei — continuar" para digitar o código.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-text2 text-center">
              Digite o código de 6 dígitos exibido no seu autenticador.
            </p>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={mfaCode}
              onChange={e => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="input text-center text-2xl font-mono tracking-[0.5em] py-4"
              placeholder="000000"
              autoFocus
            />
            {enableMfa.isError && (
              <p className="text-xs text-red text-center">Código inválido ou expirado. Tente novamente.</p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}