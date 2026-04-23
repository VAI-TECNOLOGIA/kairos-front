import { useState } from 'react';
import { PageHeader } from '@/components/ui';
import {
  FileText, Truck, ChevronDown, ChevronUp, ExternalLink,
  HelpCircle, AlertTriangle, CheckCircle2, Info,
} from 'lucide-react';

interface StepProps {
  n       : number;
  title   : string;
  children: React.ReactNode;
}

function Step({ n, title, children }: StepProps) {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-accent/15 text-accent font-bold text-sm flex items-center justify-center">
        {n}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-text text-sm mb-1">{title}</div>
        <div className="text-sm text-text2 leading-relaxed space-y-2">{children}</div>
      </div>
    </div>
  );
}

interface SectionProps {
  id      : string;
  icon    : any;
  color   : string;
  title   : string;
  subtitle: string;
  open    : boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function Section({ icon: Icon, color, title, subtitle, open, onToggle, children }: SectionProps) {
  return (
    <div className="card p-0 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 hover:bg-bg3/30 transition-colors text-left"
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}20` }}
        >
          <Icon size={18} style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-text text-sm">{title}</div>
          <div className="text-xs text-text3 mt-0.5">{subtitle}</div>
        </div>
        {open
          ? <ChevronUp size={16} className="text-text3 flex-shrink-0" />
          : <ChevronDown size={16} className="text-text3 flex-shrink-0" />}
      </button>
      {open && (
        <div className="border-t border-border p-4 sm:p-5 space-y-5 bg-bg3/20">
          {children}
        </div>
      )}
    </div>
  );
}

export default function HelpCenter() {
  const [open, setOpen] = useState<'nfe' | 'me' | 'faq' | null>('nfe');

  return (
    <div>
      <PageHeader
        title="Central de Ajuda"
        sub="Guias passo a passo para conectar suas integrações"
      />

      {/* Intro */}
      <div className="card mb-6 p-4 border-l-4 border-accent bg-accent/5">
        <div className="flex items-start gap-3">
          <Info size={16} className="text-accent flex-shrink-0 mt-0.5" />
          <div className="text-sm text-text2 leading-relaxed">
            Abaixo você encontra tutoriais para conectar as integrações externas que a
            Kairos Way utiliza. Cada integração usa suas próprias credenciais, criadas
            diretamente no site oficial do fornecedor. A Kairos apenas armazena o
            token/API key em ambiente seguro para automatizar as operações.
          </div>
        </div>
      </div>

      <div className="space-y-3">

        {/* ─── NFe.io ──────────────────────────────────── */}
        <Section
          id="nfe"
          icon={FileText}
          color="#0055FE"
          title="Conectar NFe.io — emissão automática de notas fiscais"
          subtitle="Toda venda aprovada gera NFS-e automaticamente"
          open={open === 'nfe'}
          onToggle={() => setOpen(open === 'nfe' ? null : 'nfe')}
        >
          <Step n={1} title="Crie sua conta na NFe.io">
            <p>
              Acesse <a href="https://nfe.io" target="_blank" rel="noopener noreferrer"
                       className="text-accent hover:underline inline-flex items-center gap-1">
                nfe.io <ExternalLink size={11} />
              </a> e cadastre-se. Confirme o e-mail e faça login em{' '}
              <a href="https://app.nfe.io" target="_blank" rel="noopener noreferrer"
                 className="text-accent hover:underline inline-flex items-center gap-1">
                app.nfe.io <ExternalLink size={11} />
              </a>.
            </p>
          </Step>

          <Step n={2} title="Cadastre sua empresa">
            <p>No menu lateral, clique em <strong>Empresas</strong> → <strong>Nova empresa</strong>. Preencha:</p>
            <ul className="list-disc ml-5 space-y-1">
              <li>CNPJ ou CPF</li>
              <li>Endereço completo</li>
              <li>Certificado digital A1 (arquivo <code className="bg-bg3 px-1 rounded text-[11px]">.pfx</code> + senha) — obrigatório para emissão real</li>
              <li>Regime tributário e código de serviço municipal (padrão <code className="bg-bg3 px-1 rounded text-[11px]">01.07</code> para software e cursos digitais)</li>
            </ul>
            <p className="text-xs text-text3">A homologação da prefeitura pode levar algumas horas.</p>
          </Step>

          <Step n={3} title="Copie as credenciais da API">
            <ul className="list-disc ml-5 space-y-1">
              <li>
                No topo direito, clique no avatar → <strong>Minha conta</strong> → <strong>API</strong>.
                Copie a <strong>API Key</strong> (sequência longa).
              </li>
              <li>
                Volte em <strong>Empresas</strong>, clique na sua empresa e copie o{' '}
                <strong>Company ID</strong> (aparece na URL:{' '}
                <code className="bg-bg3 px-1 rounded text-[11px]">/companies/ABC123...</code>).
              </li>
            </ul>
          </Step>

          <Step n={4} title="Cole no Kairos Way">
            <ol className="list-decimal ml-5 space-y-1">
              <li>No menu lateral, vá em <strong>Integrações</strong></li>
              <li>Encontre o card <strong>NFe.io</strong> e clique em <strong>Configurar</strong></li>
              <li>Cole a <strong>API Key</strong> e o <strong>Company ID</strong></li>
              <li>Informe o <strong>Código de serviço</strong> (padrão <code className="bg-bg3 px-1 rounded text-[11px]">01.07</code> ou o que sua prefeitura exigir)</li>
              <li>Clique em <strong>Salvar</strong> → depois em <strong>Testar conexão</strong></li>
            </ol>
            <div className="flex items-center gap-2 text-xs text-green mt-2">
              <CheckCircle2 size={12} /> Se aparecer verde, está funcionando.
            </div>
          </Step>

          <Step n={5} title="Como ver as notas emitidas">
            <p>
              Toda venda aprovada gera nota automaticamente. Para ver todas as notas,
              acesse <strong>Minhas Vendas</strong> e clique no banner <em>Abrir painel NFe.io</em>,
              ou direto em{' '}
              <a href="https://app.nfe.io" target="_blank" rel="noopener noreferrer"
                 className="text-accent hover:underline inline-flex items-center gap-1">
                app.nfe.io <ExternalLink size={11} />
              </a>{' '}
              → <strong>Empresas</strong> → sua empresa → aba <strong>NFS-e</strong> → <strong>Listar NFS-e</strong>.
            </p>
          </Step>
        </Section>

        {/* ─── Melhor Envio ─────────────────────────────── */}
        <Section
          id="me"
          icon={Truck}
          color="#00A881"
          title="Conectar Melhor Envio — frete e etiquetas de envio"
          subtitle="Cotação automática e despacho com 1 clique"
          open={open === 'me'}
          onToggle={() => setOpen(open === 'me' ? null : 'me')}
        >
          <Step n={1} title="Crie e verifique sua conta no Melhor Envio">
            <ol className="list-decimal ml-5 space-y-1">
              <li>
                Acesse{' '}
                <a href="https://melhorenvio.com.br" target="_blank" rel="noopener noreferrer"
                   className="text-accent hover:underline inline-flex items-center gap-1">
                  melhorenvio.com.br <ExternalLink size={11} />
                </a>{' '}
                e cadastre-se
              </li>
              <li>Em <strong>Minha Conta → Dados pessoais</strong>: preencha CPF/CNPJ completo</li>
              <li>Em <strong>Minha Conta → Endereços</strong>: cadastre o endereço de origem (onde você despacha)</li>
              <li>Envie os documentos de verificação (RG ou CNH + comprovante de residência)</li>
              <li>Em <strong>Gerenciar → Transportadoras</strong>: ative pelo menos <strong>Correios</strong> (PAC e SEDEX)</li>
            </ol>
            <div className="flex items-start gap-2 text-xs text-amber mt-2">
              <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
              <span>
                Sem a conta verificada, a API devolve "Transportadora não atende este trecho"
                e o despacho falha. Aguarde a aprovação (24 a 48h).
              </span>
            </div>
          </Step>

          <Step n={2} title="Preencha seu endereço no perfil do Kairos">
            <ol className="list-decimal ml-5 space-y-1">
              <li>Acesse <strong>Meu Perfil</strong> no Kairos</li>
              <li>Role até a seção <strong>Endereço</strong> e preencha CEP, rua, número, bairro, cidade e UF</li>
              <li>Clique em <strong>Salvar alterações</strong></li>
            </ol>
            <div className="flex items-start gap-2 text-xs text-amber mt-2">
              <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
              <span>
                Esse CEP é usado como <strong>origem</strong> do envio. Se estiver vazio,
                o despacho falha.
              </span>
            </div>
          </Step>

          <Step n={3} title="Conecte via OAuth">
            <ol className="list-decimal ml-5 space-y-1">
              <li>Vá em <strong>Integrações</strong> no menu lateral</li>
              <li>No card <strong>Melhor Envio</strong>, clique em <strong>Conectar Melhor Envio</strong></li>
              <li>Você será redirecionado para o site oficial do Melhor Envio</li>
              <li>Faça login e clique em <strong>Autorizar</strong></li>
              <li>O Kairos retorna com a mensagem "Melhor Envio conectado!"</li>
            </ol>
            <div className="flex items-center gap-2 text-xs text-green mt-2">
              <CheckCircle2 size={12} /> Token OAuth fica salvo com segurança — você não precisa digitar API key.
            </div>
          </Step>

          <Step n={4} title="Como despachar uma venda física">
            <ol className="list-decimal ml-5 space-y-1">
              <li>Pedidos de produtos físicos aprovados aparecem em <strong>Envios</strong></li>
              <li>Clique em <strong>Despachar</strong> ao lado do pedido</li>
              <li>O Kairos cota automaticamente e escolhe a transportadora mais barata</li>
              <li>A etiqueta é criada no seu carrinho do Melhor Envio</li>
              <li>
                Acesse{' '}
                <a href="https://melhorenvio.com.br/painel/carrinho" target="_blank" rel="noopener noreferrer"
                   className="text-accent hover:underline inline-flex items-center gap-1">
                  melhorenvio.com.br/painel/carrinho <ExternalLink size={11} />
                </a>
                , pague as etiquetas e imprima
              </li>
            </ol>
          </Step>
        </Section>

        {/* ─── FAQ ──────────────────────────────────────── */}
        <Section
          id="faq"
          icon={HelpCircle}
          color="#F59E0B"
          title="Problemas comuns e soluções"
          subtitle="Mensagens de erro frequentes e como resolver"
          open={open === 'faq'}
          onToggle={() => setOpen(open === 'faq' ? null : 'faq')}
        >
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text3 border-b border-border">
                  <th className="p-2 font-semibold">Sintoma</th>
                  <th className="p-2 font-semibold">Causa provável</th>
                  <th className="p-2 font-semibold">Solução</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="p-2 text-text2">"Nenhum serviço de entrega disponível"</td>
                  <td className="p-2 text-text3 text-xs">Conta Melhor Envio sem verificação ou sem transportadoras ativas</td>
                  <td className="p-2 text-text3 text-xs">Conclua cadastro e ative Correios em Gerenciar → Transportadoras</td>
                </tr>
                <tr>
                  <td className="p-2 text-text2">"Endereço do produtor não preenchido"</td>
                  <td className="p-2 text-text3 text-xs">Perfil do Kairos sem CEP</td>
                  <td className="p-2 text-text3 text-xs">Acesse Meu Perfil → Endereço → preencha e salve</td>
                </tr>
                <tr>
                  <td className="p-2 text-text2">Nota fiscal fica em "processando"</td>
                  <td className="p-2 text-text3 text-xs">Prefeitura offline ou conta em sandbox</td>
                  <td className="p-2 text-text3 text-xs">Abra o painel NFe.io — se lá estiver "Issued", a nota foi emitida</td>
                </tr>
                <tr>
                  <td className="p-2 text-text2">Erro ao conectar Melhor Envio</td>
                  <td className="p-2 text-text3 text-xs">Sessão antiga do ME no navegador</td>
                  <td className="p-2 text-text3 text-xs">Faça logout no melhorenvio.com.br, limpe cookies e tente novamente</td>
                </tr>
                <tr>
                  <td className="p-2 text-text2">"The given data was invalid" (cotação)</td>
                  <td className="p-2 text-text3 text-xs">CEP origem ou destino incompleto / inválido</td>
                  <td className="p-2 text-text3 text-xs">Confira que os CEPs têm 8 dígitos sem espaços</td>
                </tr>
                <tr>
                  <td className="p-2 text-text2">"API key inválida" na NFe.io</td>
                  <td className="p-2 text-text3 text-xs">Chave copiada com espaços ou incompleta</td>
                  <td className="p-2 text-text3 text-xs">Cole novamente direto do painel da NFe.io (sem espaços)</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="pt-2 border-t border-border text-xs text-text3">
            Não encontrou sua dúvida? Escreva para{' '}
            <a href="mailto:contato@kairosway.com.br" className="text-accent hover:underline">
              contato@kairosway.com.br
            </a>.
          </div>
        </Section>
      </div>
    </div>
  );
}
