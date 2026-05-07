import { ExternalLink, CheckCircle2, AlertTriangle, Info, Zap, Database, RotateCw, FileText } from 'lucide-react';
import blingLogo from '@/assets/bling.png';

const kairosLogo = '/kairosLogo.png';

/**
 * Página pública (sem login) com o guia da integração Kairos Way ↔ Bling.
 * Servida em /integracao-bling — usada como "manual" no cadastro do app público no Bling.
 */
export default function IntegracaoBling() {
  return (
    <div className="min-h-screen bg-bg text-text">
      {/* Header */}
      <header className="border-b border-border bg-bg2">
        <div className="max-w-4xl mx-auto px-4 py-6 flex items-center gap-4">
          <img src={kairosLogo} alt="Kairos Way" className="w-10 h-10 rounded-lg" />
          <div>
            <div className="text-sm text-text3">Manual da integração</div>
            <h1 className="text-xl font-bold">Kairos Way × Bling</h1>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <img src={blingLogo} alt="Bling" className="w-8 h-8 rounded bg-bg3 p-1" />
            <a
              href="https://kairosway.com.br"
              className="text-xs text-accent hover:underline inline-flex items-center gap-1"
            >
              kairosway.com.br <ExternalLink size={11} />
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10 space-y-10">
        {/* Hero */}
        <section className="text-center space-y-3">
          <h2 className="text-3xl font-bold">Sincronize suas vendas com o Bling automaticamente</h2>
          <p className="text-text2 max-w-2xl mx-auto">
            A integração Kairos Way ↔ Bling reflete cada venda aprovada no seu ERP em tempo real:
            cria pedido de venda, conta a receber, dá baixa após pagamento e cancela em caso de
            reembolso. Tudo com OAuth 2.0 — sem cola de tokens manuais.
          </p>
        </section>

        {/* Sobre o Kairos Way */}
        <section className="card space-y-3">
          <h3 className="text-lg font-bold">Sobre o Kairos Way</h3>
          <p className="text-text2 text-sm leading-relaxed">
            Kairos Way é uma <strong>plataforma de pagamentos online (gateway)</strong> brasileira
            para infoprodutores e e-commerce. Ela centraliza o checkout, o split automático entre
            produtor/afiliados/co-produtores, a área de membros pra produtos digitais, a logística
            e a emissão de NF-e dos produtores que vendem pela plataforma.
          </p>
          <ul className="list-disc ml-5 space-y-1 text-sm text-text2">
            <li>Gateway com Pix, cartão e boleto</li>
            <li>Marketplace de produtos digitais e físicos</li>
            <li>Sistema de afiliados com comissionamento configurável</li>
            <li>Área de membros automática</li>
            <li>Logística e cálculo de frete</li>
          </ul>
        </section>

        {/* O que a integração faz */}
        <section className="space-y-3">
          <h3 className="text-lg font-bold">O que a integração faz</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="card space-y-2">
              <div className="flex items-center gap-2">
                <Database size={16} className="text-accent" />
                <strong className="text-sm">Cria pedido de venda no Bling</strong>
              </div>
              <p className="text-xs text-text2">
                Quando uma venda é aprovada no Kairos, gera um pedido no seu Bling com o produto,
                valor e dados do comprador.
              </p>
            </div>
            <div className="card space-y-2">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-accent" />
                <strong className="text-sm">Cria conta a receber + dá baixa automática</strong>
              </div>
              <p className="text-xs text-text2">
                Vinculada ao pedido. Recebe baixa logo em seguida (o pagamento já foi confirmado
                pelo Kairos via Pagar.me).
              </p>
            </div>
            <div className="card space-y-2">
              <div className="flex items-center gap-2">
                <Zap size={16} className="text-amber" />
                <strong className="text-sm">Reembolso/chargeback</strong>
              </div>
              <p className="text-xs text-text2">
                Cancela o pedido (situação 12) e estorna a conta a receber automaticamente.
              </p>
            </div>
            <div className="card space-y-2">
              <div className="flex items-center gap-2">
                <RotateCw size={16} className="text-accent" />
                <strong className="text-sm">Idempotente + retry resiliente</strong>
              </div>
              <p className="text-xs text-text2">
                Cada Order guarda os IDs do Bling (pedido, contato, conta a receber). Re-execução
                não duplica. 4 retentativas exponenciais em caso de instabilidade.
              </p>
            </div>
          </div>
        </section>

        {/* Como conectar */}
        <section className="space-y-3">
          <h3 className="text-lg font-bold">Como conectar (3 passos)</h3>
          <ol className="space-y-3">
            <li className="card flex gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-accent/15 text-accent font-bold text-sm flex items-center justify-center">1</span>
              <div className="text-sm text-text2 space-y-1">
                <strong className="text-text">Tenha uma conta ativa no Bling</strong>
                <p>
                  Qualquer plano pago atende — o trial de 30 dias também serve pra testar a integração.{' '}
                  <a href="https://bling.com.br" target="_blank" rel="noopener noreferrer"
                     className="text-accent hover:underline inline-flex items-center gap-1">
                    bling.com.br <ExternalLink size={11} />
                  </a>
                </p>
              </div>
            </li>
            <li className="card flex gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-accent/15 text-accent font-bold text-sm flex items-center justify-center">2</span>
              <div className="text-sm text-text2 space-y-1">
                <strong className="text-text">No painel Kairos, vá em "Integrações"</strong>
                <p>Encontre o card <strong>Bling</strong> e clique em <strong>"Conectar Bling"</strong>.</p>
              </div>
            </li>
            <li className="card flex gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-accent/15 text-accent font-bold text-sm flex items-center justify-center">3</span>
              <div className="text-sm text-text2 space-y-1">
                <strong className="text-text">Autorize com sua conta Bling (OAuth)</strong>
                <p>
                  Você é redirecionado pra tela do Bling com a lista de permissões que o Kairos
                  vai usar. Clique <strong>Autorizar</strong>. Pronto — voltou pro Kairos com
                  badge "Ativo".
                </p>
                <div className="flex items-center gap-2 text-xs text-green pt-1">
                  <CheckCircle2 size={12} /> Tempo total: ~2 minutos
                </div>
              </div>
            </li>
          </ol>
        </section>

        {/* Permissões */}
        <section className="card space-y-3">
          <h3 className="text-lg font-bold">Permissões que o Kairos usa</h3>
          <p className="text-sm text-text2">
            Durante o fluxo OAuth, o Bling mostra a lista exata de permissões. O Kairos pede:
          </p>
          <ul className="list-disc ml-5 space-y-1 text-sm text-text2">
            <li><strong>Clientes e Fornecedores</strong> — cadastrar comprador como contato</li>
            <li><strong>Pedidos de Venda</strong> — criar e cancelar pedidos</li>
            <li><strong>Contas a Receber</strong> — criar, dar baixa e estornar</li>
            <li><strong>Notas Fiscais</strong> — emitir NF-e quando o produtor escolher</li>
            <li><strong>Produtos</strong> — referenciar SKU dos produtos vendidos</li>
            <li><strong>Dados básicos da empresa</strong> — confirmar conexão</li>
          </ul>
          <div className="flex items-start gap-2 text-xs text-text2 bg-amber/5 border border-amber/30 rounded-lg p-3 mt-2">
            <AlertTriangle size={14} className="flex-shrink-0 mt-0.5 text-amber" />
            <div>
              Os tokens de acesso ficam guardados <strong>cifrados com AES-256-GCM</strong> no banco
              do Kairos. Não armazenamos sua senha Bling — só usamos os tokens OAuth.
            </div>
          </div>
        </section>

        {/* Onde ver os dados */}
        <section className="space-y-3">
          <h3 className="text-lg font-bold">Onde os dados aparecem no seu Bling</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="card">
              <strong className="text-text">📦 Vendas → Pedidos de venda</strong>
              <p className="text-xs text-text2 mt-1">Cada venda aprovada com o nome do produto, valor e referência ao código Kairos.</p>
            </div>
            <div className="card">
              <strong className="text-text">💰 Financeiro → Contas a receber</strong>
              <p className="text-xs text-text2 mt-1">Conta vinculada ao pedido, já com baixa marcada.</p>
            </div>
            <div className="card">
              <strong className="text-text">👥 Cadastros → Clientes</strong>
              <p className="text-xs text-text2 mt-1">Contato do comprador (nome, CPF/CNPJ, email, telefone) — sem duplicar.</p>
            </div>
            <div className="card">
              <strong className="text-text">🔄 Eventos do app</strong>
              <p className="text-xs text-text2 mt-1">Bling registra cada chamada do Kairos pra auditoria.</p>
            </div>
          </div>
        </section>

        {/* Requisitos */}
        <section className="card space-y-3">
          <h3 className="text-lg font-bold">Requisitos pra integrar</h3>
          <ul className="list-disc ml-5 space-y-1 text-sm text-text2">
            <li>Conta ativa no Bling com plano que inclua <strong>API v3</strong></li>
            <li>Conta de produtor/admin no Kairos Way (acesso à página de Integrações)</li>
            <li>Comprador com CPF ou CNPJ válido (Bling exige documento pra criar contato)</li>
            <li>Acesso à página <strong>Integrações</strong> no painel Kairos</li>
          </ul>
        </section>

        {/* FAQ rápido */}
        <section className="space-y-3">
          <h3 className="text-lg font-bold">Perguntas frequentes</h3>

          <details className="card">
            <summary className="cursor-pointer font-semibold text-sm">A integração emite NF-e? Substitui meu emissor atual?</summary>
            <p className="text-sm text-text2 mt-2">
              O Bling emite NF-e nativamente, mas <strong>nada é substituído sem sua escolha</strong>.
              O Kairos também integra com NFe.io. Cada produtor decide qual emissor usar — pode ser
              só Bling, só NFe.io, ou os dois conectados (sem duplicação: NFe.io continua emitindo NF-e
              e o Bling cuida só de pedido + financeiro).
            </p>
          </details>

          <details className="card">
            <summary className="cursor-pointer font-semibold text-sm">E se eu desconectar o Bling?</summary>
            <p className="text-sm text-text2 mt-2">
              No card Bling em "Integrações", clique <strong>Remover</strong>. O token é revogado
              e o Kairos para de sincronizar pra esse Bling. <strong>Vendas anteriores que já
              foram sincronizadas permanecem no seu Bling</strong> — só as próximas deixam de
              espelhar. Pra reativar, é só conectar de novo.
            </p>
          </details>

          <details className="card">
            <summary className="cursor-pointer font-semibold text-sm">A venda foi aprovada mas não apareceu no Bling. O que fazer?</summary>
            <p className="text-sm text-text2 mt-2">
              Verifique: card Bling em Integrações está "Ativo"? Aguardou pelo menos 30s após o
              APPROVED (sync é assíncrono)? Bling fora do ar gera retry automático em até 7min.
              CPF/CNPJ do comprador é obrigatório — Bling rejeita contato sem documento. Se nada
              resolver, fale com o suporte Kairos.
            </p>
          </details>

          <details className="card">
            <summary className="cursor-pointer font-semibold text-sm">Quem mantém a integração?</summary>
            <p className="text-sm text-text2 mt-2">
              A integração é desenvolvida e mantida pela equipe do Kairos Way. Atualizações são
              automáticas — produtor não precisa instalar nada.
            </p>
          </details>
        </section>

        {/* Suporte */}
        <section className="card text-center space-y-2">
          <h3 className="text-lg font-bold">Precisa de ajuda?</h3>
          <p className="text-sm text-text2">
            📧 <a href="mailto:contato@kairosway.com.br" className="text-accent hover:underline">contato@kairosway.com.br</a><br />
            🌐 <a href="https://kairosway.com.br" className="text-accent hover:underline">kairosway.com.br</a>
          </p>
        </section>

        <footer className="text-center text-xs text-text3 pt-6 border-t border-border">
          © {new Date().getFullYear()} Kairos Way · Integração Bling V3 (OAuth 2.0)
        </footer>
      </main>
    </div>
  );
}
