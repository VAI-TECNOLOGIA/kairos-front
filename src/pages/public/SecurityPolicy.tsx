import { Link } from 'react-router-dom';
import {
  ShieldCheck, Lock, Server, Eye, AlertTriangle, RefreshCw,
  UserCheck, Globe, FileText, Mail, KeyRound, Database,
  CreditCard, Bell, Fingerprint, ArrowLeft,
} from 'lucide-react';

const LAST_UPDATED = '29 de abril de 2026';
const CONTACT_EMAIL = 'contato@kairosway.com.br';

interface SectionProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}

function Section({ icon, title, children }: SectionProps) {
  return (
    <section className="mb-10">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-[8px] bg-accent/10 flex items-center justify-center flex-shrink-0 text-accent">
          {icon}
        </div>
        <h2 className="text-lg font-bold text-text">{title}</h2>
      </div>
      <div className="text-text2 text-sm leading-relaxed space-y-3 pl-12">
        {children}
      </div>
    </section>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-accent mt-0.5 flex-shrink-0">›</span>
      <span><strong className="text-text font-semibold">{label}:</strong> {value}</span>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-green/10 text-green border border-green/20">
      {children}
    </span>
  );
}

export default function SecurityPolicy() {
  return (
    <div className="min-h-screen bg-bg">

      {/* Topbar */}
      <header className="sticky top-0 z-40 bg-bg2 border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link to="/login" className="flex items-center gap-2 text-text3 hover:text-text transition-colors text-sm">
            <ArrowLeft size={15} />
            Voltar ao login
          </Link>
          <div className="flex items-center gap-2">
            <img src="/kairosLogoWhite.png" alt="Kairos Way" className="h-6 object-contain" />
            <span className="text-sm font-bold text-text hidden sm:inline">KAIROS WAY</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-green/10 text-green border border-green/20">
            <ShieldCheck size={12} />
            PCI DSS
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-bg2 border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4 text-accent">
            <ShieldCheck size={28} />
          </div>
          <h1 className="text-3xl font-extrabold text-text mb-2">Política de Segurança</h1>
          <p className="text-text2 text-sm max-w-xl mx-auto">
            Como protegemos seus dados, suas transações e a integridade da plataforma Kairos Way.
          </p>
          <p className="text-text3 text-xs mt-4">Última atualização: {LAST_UPDATED}</p>
        </div>
      </div>

      {/* Compliance badges */}
      <div className="border-b border-border bg-bg2/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-center gap-3">
          {[
            { label: 'PCI DSS v4.0', color: 'text-accent', bg: 'bg-accent/10 border-accent/20' },
            { label: 'LGPD',         color: 'text-green',  bg: 'bg-green/10  border-green/20'  },
            { label: 'TLS 1.3',      color: 'text-accent', bg: 'bg-accent/10 border-accent/20' },
            { label: 'AES-256-GCM',  color: 'text-amber',  bg: 'bg-amber/10  border-amber/20'  },
            { label: 'ISO 27001',    color: 'text-green',  bg: 'bg-green/10  border-green/20'  },
          ].map(b => (
            <span key={b.label} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${b.color} ${b.bg}`}>
              <ShieldCheck size={11} />
              {b.label}
            </span>
          ))}
        </div>
      </div>

      {/* Conteúdo */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">

        <Section icon={<Lock size={18} />} title="Criptografia e Transmissão de Dados">
          <p>
            Toda comunicação entre o seu navegador e os servidores da Kairos Way utiliza
            <strong className="text-text"> TLS 1.3</strong>, o protocolo de segurança de transporte mais
            moderno disponível. Conexões com versões anteriores (TLS 1.0 / 1.1) são recusadas automaticamente.
          </p>
          <Item label="Protocolo" value="TLS 1.3 com Perfect Forward Secrecy (PFS)" />
          <Item label="Certificados" value="Emitidos via Cloudflare com renovação automática" />
          <Item label="HSTS" value="Habilitado — força HTTPS em todos os subdomínios" />
          <Item label="Dados em repouso" value="Criptografados com AES-256 no banco de dados gerenciado" />
          <Item label="Segredos sensíveis" value="Campos MFA e chaves de API cifrados com AES-256-GCM antes de persistir" />
        </Section>

        <Section icon={<CreditCard size={18} />} title="Segurança de Pagamentos (PCI DSS)">
          <p>
            A Kairos Way opera em conformidade com o <strong className="text-text">PCI DSS v4.0</strong>.
            Nenhum dado de cartão de crédito é armazenado em nossos servidores — os números de cartão
            são tokenizados diretamente no adquirente antes de qualquer gravação em banco de dados.
          </p>
          <Item label="Tokenização"    value="Realizada server-side via Pagar.me antes de qualquer persistência (SAQ A-EP)" />
          <Item label="PAN"            value="Número do cartão nunca gravado em banco, logs ou arquivos" />
          <Item label="CVV"            value="Nunca armazenado — descartado imediatamente após autorização" />
          <Item label="Multi-adquirente" value="Failover automático Pagar.me → Asaas → Stone → Cielo" />
          <Item label="Reembolsos"     value="Processados sem necessidade de re-informar dados de cartão" />
          <div className="mt-3 p-3 rounded-[8px] bg-green/5 border border-green/20 text-xs text-green">
            <strong>Aviso de conformidade:</strong> A Kairos Way não é um emissor de cartão.
            Dados de portador são tratados exclusivamente pelos adquirentes credenciados PCI DSS.
          </div>
        </Section>

        <Section icon={<KeyRound size={18} />} title="Autenticação e Controle de Acesso">
          <p>
            O sistema implementa múltiplas camadas de proteção contra acesso não autorizado, seguindo
            o requisito <strong className="text-text">PCI DSS REQ-8</strong>.
          </p>
          <Item label="Senhas"             value="Armazenadas com bcrypt (salt factor 12) — nunca em texto plano" />
          <Item label="Tokens JWT"         value="Access token 15 min + Refresh token 7 dias — rotação automática" />
          <Item label="MFA (2FA)"          value="TOTP via aplicativo autenticador (Google Authenticator, Authy) — segredo cifrado com AES-256-GCM" />
          <Item label="Bloqueio por tentativas" value="Conta bloqueada por 30 min após 6 tentativas de senha incorretas" />
          <Item label="Sessões simultâneas" value="Máximo de 5 sessões ativas por usuário" />
          <Item label="Auto-logout"         value="Sessão encerrada automaticamente após 15 min de inatividade (PCI REQ-8)" />
          <Item label="Registro de IP"      value="IP e User-Agent registrados em cada login bem-sucedido" />
        </Section>

        <Section icon={<Eye size={18} />} title="Auditoria e Rastreabilidade">
          <p>
            Toda ação sensível na plataforma gera um registro imutável de auditoria com IP de origem,
            timestamp, usuário e nível de criticidade.
          </p>
          <Item label="Eventos auditados" value="LOGIN, LOGOUT, MFA, criação de produtos, aprovações KYC, saques, alterações de configuração" />
          <Item label="Níveis"             value="LOW / MEDIUM / HIGH / CRITICAL — alertas automáticos para eventos críticos" />
          <Item label="Retenção"           value="Logs mantidos por no mínimo 12 meses" />
          <Item label="Imutabilidade"      value="Registros de auditoria não podem ser editados ou excluídos por usuários comuns" />
        </Section>

        <Section icon={<Database size={18} />} title="Proteção de Dados (LGPD)">
          <p>
            A Kairos Way cumpre a <strong className="text-text">Lei Geral de Proteção de Dados (LGPD —
            Lei 13.709/2018)</strong>. Coletamos apenas os dados estritamente necessários para a prestação
            do serviço de gateway de pagamentos.
          </p>
          <Item label="Dados coletados"   value="Nome, e-mail, CPF/CNPJ, telefone, dados bancários para repasse" />
          <Item label="Finalidade"        value="Processamento de pagamentos, prevenção a fraudes, conformidade regulatória" />
          <Item label="Compartilhamento"  value="Somente com adquirentes credenciados (Pagar.me, Asaas, Stone, Cielo) e autoridades competentes" />
          <Item label="Retenção"          value="Dados mantidos pelo período legal mínimo de 5 anos após encerramento da relação" />
          <Item label="Direitos do titular" value="Acesso, correção, exclusão e portabilidade mediante solicitação pelo suporte" />
          <Item label="Encarregado (DPO)"   value={`${CONTACT_EMAIL}`} />
        </Section>

        <Section icon={<Server size={18} />} title="Infraestrutura e Disponibilidade">
          <Item label="Hospedagem"         value="Vercel Edge Network (frontend) + infraestrutura gerenciada (backend)" />
          <Item label="Banco de dados"     value="PostgreSQL gerenciado com backups automáticos diários e replicação" />
          <Item label="Cache / Filas"      value="Redis gerenciado via Upstash com TLS obrigatório" />
          <Item label="Armazenamento"      value="Cloudflare R2 com controle de acesso por política de bucket" />
          <Item label="SLA"                value="99,9% de disponibilidade mensal" />
          <Item label="Backups"            value="Diários com retenção de 30 dias e testes de restauração mensais" />
          <Item label="Redundância"        value="Multi-região — failover automático em caso de falha de zona" />
        </Section>

        <Section icon={<UserCheck size={18} />} title="Verificação de Identidade (KYC)">
          <p>
            Todos os produtores passam por um processo de verificação de identidade antes de receberem
            fundos, conforme exigências da <strong className="text-text">Resolução BACEN 6.080/2023</strong>.
          </p>
          <Item label="Documentos exigidos" value="RG/CNH, comprovante de residência, dados bancários" />
          <Item label="Análise"             value="Manual pela equipe de compliance + validação automática junto ao adquirente" />
          <Item label="Status"              value="PENDING → DOCUMENTS_SENT → APPROVED (ou REJECTED com justificativa)" />
          <Item label="Recebedor Pagar.me"  value="Criado apenas após aprovação KYC completa" />
        </Section>

        <Section icon={<RefreshCw size={18} />} title="Prevenção a Fraudes e Chargebacks">
          <Item label="Fingerprint"         value="Coleta de fingerprint do dispositivo em transações de cartão" />
          <Item label="Validação de documento" value="CPF/CNPJ validado antes de enviar ao adquirente — evita rejeições silenciosas" />
          <Item label="Rate limiting"       value="Máximo de 10 tentativas de pagamento por minuto por IP" />
          <Item label="Bloqueio de afiliado" value="Afiliados com enrollment BLOCKED não recebem comissões" />
          <Item label="Cooldown de saque"   value="Período de carência após aprovação antes do primeiro saque" />
          <Item label="Prazo de liberação"  value="Saldo liberado conforme prazo configurado por método de pagamento" />
        </Section>

        <Section icon={<Globe size={18} />} title="Segurança de Integrações Externas">
          <p>
            Todas as integrações com serviços de terceiros utilizam credenciais individuais por produtor,
            nunca compartilhadas.
          </p>
          <Item label="Webhooks"     value="Assinados com HMAC-SHA256 — receptor deve validar a assinatura antes de processar" />
          <Item label="Pixels de rastreamento" value="Carregados apenas no checkout com consentimento implícito" />
          <Item label="WhatsApp (Zapi)"        value="Notificações unidirecionais de confirmação — nenhum dado sensível enviado" />
          <Item label="NFe.io / Melhor Envio"  value="Tokens por produtor, rotação manual recomendada a cada 90 dias" />
          <Item label="Utmify"                 value="Token individual por produtor configurado na página de Integrações" />
        </Section>

        <Section icon={<Bell size={18} />} title="Gestão de Incidentes">
          <p>
            A Kairos Way mantém um processo documentado de resposta a incidentes de segurança.
          </p>
          <Item label="Detecção"      value="Monitoramento contínuo de logs com alertas automáticos para eventos CRITICAL" />
          <Item label="Notificação"   value="Usuários afetados notificados em até 72h após confirmação do incidente (conforme LGPD Art. 48)" />
          <Item label="Contenção"     value="Revogação automática de tokens e bloqueio de sessões suspeitas" />
          <Item label="Pós-incidente" value="Relatório público de causa raiz disponibilizado em até 30 dias" />
        </Section>

        <Section icon={<Fingerprint size={18} />} title="Programa de Divulgação Responsável">
          <p>
            Encontrou uma vulnerabilidade? Agradecemos a divulgação responsável.
            <strong className="text-text"> Não publique a vulnerabilidade antes de entrar em contato conosco.</strong>
          </p>
          <div className="p-4 rounded-[8px] bg-bg3 border border-border space-y-2">
            <Item label="Canal de reporte" value={CONTACT_EMAIL} />
            <Item label="Prazo de resposta" value="Até 5 dias úteis para confirmação" />
            <Item label="Prazo de correção" value="Até 90 dias para vulnerabilidades críticas" />
            <Item label="Escopo"            value="Plataforma web, API, aplicativos móveis e infraestrutura de produção" />
            <Item label="Fora do escopo"    value="Ataques de engenharia social, phishing, ataques físicos" />
          </div>
          <div className="mt-3 p-3 rounded-[8px] bg-amber/5 border border-amber/20 text-xs text-amber">
            Reportes de boa-fé que sigam este processo não serão objeto de ação legal por parte da Kairos Way.
          </div>
        </Section>

        <Section icon={<FileText size={18} />} title="Versão e Histórico">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-6 text-text3 font-semibold text-xs uppercase tracking-wide">Versão</th>
                  <th className="text-left py-2 pr-6 text-text3 font-semibold text-xs uppercase tracking-wide">Data</th>
                  <th className="text-left py-2 text-text3 font-semibold text-xs uppercase tracking-wide">Alteração</th>
                </tr>
              </thead>
              <tbody className="text-text2">
                <tr className="border-b border-border/40">
                  <td className="py-2 pr-6 font-mono text-xs text-accent">1.0</td>
                  <td className="py-2 pr-6">Abril 2026</td>
                  <td className="py-2">Publicação inicial</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Section>

        {/* Contato */}
        <div className="mt-2 p-5 rounded-[10px] bg-bg2 border border-border flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-10 h-10 rounded-[8px] bg-accent/10 flex items-center justify-center flex-shrink-0 text-accent">
            <Mail size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-text">Dúvidas sobre segurança?</div>
            <div className="text-xs text-text2 mt-0.5">
              Entre em contato com nossa equipe de segurança:
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-accent hover:underline ml-1">{CONTACT_EMAIL}</a>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Tag>PCI DSS</Tag>
            <Tag>LGPD</Tag>
          </div>
        </div>

      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-text3">
        © {new Date().getFullYear()} Kairos Way · Gateway de Pagamentos ·{' '}
        <Link to="/login" className="hover:text-accent transition-colors">Acessar plataforma</Link>
      </footer>
    </div>
  );
}
