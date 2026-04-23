 export type WidgetId =
  // ── Admin ──────────────────────────────────────────
  | 'stat_revenue_total'
  | 'stat_producers'
  | 'stat_orders'
  | 'stat_subscriptions'
  | 'alert_kyc'
  | 'chart_revenue_14d'
  | 'list_recent_sales'
  | 'chart_payment_mix'
  | 'chart_hourly_orders'
  // ── Produtor ───────────────────────────────────────
  | 'stat_active_products'
  | 'stat_total_sales'
  | 'stat_balance_available'
  | 'stat_balance_pending'
  | 'chart_revenue_7d'
  | 'prod_recent_sales'
  | 'stat_refunds_prod'
  | 'stat_total_revenue_prod'
  // ── Afiliado ───────────────────────────────────────
  | 'stat_volume'
  | 'stat_commission'
  | 'stat_ticket'
  | 'stat_aff_total_sales'
  | 'chart_revenue_14d_aff'
  | 'list_top_offers'
  | 'banner_coprodutor'
  | 'stat_refunds_aff';

export interface WidgetDef {
  id     : WidgetId;
  label  : string;
  desc   : string;
}

export const WIDGETS_BY_ROLE: Record<string, WidgetDef[]> = {
  ADMIN: [
    { id: 'stat_revenue_total',  label: 'Receita total',        desc: 'Receita acumulada da plataforma e ticket médio' },
    { id: 'stat_producers',      label: 'Produtores ativos',    desc: 'Total de produtores e pendências de KYC' },
    { id: 'stat_orders',         label: 'Vendas aprovadas',     desc: 'Contagem total de pedidos aprovados' },
    { id: 'stat_subscriptions',  label: 'Assinaturas ativas',   desc: 'Número de assinaturas recorrentes em vigor' },
    { id: 'alert_kyc',           label: 'Alerta KYC',           desc: 'Aviso quando há produtores aguardando aprovação' },
    { id: 'chart_revenue_14d',   label: 'Gráfico de receita',   desc: 'Receita dos últimos 14 dias com comparativo semanal' },
    { id: 'list_recent_sales',   label: 'Últimas vendas',       desc: 'Lista das vendas mais recentes da plataforma' },
    { id: 'chart_payment_mix',   label: 'Mix de pagamentos',    desc: 'Distribuição entre Pix, Cartão e Boleto' },
    { id: 'chart_hourly_orders', label: 'Pedidos por hora',     desc: 'Concentração de vendas ao longo do dia' },
  ],
  STAFF: [
    { id: 'stat_revenue_total',  label: 'Receita total',        desc: 'Receita acumulada da plataforma e ticket médio' },
    { id: 'stat_producers',      label: 'Produtores ativos',    desc: 'Total de produtores e pendências de KYC' },
    { id: 'stat_orders',         label: 'Vendas aprovadas',     desc: 'Contagem total de pedidos aprovados' },
    { id: 'stat_subscriptions',  label: 'Assinaturas ativas',   desc: 'Número de assinaturas recorrentes em vigor' },
    { id: 'alert_kyc',           label: 'Alerta KYC',           desc: 'Aviso quando há produtores aguardando aprovação' },
    { id: 'chart_revenue_14d',   label: 'Gráfico de receita',   desc: 'Receita dos últimos 14 dias com comparativo semanal' },
    { id: 'list_recent_sales',   label: 'Últimas vendas',       desc: 'Lista das vendas mais recentes da plataforma' },
    { id: 'chart_payment_mix',   label: 'Mix de pagamentos',    desc: 'Distribuição entre Pix, Cartão e Boleto' },
    { id: 'chart_hourly_orders', label: 'Pedidos por hora',     desc: 'Concentração de vendas ao longo do dia' },
  ],
  PRODUCER: [
    { id: 'stat_active_products',  label: 'Produtos ativos',    desc: 'Quantidade de produtos com status ativo' },
    { id: 'stat_total_sales',      label: 'Total de vendas',    desc: 'Número total de pedidos realizados' },
    { id: 'stat_balance_available',label: 'Saldo disponível',   desc: 'Valor disponível para saque agora' },
    { id: 'stat_balance_pending',  label: 'Saldo pendente',     desc: 'Valor aguardando confirmação de repasse' },
    { id: 'chart_revenue_7d',      label: 'Gráfico de receita', desc: 'Receita dos últimos 7 dias' },
    { id: 'prod_recent_sales',     label: 'Últimas vendas',     desc: 'Lista das suas vendas mais recentes' },
    { id: 'stat_refunds_prod',       label: 'Reembolsos & Chargebacks', desc: 'Resumo de reembolsos e chargebacks no dashboard' },
    { id: 'stat_total_revenue_prod', label: 'Faturamento total',        desc: 'Card hero com faturamento total acumulado e do mês' },
  ],
  AFFILIATE: [
    { id: 'stat_volume',           label: 'Faturamento gerado', desc: 'Total de faturamento gerado pelas suas afiliações' },
    { id: 'stat_commission',       label: 'Comissão disponível',desc: 'Comissão disponível para saque' },
    { id: 'stat_ticket',           label: 'Ticket médio',       desc: 'Valor médio por conversão' },
    { id: 'stat_aff_total_sales',  label: 'Vendas realizadas',  desc: 'Total de conversões via seus links' },
    { id: 'chart_revenue_14d_aff', label: 'Gráfico de faturamento', desc: 'Evolução do faturamento nos últimos 14 dias' },
    { id: 'list_top_offers',       label: 'Top ofertas',        desc: 'Ofertas com maior receita gerada por você' },
    { id: 'banner_coprodutor',     label: 'Banner produtor', desc: 'Chamada para solicitar acesso como produtor' },
    { id: 'stat_refunds_aff',      label: 'Reembolsos & Chargebacks', desc: 'Resumo de reembolsos e chargebacks no dashboard' },
  ],
};
