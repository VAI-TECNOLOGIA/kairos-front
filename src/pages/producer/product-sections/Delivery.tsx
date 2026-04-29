import { useOutletContext } from 'react-router-dom';
import { Info, ExternalLink, ShoppingBag } from 'lucide-react';

export { ProductMembersAreaSection } from './MembersArea';

export function ProductFilesSection() {
  const { product } = useOutletContext<{ product: any }>();
  const purchasesUrl = `${window.location.origin}/cliente/compras`;

  return (
    <div className="space-y-3">
      <h2 className="text-base font-semibold text-text">Entrega do conteúdo</h2>

      <div className="card p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center text-accent flex-shrink-0">
            <ShoppingBag size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-text">Acesso via "Minhas Compras"</div>
            <p className="text-xs text-text3 mt-1 leading-relaxed">
              Após o pagamento, o cliente recebe um link automático que cai em <strong className="text-text">Minhas Compras</strong>.
              De lá ele acessa o curso/área de membros do produto. Você não precisa configurar URL.
            </p>
          </div>
        </div>

        <div className="bg-bg3 rounded-md px-3 py-2 flex items-center justify-between gap-2 text-xs">
          <code className="text-text2 truncate">{purchasesUrl}</code>
          <a href={purchasesUrl} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline inline-flex items-center gap-1 flex-shrink-0">
            ver <ExternalLink size={10} />
          </a>
        </div>

        {(product?.type === 'DIGITAL' || product?.type === 'COURSE') && (
          <div className="bg-accent/5 border border-accent/20 rounded-md p-3 text-xs flex items-start gap-2">
            <Info size={14} className="text-accent flex-shrink-0 mt-0.5" />
            <div className="text-text2">
              Configure o conteúdo do curso na aba <strong className="text-text">Área de membros</strong>: módulos,
              aulas, vídeos. O cliente vê tudo isso após o login.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
