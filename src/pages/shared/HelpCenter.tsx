import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui';
import { ChevronDown, ChevronUp, ExternalLink, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import melhorEnvioLogo from '@/assets/melhorenvio.png';
import nfeLogo         from '@/assets/nfe.png';
import utmifyLogo      from '@/assets/utmify.png';
import blingLogo       from '@/assets/bling.png';

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
  imgSrc  : string;
  title   : string;
  subtitle: string;
  open    : boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function Section({ id, imgSrc, title, subtitle, open, onToggle, children }: SectionProps) {
  // Bling tem favicon com fundo branco — usa bg-bg3 pra não criar borda visual
  const isBling = imgSrc === blingLogo;
  return (
    <div className="card p-0 overflow-hidden" id={`help-${id}`}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 hover:bg-bg3/30 transition-colors text-left"
      >
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden ${isBling ? 'bg-bg3' : 'bg-white'}`}>
          <img src={imgSrc} alt={title} className="w-full h-full object-contain p-1" />
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
  const [open, setOpen] = useState<'nfe' | 'me' | 'utmify' | 'bling' | 'faq' | null>('nfe');

  // Quando a URL tem #help-bling, abre a section correspondente e rola até ela
  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, '');
    if (!hash) return;
    const map: Record<string, typeof open> = {
      'help-nfe'   : 'nfe',
      'help-me'    : 'me',
      'help-utmify': 'utmify',
      'help-bling' : 'bling',
    };
    const target = map[hash];
    if (target) {
      setOpen(target);
      // Aguarda o accordion expandir antes de scrollar
      setTimeout(() => document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
  }, []);

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
          imgSrc={nfeLogo}
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
              <li>Cole a <strong>API Key</strong> no campo correspondente</li>
              <li>Cole o <strong>Company ID</strong> no campo correspondente</li>
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
          imgSrc={melhorEnvioLogo}
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

        {/* ─── Utmify ───────────────────────────────────── */}
        <Section
          id="utmify"
          imgSrc={utmifyLogo}
          title="Conectar Utmify — rastreamento de campanhas e atribuição de vendas"
          subtitle="Captura UTMs automaticamente no checkout e reporta cada venda em tempo real"
          open={open === 'utmify'}
          onToggle={() => setOpen(open === 'utmify' ? null : 'utmify')}
        >
          <Step n={1} title="Crie sua conta na Utmify">
            <p>
              Acesse{' '}
              <a href="https://app.utmify.com.br" target="_blank" rel="noopener noreferrer"
                 className="text-accent hover:underline inline-flex items-center gap-1">
                app.utmify.com.br <ExternalLink size={11} />
              </a>{' '}
              e cadastre-se. Confirme o e-mail e faça login.
            </p>
          </Step>

          <Step n={2} title="Acesse Integrações → Webhooks">
            <ol className="list-decimal ml-5 space-y-1">
              <li>No menu lateral da Utmify, clique em <strong>Integrações</strong></li>
              <li>Clique em <strong>Webhooks</strong></li>
              <li>Selecione a aba <strong>Credenciais API</strong></li>
            </ol>
          </Step>

          <Step n={3} title="Crie uma credencial de API">
            <ol className="list-decimal ml-5 space-y-1">
              <li>Clique em <strong>Adicionar Credencial</strong></li>
              <li>Dê um nome descritivo, por exemplo: <code className="bg-bg3 px-1 rounded text-[11px]">Kairos Way</code></li>
              <li>Clique em <strong>Salvar</strong></li>
            </ol>
          </Step>

          <Step n={4} title="Copie o token gerado">
            <p>
              Após criar a credencial, o <strong>token</strong> aparece na lista.
              Clique no ícone de copiar ao lado do token para copiá-lo para a área de transferência.
            </p>
            <div className="flex items-start gap-2 text-xs text-amber mt-2">
              <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
              <span>Guarde o token em local seguro — ele não é exibido novamente na íntegra.</span>
            </div>
          </Step>

          <Step n={5} title="Cole o token no Kairos Way">
            <ol className="list-decimal ml-5 space-y-1">
              <li>No menu lateral do Kairos, vá em <strong>Integrações</strong></li>
              <li>Encontre o card <strong>Utmify</strong></li>
              <li>Cole o token no campo <strong>API Token Utmify</strong></li>
              <li>Clique em <strong>Salvar token</strong></li>
            </ol>
            <div className="flex items-center gap-2 text-xs text-green mt-2">
              <CheckCircle2 size={12} /> Quando ativo, o badge verde "Ativo" aparece no card.
            </div>
          </Step>

          <Step n={6} title="O que é rastreado automaticamente">
            <ul className="list-disc ml-5 space-y-1">
              <li>Parâmetros UTM capturados no checkout (<code className="bg-bg3 px-1 rounded text-[11px]">utm_source</code>, <code className="bg-bg3 px-1 rounded text-[11px]">utm_campaign</code> etc.)</li>
              <li>Venda criada (pedido gerado)</li>
              <li>Venda aprovada (pagamento confirmado)</li>
              <li>Venda cancelada ou reembolsada</li>
            </ul>
            <p className="text-xs text-text3 mt-1">
              Nenhuma configuração adicional é necessária — tudo acontece automaticamente após salvar o token.
            </p>
          </Step>
        </Section>

        {/* ─── Bling ────────────────────────────────────── */}
        <Section
          id="bling"
          imgSrc={blingLogo}
          title="Conectar Bling — ERP completo (pedidos, financeiro e NF-e)"
          subtitle="Quando conectado, o Bling assume tudo: pedidos de venda, contas a receber, baixa automática e emissão de NF-e (substitui o NFe.io)."
          open={open === 'bling'}
          onToggle={() => setOpen(open === 'bling' ? null : 'bling')}
        >
          <div className="flex items-start gap-2 text-xs text-text2 bg-green/5 border border-green/20 rounded-lg p-3">
            <CheckCircle2 size={14} className="flex-shrink-0 mt-0.5 text-green" />
            <div>
              Conexão simplificada via OAuth — não precisa criar nenhum aplicativo. Você só clica em <strong>Conectar Bling</strong>, autoriza com a sua conta Bling e pronto.
            </div>
          </div>

          <Step n={1} title="Tenha uma conta ativa no Bling">
            <p>
              Acesse{' '}
              <a href="https://bling.com.br" target="_blank" rel="noopener noreferrer"
                 className="text-accent hover:underline inline-flex items-center gap-1">
                bling.com.br <ExternalLink size={11} />
              </a>{' '}
              e contrate um plano que inclua API v3 (qualquer plano pago atende). Trial de 30 dias também funciona pra testar.
            </p>
          </Step>

          <Step n={2} title="Vá em Integrações no Kairos">
            <ol className="list-decimal ml-5 space-y-1">
              <li>No menu lateral, abra <strong>Integrações</strong></li>
              <li>Encontre o card <strong>Bling</strong></li>
              <li>Clique em <strong>Conectar Bling</strong></li>
            </ol>
          </Step>

          <Step n={3} title="Autorize com sua conta Bling">
            <ol className="list-decimal ml-5 space-y-1">
              <li>Você é redirecionado pra tela de autorização do Bling</li>
              <li>Se ainda não estiver logado, faça login com sua conta Bling</li>
              <li>Revise a lista de permissões que o Kairos vai usar (pedidos, contas a receber, NF-e etc.)</li>
              <li>Clique em <strong>Autorizar</strong></li>
            </ol>
            <div className="flex items-center gap-2 text-xs text-green mt-2">
              <CheckCircle2 size={12} /> Você volta pra <strong>/integracoes</strong> com a conexão pronta. Card mostra badge <strong>Ativo</strong>.
            </div>
          </Step>

          <Step n={4} title="O que é sincronizado automaticamente">
            <ul className="list-disc ml-5 space-y-1">
              <li>Cada venda aprovada vira um <strong>pedido de venda</strong> no Bling</li>
              <li>É criada uma <strong>conta a receber</strong> vinculada ao pedido</li>
              <li>Após confirmação do pagamento, a conta recebe <strong>baixa automática</strong></li>
              <li>O Bling assume a emissão de <strong>NF-e</strong> (substitui o NFe.io quando conectado)</li>
              <li>Reembolsos cancelam o pedido e estornam a conta a receber</li>
            </ul>
            <p className="text-xs text-text3 mt-2">
              Nenhuma configuração extra é necessária — quando conectado, o Bling já recebe todas as vendas a partir desse momento.
            </p>
          </Step>

          <Step n={5} title="Desconectar (se precisar)">
            <p>
              No card Bling em <strong>Integrações</strong>, clique em <strong>Remover</strong>. Isso revoga o token e o Kairos para de sincronizar pro Bling. Suas vendas continuam normalmente — só param de espelhar.
            </p>
          </Step>
        </Section>

        {/* ─── FAQ ──────────────────────────────────────── */}
        <div className="card p-0 overflow-hidden">
          <button
            onClick={() => setOpen(open === 'faq' ? null : 'faq')}
            className="w-full flex items-center gap-3 p-4 hover:bg-bg3/30 transition-colors text-left"
          >
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-text text-sm">Problemas comuns e soluções</div>
              <div className="text-xs text-text3 mt-0.5">Mensagens de erro frequentes e como resolver</div>
            </div>
            {open === 'faq'
              ? <ChevronUp size={16} className="text-text3 flex-shrink-0" />
              : <ChevronDown size={16} className="text-text3 flex-shrink-0" />}
          </button>
          {open === 'faq' && (
            <div className="border-t border-border p-4 sm:p-5 space-y-5 bg-bg3/20">
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
                    <tr>
                      <td className="p-2 text-text2">Utmify não registra vendas</td>
                      <td className="p-2 text-text3 text-xs">Token inválido ou removido na Utmify</td>
                      <td className="p-2 text-text3 text-xs">Acesse Integrações no Kairos, substitua o token por um novo gerado na Utmify</td>
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
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
