import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Modal } from '@/components/ui';
import { useAuthStore } from '@/stores/auth.store';
import { Trash2, AlertTriangle, Eye, EyeOff } from 'lucide-react';

const WHAT_IS_DELETED = [
  'Dados de perfil (nome, e-mail, CPF/CNPJ, endereço, telefone)',
  'Foto de perfil e documentos de KYC',
  'Chaves de API, tokens de acesso, sessões ativas',
  'Pixels de rastreamento e configurações de checkout',
  'Links de afiliado e cupons',
];

const WHAT_IS_KEPT = [
  'Registros financeiros e fiscais — obrigação legal (5 anos, Lei 9.613/98)',
  'Notas fiscais emitidas — exigência fiscal',
  'Audit log de ações críticas — segurança/PCI DSS',
];

export default function DeleteAccountCard() {
  const navigate = useNavigate();
  const { clearAuth } = useAuthStore();

  const [open, setOpen]       = useState(false);
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [reason, setReason]   = useState('');
  const [confirmText, setConfirmText] = useState('');

  const confirmed = confirmText.trim().toUpperCase() === 'EXCLUIR';

  const del = useMutation({
    mutationFn: () => api.post('/auth/account/delete', { password, reason }),
    onSuccess: () => {
      toast.success('Conta excluída. Você será desconectado.');
      setTimeout(() => {
        clearAuth();
        navigate('/login', { replace: true });
      }, 1500);
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.message || 'Erro ao excluir conta.';
      toast.error(msg);
    },
  });

  const close = () => {
    if (del.isPending) return;
    setOpen(false);
    setPassword('');
    setReason('');
    setConfirmText('');
  };

  return (
    <>
      <div className="card border border-red/20">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-red/10 flex items-center justify-center flex-shrink-0">
            <Trash2 size={16} className="text-red" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-text mb-1">Excluir minha conta</h3>
            <p className="text-xs text-text2 leading-relaxed mb-3">
              Remove permanentemente sua conta e dados pessoais. Esta ação é
              <strong className="text-text"> irreversível</strong>.
            </p>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-[8px] text-xs font-semibold bg-red/10 hover:bg-red/15 text-red transition-colors"
            >
              <Trash2 size={12} />
              Excluir conta
            </button>
          </div>
        </div>
      </div>

      <Modal open={open} onClose={close} title="Excluir conta">
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-[8px] bg-amber/8 border border-amber/20">
            <AlertTriangle size={15} className="text-amber flex-shrink-0 mt-0.5" />
            <p className="text-xs text-text2 leading-relaxed">
              Esta ação é <strong className="text-text">irreversível</strong>. Sua conta
              será desativada imediatamente e os dados pessoais serão removidos em até 30 dias.
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold text-text mb-2 flex items-center gap-1.5">
              <Trash2 size={11} className="text-red" /> Dados que serão excluídos
            </p>
            <ul className="space-y-1 pl-1">
              {WHAT_IS_DELETED.map(item => (
                <li key={item} className="flex items-start gap-2 text-[11px] text-text2">
                  <span className="text-red mt-0.5 flex-shrink-0">×</span>{item}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold text-text mb-2">
              Dados mantidos por obrigação legal
            </p>
            <ul className="space-y-1 pl-1">
              {WHAT_IS_KEPT.map(item => (
                <li key={item} className="flex items-start gap-2 text-[11px] text-text3">
                  <span className="flex-shrink-0 mt-0.5">›</span>{item}
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3 pt-2 border-t border-border">
            <div className="form-group">
              <label className="label">Confirme sua senha</label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input pr-10"
                  placeholder="Digite sua senha"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(s => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-text3 hover:text-text"
                  tabIndex={-1}
                >
                  {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="label">
                Motivo <span className="text-text3 font-normal">(opcional)</span>
              </label>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="input resize-none h-16 text-sm"
                placeholder="Conte-nos por quê (opcional)"
                maxLength={500}
              />
            </div>

            <div className="form-group">
              <label className="label">
                Para confirmar, digite <strong>EXCLUIR</strong>
              </label>
              <input
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                className="input"
                placeholder="EXCLUIR"
                autoCapitalize="characters"
              />
            </div>

            <button
              type="button"
              onClick={() => del.mutate()}
              disabled={!confirmed || password.length === 0 || del.isPending}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-[8px] text-sm font-semibold bg-red/90 hover:bg-red text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Trash2 size={14} />
              {del.isPending ? 'Excluindo conta…' : 'Excluir minha conta'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
