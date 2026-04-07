import { useState } from 'react';
import { PageHeader } from '@/components/ui';

interface Integration {
  id         : string;
  name       : string;
  description: string;
  status     : 'active' | 'soon' | 'contact';
  logo       : string;
  actionLabel?: string;
  actionUrl  ?: string;
}

const integrations: Integration[] = [
  {
    id         : 'nfeio',
    name       : 'NFe.io',
    description: 'Emita notas fiscais automaticamente a cada venda aprovada na plataforma.',
    status     : 'active',
    logo       : '/assets/nfe.png',
  },
  {
    id         : 'pagarme',
    name       : 'Pagar.me',
    description: 'Plataforma de pagamentos digitais. Facilite o recebimento de pagamentos via cartão de crédito, Pix e boleto ',
    status     : 'active',
    logo       : '/assets/pagarme.png',
  },
  {
    id         : 'notazz',
    name       : 'Notazz',
    description: 'Emissão de notas fiscais automaticamente a cada venda aprovada na plataforma.',
    status     : 'soon',
    logo       : '/assets/notazz.png',
  },
  {
    id         : 'woocommerce',
    name       : 'WooCommerce',
    description: 'Plugin de e-commerce para transformar sites comuns em lojas virtuais completas.',
    status     : 'soon',
    logo       : '/assets/woo.png',
  },
  {
    id         : 'meta',
    name       : 'API Oficial Meta (WhatsApp)',
    description: 'Envie mensagens automáticas via WhatsApp Business usando a API oficial da Meta.',
    status     : 'contact',
    logo       : '/assets/vai.png',
    actionLabel: 'Entre em contato com o time VAI',
    actionUrl  : 'https://wa.me/5551993766049',
  },
];

export default function IntegrationsPage() {
  const active  = integrations.filter(i => i.status === 'active');
  const soon    = integrations.filter(i => i.status === 'soon');
  const contact = integrations.filter(i => i.status === 'contact');

  return (
    <div>
      <PageHeader
        title="Integrações"
        sub="Conecte Kairos Way às ferramentas que você já usa"
      />

      {/* Disponível */}
      {active.length > 0 && (
        <div className="mb-6">
          <div className="section-title mb-3">Disponível</div>
          <div className="grid grid-cols-3 gap-4">
            {active.map(i => <IntegrationCard key={i.id} integration={i} />)}
          </div>
        </div>
      )}

      {/* Em breve */}
      {soon.length > 0 && (
        <div className="mb-6">
          <div className="section-title mb-3">Em breve</div>
          <div className="grid grid-cols-3 gap-4">
            {soon.map(i => <IntegrationCard key={i.id} integration={i} />)}
          </div>
        </div>
      )}

      {/* Entre em contato */}
      {contact.length > 0 && (
        <div>
          <div className="section-title mb-3">Disponível sob consulta</div>
          <div className="grid grid-cols-3 gap-4">
            {contact.map(i => <IntegrationCard key={i.id} integration={i} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function IntegrationCard({ integration: i }: { integration: Integration }) {
  const badge = {
    active : <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-green/10 text-green border border-green/20 uppercase tracking-wide">ativo</span>,
    soon   : <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber/15 text-amber border border-amber/30 uppercase tracking-wide">em breve</span>,
    contact: <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20 uppercase tracking-wide">consulta</span>,
  }[i.status];

  return (
    <div className={`card flex items-start gap-4 ${i.status !== 'active' ? 'opacity-80' : ''}`}>
      <div className="w-14 h-14 rounded-xl overflow-hidden border border-border flex-shrink-0 bg-bg3 flex items-center justify-center">
        <img
          src={i.logo}
          alt={i.name}
          className="w-full h-full object-cover"
          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold text-text text-sm">{i.name}</span>
          {badge}
        </div>
        <p className="text-xs text-text3 leading-relaxed mb-3">{i.description}</p>
        {i.status === 'contact' && i.actionUrl && (
          <a
            href={i.actionUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary btn-sm inline-flex"
          >
            {i.actionLabel}
          </a>
        )}
        {i.status === 'active' && (
          <span className="text-xs text-green flex items-center gap-1">
            ✓ Configurado e ativo
          </span>
        )}
      </div>
    </div>
  );
}