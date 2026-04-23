import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { PageHeader } from '@/components/ui';
import { Upload, CheckCircle2, AlertCircle, Building2, User, Banknote, FileText } from 'lucide-react';

type KycStatusResponse = {
  kycStatus: 'PENDING' | 'DOCUMENTS_SENT' | 'APPROVED' | 'REJECTED';
  isActive: boolean;
  pagarmeRecipientId: string | null;
  pagarmeRecipientStatus: string | null;
  rejectedReason: string | null;
  canOperate: boolean;
  completeness: { hasDocuments: boolean; hasBanking: boolean; hasRegister: boolean };
  documents: { id: string; type: string; url: string; uploadedAt: string }[];
};

const DOC_TYPES = [
  { value: 'RG',                label: 'RG / CNH (frente e verso)' },
  { value: 'COMPROVANTE_RESIDENCIA', label: 'Comprovante de residência' },
  { value: 'CONTRATO_SOCIAL',   label: 'Contrato social (PJ)' },
  { value: 'CARTAO_CNPJ',       label: 'Cartão CNPJ (PJ)' },
  { value: 'SELFIE',            label: 'Selfie com documento' },
];

export default function Verification() {
  const qc = useQueryClient();
  const { data: kyc, isLoading } = useQuery<KycStatusResponse>({
    queryKey: ['kyc-status'],
    queryFn : () => api.get('/producers/kyc/status').then(r => r.data),
  });

  if (isLoading || !kyc) {
    return (
      <div>
        <PageHeader title="Verificação" sub="Envie seus documentos para liberar as operações." />
        <div className="card p-6">Carregando...</div>
      </div>
    );
  }

  const { completeness, kycStatus, pagarmeRecipientId } = kyc;
  const percent = useMemo(() => {
    const flags = [completeness.hasDocuments, completeness.hasBanking, completeness.hasRegister];
    return Math.round((flags.filter(Boolean).length / flags.length) * 100);
  }, [completeness]);

  return (
    <div className="space-y-6">
      <PageHeader title="Verificação" sub="Complete as 3 etapas para destravar suas operações na plataforma." />

      <StatusBanner status={kycStatus} recipientId={pagarmeRecipientId} rejectedReason={kyc.rejectedReason} />

      <div className="card p-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-text2">Progresso</span>
          <span className="font-semibold text-text">{percent}%</span>
        </div>
        <div className="h-2 rounded-full bg-bg3 overflow-hidden">
          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${percent}%` }} />
        </div>
      </div>

      <Section
        icon={<User size={18} />}
        title="1. Dados cadastrais"
        complete={completeness.hasRegister}
        locked={kycStatus === 'APPROVED'}
      >
        <RegisterForm onSaved={() => qc.invalidateQueries({ queryKey: ['kyc-status'] })} disabled={kycStatus === 'APPROVED'} />
      </Section>

      <Section
        icon={<Banknote size={18} />}
        title="2. Dados bancários"
        complete={completeness.hasBanking}
        locked={kycStatus === 'APPROVED'}
      >
        <BankingForm onSaved={() => qc.invalidateQueries({ queryKey: ['kyc-status'] })} disabled={kycStatus === 'APPROVED'} />
      </Section>

      <Section
        icon={<FileText size={18} />}
        title="3. Documentos"
        complete={completeness.hasDocuments}
        locked={kycStatus === 'APPROVED'}
      >
        <DocumentsForm
          documents={kyc.documents}
          onUploaded={() => qc.invalidateQueries({ queryKey: ['kyc-status'] })}
          disabled={kycStatus === 'APPROVED'}
        />
      </Section>

      <SubmitBar kyc={kyc} onSubmitted={() => qc.invalidateQueries({ queryKey: ['kyc-status'] })} />
    </div>
  );
}

// ── STATUS BANNER ─────────────────────────────────────────────────
function StatusBanner({ status, recipientId, rejectedReason }: {
  status: string;
  recipientId: string | null;
  rejectedReason: string | null;
}) {
  if (status === 'APPROVED' && recipientId) {
    return (
      <div className="card p-4 flex items-start gap-3 border-l-4 border-green bg-green/5">
        <CheckCircle2 className="text-green flex-shrink-0 mt-0.5" size={20} />
        <div>
          <div className="font-semibold text-text">Conta aprovada e recebedor ativo</div>
          <div className="text-sm text-text2">
            Recebedor Pagar.me: <code className="text-accent">{recipientId}</code>. Suas operações estão liberadas.
          </div>
        </div>
      </div>
    );
  }
  if (status === 'REJECTED') {
    return (
      <div className="card p-4 flex items-start gap-3 border-l-4 border-red-500 bg-red-500/5">
        <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
        <div>
          <div className="font-semibold text-text">Cadastro rejeitado</div>
          <div className="text-sm text-text2">{rejectedReason || 'Entre em contato com o suporte para mais informações.'}</div>
        </div>
      </div>
    );
  }
  if (status === 'DOCUMENTS_SENT') {
    return (
      <div className="card p-4 flex items-start gap-3 border-l-4 border-yellow-500 bg-yellow-500/5">
        <AlertCircle className="text-yellow-500 flex-shrink-0 mt-0.5" size={20} />
        <div>
          <div className="font-semibold text-text">Aguardando análise</div>
          <div className="text-sm text-text2">
            Seus dados foram enviados. O administrador vai aprovar e criar seu recebedor no Pagar.me.
            Você pode continuar navegando no painel, mas criar produtos, ofertas e vender está bloqueado até a aprovação.
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="card p-4 flex items-start gap-3 border-l-4 border-accent bg-accent/5">
      <AlertCircle className="text-accent flex-shrink-0 mt-0.5" size={20} />
      <div>
        <div className="font-semibold text-text">Envie sua documentação para operar</div>
        <div className="text-sm text-text2">
          A conta está em modo de leitura. Complete as 3 etapas abaixo e clique em "Enviar para análise" para liberar
          a criação de produtos, ofertas, afiliações e recebimento de vendas.
        </div>
      </div>
    </div>
  );
}

// ── SECTION WRAPPER ───────────────────────────────────────────────
function Section({ icon, title, complete, locked, children }: any) {
  return (
    <div className="card">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <div className="flex items-center gap-2 text-text">
          {icon}
          <span className="font-semibold">{title}</span>
        </div>
        {complete
          ? <span className="inline-flex items-center gap-1 text-xs text-green"><CheckCircle2 size={14} /> completo</span>
          : <span className="text-xs text-text3">pendente</span>}
      </div>
      <div className={`p-5 ${locked ? 'opacity-60 pointer-events-none' : ''}`}>
        {children}
      </div>
    </div>
  );
}

// ── FORMULÁRIO DE DADOS CADASTRAIS ────────────────────────────────
function RegisterForm({ onSaved, disabled }: { onSaved: () => void; disabled?: boolean }) {
  const [form, setForm] = useState<any>({
    type: 'individual',
    name: '', email: '', document: '',
    birthdate: '', monthlyIncome: 500000, professionalOccupation: '', motherName: '',
    companyName: '', tradingName: '', siteUrl: '', annualRevenue: 1200000, corporationType: 'LTDA', foundingDate: '',
    phoneNumbers: [{ ddd: '', number: '', type: 'mobile' }],
    address: { street: '', streetNumber: '', complementary: '', neighborhood: '', city: '', state: '', zipCode: '', referencePoint: '' },
  });

  const mutation = useMutation({
    mutationFn: (data: any) => api.patch('/producers/register-information', data),
    onSuccess: () => { toast.success('Dados cadastrais salvos'); onSaved(); },
    onError  : (e: any) => toast.error(e?.response?.data?.message || 'Erro ao salvar'),
  });

  const handleSubmit = () => {
    const payload: any = { ...form };
    if (form.type === 'individual') {
      delete payload.companyName; delete payload.tradingName; delete payload.siteUrl;
      delete payload.annualRevenue; delete payload.corporationType; delete payload.foundingDate;
    }
    mutation.mutate(payload);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" checked={form.type === 'individual'} onChange={() => setForm({ ...form, type: 'individual' })} disabled={disabled} />
          Pessoa Física
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" checked={form.type === 'corporation'} onChange={() => setForm({ ...form, type: 'corporation' })} disabled={disabled} />
          Pessoa Jurídica
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label={form.type === 'corporation' ? 'Razão social' : 'Nome completo'}>
          <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} disabled={disabled} />
        </Field>
        <Field label="E-mail">
          <input className="input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} disabled={disabled} />
        </Field>
        <Field label={form.type === 'corporation' ? 'CNPJ' : 'CPF'}>
          <input className="input" value={form.document} onChange={e => setForm({ ...form, document: e.target.value })} disabled={disabled} />
        </Field>
        {form.type === 'individual' ? (
          <>
            <Field label="Data de nascimento (DD/MM/AAAA)">
              <input className="input" value={form.birthdate} onChange={e => setForm({ ...form, birthdate: e.target.value })} disabled={disabled} />
            </Field>
            <Field label="Profissão">
              <input className="input" value={form.professionalOccupation} onChange={e => setForm({ ...form, professionalOccupation: e.target.value })} disabled={disabled} />
            </Field>
            <Field label="Renda mensal (centavos)">
              <input className="input" type="number" value={form.monthlyIncome} onChange={e => setForm({ ...form, monthlyIncome: +e.target.value })} disabled={disabled} />
            </Field>
            <Field label="Nome da mãe">
              <input className="input" value={form.motherName} onChange={e => setForm({ ...form, motherName: e.target.value })} disabled={disabled} />
            </Field>
          </>
        ) : (
          <>
            <Field label="Nome fantasia">
              <input className="input" value={form.tradingName} onChange={e => setForm({ ...form, tradingName: e.target.value })} disabled={disabled} />
            </Field>
            <Field label="Tipo da empresa">
              <select className="input" value={form.corporationType} onChange={e => setForm({ ...form, corporationType: e.target.value })} disabled={disabled}>
                <option value="LTDA">LTDA</option>
                <option value="EIRELI">EIRELI</option>
                <option value="MEI">MEI</option>
                <option value="SA">S.A.</option>
              </select>
            </Field>
            <Field label="Data de fundação (DD/MM/AAAA)">
              <input className="input" value={form.foundingDate} onChange={e => setForm({ ...form, foundingDate: e.target.value })} disabled={disabled} />
            </Field>
            <Field label="Faturamento anual (centavos)">
              <input className="input" type="number" value={form.annualRevenue} onChange={e => setForm({ ...form, annualRevenue: +e.target.value })} disabled={disabled} />
            </Field>
            <Field label="Site">
              <input className="input" value={form.siteUrl} onChange={e => setForm({ ...form, siteUrl: e.target.value })} disabled={disabled} />
            </Field>
          </>
        )}
      </div>

      <div className="border-t border-border pt-3">
        <div className="text-sm font-semibold mb-2">Telefone</div>
        <div className="grid grid-cols-3 gap-2">
          <Field label="DDD">
            <input className="input" value={form.phoneNumbers[0].ddd} onChange={e => setForm({ ...form, phoneNumbers: [{ ...form.phoneNumbers[0], ddd: e.target.value }] })} disabled={disabled} />
          </Field>
          <Field label="Número">
            <input className="input" value={form.phoneNumbers[0].number} onChange={e => setForm({ ...form, phoneNumbers: [{ ...form.phoneNumbers[0], number: e.target.value }] })} disabled={disabled} />
          </Field>
          <Field label="Tipo">
            <select className="input" value={form.phoneNumbers[0].type} onChange={e => setForm({ ...form, phoneNumbers: [{ ...form.phoneNumbers[0], type: e.target.value as any }] })} disabled={disabled}>
              <option value="mobile">Celular</option>
              <option value="home">Fixo</option>
            </select>
          </Field>
        </div>
      </div>

      <div className="border-t border-border pt-3">
        <div className="text-sm font-semibold mb-2">Endereço</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="CEP"><input className="input" value={form.address.zipCode} onChange={e => setForm({ ...form, address: { ...form.address, zipCode: e.target.value } })} disabled={disabled} /></Field>
          <Field label="Logradouro"><input className="input" value={form.address.street} onChange={e => setForm({ ...form, address: { ...form.address, street: e.target.value } })} disabled={disabled} /></Field>
          <Field label="Número"><input className="input" value={form.address.streetNumber} onChange={e => setForm({ ...form, address: { ...form.address, streetNumber: e.target.value } })} disabled={disabled} /></Field>
          <Field label="Complemento"><input className="input" value={form.address.complementary} onChange={e => setForm({ ...form, address: { ...form.address, complementary: e.target.value } })} disabled={disabled} /></Field>
          <Field label="Bairro"><input className="input" value={form.address.neighborhood} onChange={e => setForm({ ...form, address: { ...form.address, neighborhood: e.target.value } })} disabled={disabled} /></Field>
          <Field label="Cidade"><input className="input" value={form.address.city} onChange={e => setForm({ ...form, address: { ...form.address, city: e.target.value } })} disabled={disabled} /></Field>
          <Field label="UF"><input className="input" maxLength={2} value={form.address.state} onChange={e => setForm({ ...form, address: { ...form.address, state: e.target.value.toUpperCase() } })} disabled={disabled} /></Field>
        </div>
      </div>

      <button className="btn-primary" onClick={handleSubmit} disabled={mutation.isPending || disabled}>
        {mutation.isPending ? 'Salvando...' : 'Salvar dados cadastrais'}
      </button>
    </div>
  );
}

// ── FORMULÁRIO DE DADOS BANCÁRIOS ─────────────────────────────────
function BankingForm({ onSaved, disabled }: { onSaved: () => void; disabled?: boolean }) {
  const [form, setForm] = useState<any>({
    bank: '', branchNumber: '', branchCheckDigit: '', accountNumber: '', accountCheckDigit: '',
    type: 'checking', holderName: '', holderDocument: '',
  });

  const mutation = useMutation({
    mutationFn: (data: any) => api.patch('/producers/banking', data),
    onSuccess : () => { toast.success('Dados bancários salvos'); onSaved(); },
    onError   : (e: any) => toast.error(e?.response?.data?.message || 'Erro ao salvar'),
  });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Field label="Banco (código 3 dígitos)">
          <input className="input" maxLength={3} value={form.bank} onChange={e => setForm({ ...form, bank: e.target.value })} disabled={disabled} />
        </Field>
        <Field label="Agência">
          <input className="input" value={form.branchNumber} onChange={e => setForm({ ...form, branchNumber: e.target.value })} disabled={disabled} />
        </Field>
        <Field label="Dígito da agência (opcional)">
          <input className="input" maxLength={2} value={form.branchCheckDigit} onChange={e => setForm({ ...form, branchCheckDigit: e.target.value })} disabled={disabled} />
        </Field>
        <Field label="Conta">
          <input className="input" value={form.accountNumber} onChange={e => setForm({ ...form, accountNumber: e.target.value })} disabled={disabled} />
        </Field>
        <Field label="Dígito da conta">
          <input className="input" maxLength={2} value={form.accountCheckDigit} onChange={e => setForm({ ...form, accountCheckDigit: e.target.value })} disabled={disabled} />
        </Field>
        <Field label="Tipo">
          <select className="input" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} disabled={disabled}>
            <option value="checking">Corrente</option>
            <option value="savings">Poupança</option>
          </select>
        </Field>
        <Field label="Titular">
          <input className="input" value={form.holderName} onChange={e => setForm({ ...form, holderName: e.target.value })} disabled={disabled} />
        </Field>
        <Field label="CPF/CNPJ do titular">
          <input className="input" value={form.holderDocument} onChange={e => setForm({ ...form, holderDocument: e.target.value })} disabled={disabled} />
        </Field>
      </div>
      <button className="btn-primary" onClick={() => mutation.mutate(form)} disabled={mutation.isPending || disabled}>
        {mutation.isPending ? 'Salvando...' : 'Salvar dados bancários'}
      </button>
    </div>
  );
}

// ── UPLOAD DE DOCUMENTOS ──────────────────────────────────────────
function DocumentsForm({ documents, onUploaded, disabled }: {
  documents: any[];
  onUploaded: () => void;
  disabled?: boolean;
}) {
  const [type, setType] = useState(DOC_TYPES[0].value);
  const [url, setUrl]   = useState('');

  const mutation = useMutation({
    mutationFn: (data: any) => api.post('/producers/kyc/documents', data),
    onSuccess : () => { toast.success('Documento adicionado'); setUrl(''); onUploaded(); },
    onError   : (e: any) => toast.error(e?.response?.data?.message || 'Erro ao enviar'),
  });

  return (
    <div className="space-y-3">
      <div className="text-xs text-text3">
        Faça o upload do arquivo no seu provedor (Google Drive, Dropbox, etc), copie o link público e cole abaixo.
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Field label="Tipo">
          <select className="input" value={type} onChange={e => setType(e.target.value)} disabled={disabled}>
            {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </Field>
        <div className="md:col-span-2">
          <Field label="URL do arquivo">
            <input className="input" type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." disabled={disabled} />
          </Field>
        </div>
      </div>
      <button className="btn-primary" onClick={() => mutation.mutate({ type, url })} disabled={mutation.isPending || !url || disabled}>
        <Upload size={14} className="mr-1 inline" /> Adicionar
      </button>

      {documents.length > 0 && (
        <div className="mt-4 border-t border-border pt-3">
          <div className="text-sm font-semibold mb-2">Enviados ({documents.length})</div>
          <ul className="space-y-1 text-sm">
            {documents.map(d => (
              <li key={d.id} className="flex items-center justify-between">
                <span className="text-text2">{DOC_TYPES.find(t => t.value === d.type)?.label || d.type}</span>
                <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline text-xs">ver arquivo</a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── SUBMIT BAR ────────────────────────────────────────────────────
function SubmitBar({ kyc, onSubmitted }: { kyc: KycStatusResponse; onSubmitted: () => void }) {
  const all = kyc.completeness.hasDocuments && kyc.completeness.hasBanking && kyc.completeness.hasRegister;
  const mutation = useMutation({
    mutationFn: () => api.post('/producers/kyc/submit'),
    onSuccess : () => { toast.success('Enviado para análise'); onSubmitted(); },
    onError   : (e: any) => toast.error(e?.response?.data?.message || 'Erro ao enviar'),
  });

  if (kyc.kycStatus === 'APPROVED') return null;
  if (kyc.kycStatus === 'DOCUMENTS_SENT') {
    return (
      <div className="card p-4 flex items-center justify-between">
        <div className="text-sm text-text2">Aguardando aprovação do administrador.</div>
      </div>
    );
  }

  return (
    <div className="card p-4 flex items-center justify-between">
      <div className="text-sm text-text2">
        {all ? 'Tudo pronto — envie para análise.' : 'Complete as 3 etapas acima para enviar.'}
      </div>
      <button
        className="btn-primary"
        onClick={() => mutation.mutate()}
        disabled={!all || mutation.isPending}
      >
        {mutation.isPending ? 'Enviando...' : 'Enviar para análise'}
      </button>
    </div>
  );
}

// ── HELPER ────────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="form-group">
      <label className="label">{label}</label>
      {children}
    </div>
  );
}
