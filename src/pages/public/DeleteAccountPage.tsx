import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  ArrowLeft, Mail, Trash2, CheckCircle2, AlertTriangle,
  ShieldCheck, Clock, FileText,
} from 'lucide-react';

type Step = 'form' | 'success';

const WHAT_IS_DELETED = [
  'Dados de perfil (nome, e-mail, CPF/CNPJ, endereço)',
  'Foto de perfil e documentos de KYC',
  'Chaves de API e tokens de acesso',
  'Pixels de rastreamento e configurações de checkout',
  'Links de afiliado e histórico de referências',
];

const WHAT_IS_KEPT = [
  'Registros de transações financeiras — exigência fiscal (5 anos, Lei 9.613/98)',
  'Notas fiscais emitidas (NFe.io) — arquivo obrigatório por lei',
  'Audit log de ações críticas — segurança e conformidade PCI DSS',
];

export default function DeleteAccountPage() {
  const [step, setStep]       = useState<Step>('form');
  const [email, setEmail]     = useState('');
  const [confirm, setConfirm] = useState('');
  const [reason, setReason]   = useState('');

  const requestDeletion = useMutation({
    mutationFn: () => api.post('/auth/request-deletion', { email, reason }),
    onSuccess: () => setStep('success'),
  });

  const emailMatch = email.trim() !== '' && email.trim() === confirm.trim();

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-bg py-10">
      <div className="w-full max-w-lg">
        <Link to="/login" className="inline-flex items-center gap-1.5 text-xs text-text3 hover:text-accent mb-4">
          <ArrowLeft size={13} /> Voltar ao login
        </Link>

        {step === 'form' ? (
          <div className="card space-y-5">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red/10 flex items-center justify-center flex-shrink-0">
                <Trash2 size={18} className="text-red" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-text">Excluir minha conta</h1>
                <p className="text-xs text-text3">Solicitação de exclusão de dados pessoais</p>
              </div>
            </div>

            {/* Aviso */}
            <div className="flex items-start gap-3 p-3 rounded-[8px] bg-amber/8 border border-amber/20">
              <AlertTriangle size={15} className="text-amber flex-shrink-0 mt-0.5" />
              <p className="text-xs text-text2 leading-relaxed">
                Esta ação é <strong className="text-text">irreversível</strong>. Após confirmada,
                sua conta e os dados listados abaixo serão excluídos permanentemente em até <strong className="text-text">30 dias</strong>.
              </p>
            </div>

            {/* O que será excluído */}
            <div>
              <p className="text-xs font-semibold text-text mb-2 flex items-center gap-1.5">
                <Trash2 size={12} className="text-red" /> Dados que serão excluídos
              </p>
              <ul className="space-y-1.5 pl-1">
                {WHAT_IS_DELETED.map(item => (
                  <li key={item} className="flex items-start gap-2 text-xs text-text2">
                    <span className="text-red mt-0.5 flex-shrink-0">×</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* O que será mantido */}
            <div>
              <p className="text-xs font-semibold text-text mb-2 flex items-center gap-1.5">
                <FileText size={12} className="text-text3" /> Dados mantidos por obrigação legal
              </p>
              <ul className="space-y-1.5 pl-1">
                {WHAT_IS_KEPT.map(item => (
                  <li key={item} className="flex items-start gap-2 text-xs text-text3">
                    <span className="flex-shrink-0 mt-0.5">›</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Formulário */}
            <form
              onSubmit={e => { e.preventDefault(); if (emailMatch) requestDeletion.mutate(); }}
              className="space-y-3 pt-1 border-t border-border"
            >
              <div className="form-group">
                <label className="label">E-mail da conta</label>
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

              <div className="form-group">
                <label className="label">Confirme o e-mail</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text3" />
                  <input
                    type="email"
                    required
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    className={`input pl-9 ${confirm && !emailMatch ? 'border-red/50 focus:ring-red/30' : ''}`}
                    placeholder="seu@email.com"
                    autoComplete="email"
                  />
                </div>
                {confirm && !emailMatch && (
                  <p className="text-[11px] text-red mt-1">Os e-mails não coincidem.</p>
                )}
              </div>

              <div className="form-group">
                <label className="label">
                  Motivo <span className="text-text3 font-normal">(opcional)</span>
                </label>
                <textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  className="input resize-none h-20 text-sm"
                  placeholder="Conte-nos o motivo (opcional)…"
                  maxLength={500}
                />
              </div>

              <button
                type="submit"
                disabled={!emailMatch || requestDeletion.isPending}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-[8px] text-sm font-semibold bg-red/90 hover:bg-red text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Trash2 size={14} />
                {requestDeletion.isPending ? 'Enviando solicitação…' : 'Solicitar exclusão de conta'}
              </button>

              {requestDeletion.isError && (
                <p className="text-xs text-red text-center">
                  {(requestDeletion.error as any)?.response?.data?.message || 'Erro ao enviar solicitação. Tente novamente.'}
                </p>
              )}
            </form>
          </div>
        ) : (
          /* ── Sucesso ── */
          <div className="card text-center space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-green/10 flex items-center justify-center mx-auto">
              <CheckCircle2 size={28} className="text-green" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text mb-1">Solicitação recebida</h2>
              <p className="text-sm text-text2 leading-relaxed">
                Enviamos um e-mail de confirmação para <strong className="text-text">{email}</strong>.
              </p>
            </div>

            <div className="space-y-3 text-left">
              <div className="flex items-start gap-3 p-3 rounded-[8px] bg-bg3">
                <Clock size={14} className="text-text3 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-text2 leading-relaxed">
                  Sua conta será desativada imediatamente. A exclusão completa dos dados ocorrerá em até <strong className="text-text">30 dias corridos</strong>.
                </p>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-[8px] bg-bg3">
                <ShieldCheck size={14} className="text-text3 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-text2 leading-relaxed">
                  Registros financeiros obrigatórios serão mantidos conforme exige a legislação brasileira (LGPD Art. 16, II).
                </p>
              </div>
            </div>

            <Link to="/login" className="btn-secondary w-full justify-center text-sm">
              Voltar ao login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
