import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  ArrowLeft, Mail, Database, CheckCircle2, AlertTriangle,
  ShieldCheck, Clock, FileText, UserCircle, Image, Key, Activity,
} from 'lucide-react';

type Step = 'form' | 'success';

const DATA_CATEGORIES = [
  { id: 'profile',    icon: UserCircle, label: 'Dados de perfil',         desc: 'Nome, endereço, telefone, foto' },
  { id: 'documents',  icon: Image,      label: 'Documentos KYC',          desc: 'RG, CPF, comprovante de residência' },
  { id: 'api_keys',   icon: Key,        label: 'Chaves de API e tokens',  desc: 'Integrações e webhooks configurados' },
  { id: 'tracking',   icon: Activity,   label: 'Pixels de rastreamento',  desc: 'Meta Pixel, Google Tag, Utmify, etc.' },
  { id: 'marketing',  icon: FileText,   label: 'Preferências de marketing', desc: 'Histórico de comunicações e notificações' },
];

export default function DeleteDataPage() {
  const [step, setStep]       = useState<Step>('form');
  const [email, setEmail]     = useState('');
  const [confirm, setConfirm] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [reason, setReason]   = useState('');

  const toggle = (id: string) =>
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const requestDataDeletion = useMutation({
    mutationFn: () => api.post('/auth/request-data-deletion', { email, categories: selected, reason }),
    onSuccess: () => setStep('success'),
  });

  const emailMatch = email.trim() !== '' && email.trim() === confirm.trim();
  const canSubmit  = emailMatch && selected.length > 0;

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
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                <Database size={18} className="text-accent" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-text">Solicitar exclusão de dados</h1>
                <p className="text-xs text-text3">Sua conta permanece ativa</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-[8px] bg-bg3">
              <ShieldCheck size={14} className="text-accent flex-shrink-0 mt-0.5" />
              <p className="text-xs text-text2 leading-relaxed">
                Você pode solicitar a exclusão de categorias específicas de dados sem precisar encerrar sua conta.
                Direito garantido pela <strong className="text-text">LGPD (Lei 13.709/2018)</strong>.
              </p>
            </div>

            {/* Categorias */}
            <div>
              <p className="text-xs font-semibold text-text mb-3">
                Selecione os dados que deseja excluir
              </p>
              <div className="space-y-2">
                {DATA_CATEGORIES.map(cat => {
                  const active = selected.includes(cat.id);
                  const Icon = cat.icon;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => toggle(cat.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-[8px] border text-left transition-colors ${
                        active
                          ? 'border-accent/50 bg-accent/6 text-text'
                          : 'border-border bg-bg3 hover:border-border2 text-text2'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-[6px] flex items-center justify-center flex-shrink-0 ${active ? 'bg-accent/15' : 'bg-bg2'}`}>
                        <Icon size={14} className={active ? 'text-accent' : 'text-text3'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold leading-tight">{cat.label}</div>
                        <div className="text-[11px] text-text3 mt-0.5">{cat.desc}</div>
                      </div>
                      <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                        active ? 'bg-accent border-accent' : 'border-border2'
                      }`}>
                        {active && <CheckCircle2 size={12} className="text-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>
              {selected.length === 0 && (
                <p className="text-[11px] text-text3 mt-2">Selecione pelo menos uma categoria.</p>
              )}
            </div>

            {/* Aviso dados retidos */}
            <div className="flex items-start gap-3 p-3 rounded-[8px] bg-amber/8 border border-amber/20">
              <AlertTriangle size={14} className="text-amber flex-shrink-0 mt-0.5" />
              <p className="text-xs text-text2 leading-relaxed">
                Registros de transações financeiras, notas fiscais e audit log são mantidos por obrigação legal e não podem ser excluídos por esta solicitação.
              </p>
            </div>

            {/* Formulário */}
            <form
              onSubmit={e => { e.preventDefault(); if (canSubmit) requestDataDeletion.mutate(); }}
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
                  placeholder="Descreva o motivo da solicitação (opcional)…"
                  maxLength={500}
                />
              </div>

              <button
                type="submit"
                disabled={!canSubmit || requestDataDeletion.isPending}
                className="btn-primary w-full justify-center py-2.5"
              >
                <Database size={14} />
                {requestDataDeletion.isPending ? 'Enviando solicitação…' : 'Solicitar exclusão de dados'}
              </button>

              {requestDataDeletion.isError && (
                <p className="text-xs text-red text-center">
                  {(requestDataDeletion.error as any)?.response?.data?.message || 'Erro ao enviar solicitação. Tente novamente.'}
                </p>
              )}

              <p className="text-[11px] text-text3 text-center leading-relaxed">
                Quer encerrar sua conta completamente?{' '}
                <Link to="/excluir-conta" className="text-accent hover:underline">
                  Clique aqui
                </Link>
              </p>
            </form>
          </div>
        ) : (
          /* ── Sucesso ── */
          <div className="card text-center space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-green/10 flex items-center justify-center mx-auto">
              <CheckCircle2 size={28} className="text-green" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text mb-1">Solicitação registrada</h2>
              <p className="text-sm text-text2 leading-relaxed">
                Recebemos o pedido para <strong className="text-text">{email}</strong>.
                Um e-mail de confirmação foi enviado.
              </p>
            </div>

            <div className="space-y-3 text-left">
              <div className="flex items-start gap-3 p-3 rounded-[8px] bg-bg3">
                <Clock size={14} className="text-text3 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-text2 leading-relaxed">
                  Os dados selecionados serão excluídos em até <strong className="text-text">15 dias úteis</strong>,
                  conforme prazo previsto na LGPD.
                </p>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-[8px] bg-bg3">
                <ShieldCheck size={14} className="text-text3 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-text2 leading-relaxed">
                  Sua conta permanece ativa. Você pode continuar usando a plataforma normalmente.
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
