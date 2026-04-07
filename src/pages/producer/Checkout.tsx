import { PageHeader } from '@/components/ui';
import { Monitor, Clock } from 'lucide-react';

export default function CheckoutConfig() {
  return (
    <div>
      <PageHeader title="Checkout Builder" sub="Configure a aparência do seu checkout" />

      <div className="max-w-lg">
        <div className="card flex flex-col items-center text-center py-14 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center">
            <Monitor size={28} className="text-accent" strokeWidth={1.5} />
          </div>
          <div>
            <div className="flex items-center justify-center gap-2 mb-2">
              <h2 className="text-lg font-bold text-text">Checkout Builder</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber/15 text-amber border border-amber/30 uppercase tracking-wide flex items-center gap-1">
                <Clock size={9} /> Em breve
              </span>
            </div>
            <p className="text-sm text-text2 leading-relaxed max-w-sm">
              A personalização do checkout estará disponível em breve. Você poderá configurar cores, logo, textos e o layout da sua página de pagamento.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}