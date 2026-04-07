# Kairos Way — Frontend

Interface web completa desenvolvida com React + Vite + TypeScript + TailwindCSS.

## Stack

- **Framework:** React 18 + TypeScript
- **Build:** Vite 5
- **Estilização:** TailwindCSS 3 com design system customizado
- **Estado servidor:** TanStack React Query
- **Estado global:** Zustand
- **HTTP:** Axios com interceptors de refresh token
- **Forms:** React Hook Form + Zod
- **Gráficos:** Recharts
- **Rotas:** React Router DOM v6
- **PWA:** vite-plugin-pwa + Workbox

## Início rápido

```bash
# 1. Instalar dependências
npm install

# 2. Configurar API URL
# Criar arquivo .env.local:
echo "VITE_API_URL=http://localhost:3000" > .env.local

# 3. Iniciar em desenvolvimento
npm run dev

# 4. Build de produção
npm run build
```

## Estrutura de páginas

### Público (`/`)
- `/login` — Login com seletor Admin/Produtor e MFA flow
- `/mfa` — Verificação MFA (Admin obrigatório — PCI REQ-8)
- `/cadastro` — Registro de novo produtor
- `/checkout/:slug` — Checkout público white label com Pix/Cartão/Boleto

### Admin (`/admin/*`)
- `dashboard` — KPIs, gráficos de faturamento, adquirentes, vendas recentes
- `produtores` — Lista + aprovação KYC + rejeição com motivo
- `produtos` — Aprovação/rejeição de produtos
- `ofertas` — Visualização de ofertas e splits por produto
- `vendas` — Tabela completa de transações com filtros
- `afiliados` — Lista, criação e importação CSV
- `coprodutores` — Solicitações e aprovações
- `assinaturas` — Gestão de recorrências e MRR
- `logistica` — Envios e rastreamento
- `financeiro` — Faturas WL e saques
- `webhooks` — Endpoints e histórico de entregas
- `relatorios` — Analytics consolidado
- `audit-log` — Audit log completo (PCI REQ-10)
- `seguranca` — Checklist PCI DSS
- `configuracoes` — Configurações da plataforma

### Produtor (`/produtor/*`)
- `dashboard` — Painel com faturamento, saldo e últimas vendas
- `produtos` — CRUD de produtos
- `ofertas` — Split Builder visual por oferta
- `vendas` — Minhas vendas
- `afiliados` — Meus afiliados com links
- `coprodutores` — Aprovação de solicitações
- `checkout` — Checkout Builder white label
- `financeiro` — Saldo, splits e saques
- `configuracoes` — Dados pessoais e senha

## Segurança implementada (PCI REQ-8)

- **Session timeout:** 15 minutos de inatividade → logout automático
- **Timer visual:** Barra e contador regressivo no topo do painel
- **MFA flow:** Login admin → tela MFA → 6 dígitos TOTP → acesso
- **Token refresh:** Renovação automática transparente via interceptor Axios
- **Rota protegida:** `ProtectedRoute` verifica autenticação e role

## Design System (globals.css)

Classes utilitárias disponíveis para qualquer componente:
- `.card`, `.card-sm` — Cards com borda e fundo
- `.btn`, `.btn-primary`, `.btn-sec`, `.btn-danger`, `.btn-ghost`, `.btn-sm`, `.btn-lg`
- `.input`, `.input-sm`, `.label`, `.form-group`
- `.badge`, `.badge-blue`, `.badge-green`, `.badge-amber`, `.badge-red`, `.badge-gray`
- `.table-wrapper`, `.table` — Tabelas estilizadas
- `.stat-card`, `.stat-label`, `.stat-value` — Cards de métricas
- `.sidebar-item`, `.sidebar-group` — Itens do menu lateral
- `.modal`, `.modal-overlay`, `.modal-header`, `.modal-body`, `.modal-footer`
- `.tab-nav`, `.tab-btn` — Navegação por abas
- `.split-bar` — Barra visual de splits

## PWA

O app suporta instalação como PWA:
- **Android:** Menu Chrome → "Adicionar à tela inicial"
- **iOS:** Safari → Compartilhar → "Adicionar à Tela de Início"
- **Desktop:** Ícone de instalação na barra de endereço do Chrome

## Variáveis de ambiente

```env
VITE_API_URL=https://api.kairosway.com.br
```

## Desenvolvido por

**VAI Inteligência Comercial** — [app.vaicrm.com.br](https://app.vaicrm.com.br)
