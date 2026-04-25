import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Image as ImageIcon, Upload } from 'lucide-react';

const CATEGORIES = ['saude', 'educacao', 'entretenimento', 'apps_software', 'moda_beleza', 'casa_construcao', 'outros'];
const CATEGORY_LABEL: Record<string, string> = {
  saude: 'Saúde e bem estar', educacao: 'Educação', entretenimento: 'Entretenimento',
  apps_software: 'Apps e software', moda_beleza: 'Moda e beleza', casa_construcao: 'Casa e construção', outros: 'Outros',
};

interface FormData {
  name             : string;
  description      : string;
  nameOnInvoice    : string;
  category         : string;
  refundDays       : number;
  salesPageUrl     : string;
  supportEmail     : string;
  supportPhone     : string;
}

export default function ProductInfoSection() {
  const { product } = useOutletContext<{ product: any }>();
  const qc = useQueryClient();
  const [imagePreview, setImagePreview] = useState<string | null>(product?.imageUrl || null);
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(product?.imageUrl || null);

  const { register, handleSubmit, reset, formState: { isDirty } } = useForm<FormData>({
    defaultValues: {
      name             : product?.name || '',
      description      : product?.description || '',
      nameOnInvoice    : product?.nameOnInvoice || '',
      category         : product?.category || '',
      refundDays       : product?.refundDays || 7,
      salesPageUrl     : product?.salesPageUrl || '',
      supportEmail     : product?.supportEmail || '',
      supportPhone     : product?.supportPhone || '',
    },
  });

  useEffect(() => {
    if (product) {
      reset({
        name             : product.name || '',
        description      : product.description || '',
        nameOnInvoice    : product.nameOnInvoice || '',
        category         : product.category || '',
        refundDays       : product.refundDays || 7,
        salesPageUrl     : product.salesPageUrl || '',
        supportEmail     : product.supportEmail || '',
        supportPhone     : product.supportPhone || '',
      });
      setImageUrl(product.imageUrl || null);
      setImagePreview(product.imageUrl || null);
    }
  }, [product, reset]);

  const save = useMutation({
    mutationFn: (data: FormData) => api.patch(`/products/${product.id}`, {
      ...data,
      imageUrl    : imageUrl || undefined,
      salesPageUrl: data.salesPageUrl || null,
      supportEmail: data.supportEmail || null,
      supportPhone: data.supportPhone || null,
      nameOnInvoice: data.nameOnInvoice || null,
      description : data.description || null,
      refundDays  : Number(data.refundDays),
    }),
    onSuccess: () => {
      toast.success('Informações salvas!');
      qc.invalidateQueries({ queryKey: ['producer-product', product.id] });
      qc.invalidateQueries({ queryKey: ['my-products'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erro ao salvar'),
  });

  const handleFile = async (file: File) => {
    if (!file.type.match(/^image\/(jpeg|png|jpg)$/i)) {
      toast.error('Apenas JPG ou PNG');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Arquivo muito grande (máx 10MB)');
      return;
    }
    setUploading(true);
    setImagePreview(URL.createObjectURL(file));
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('purpose', 'product');
      const r = await api.post('/uploads', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setImageUrl(r.data.url);
      toast.success('Imagem carregada — clique em Salvar para confirmar');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Erro no upload');
      setImagePreview(product?.imageUrl || null);
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(d => save.mutate(d))} className="space-y-4">
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="w-40 flex-shrink-0">
            <label className="block w-full aspect-square bg-bg3 rounded-xl border-2 border-dashed border-border hover:border-accent overflow-hidden cursor-pointer relative group">
              {imagePreview ? (
                <img src={imagePreview} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center"><ImageIcon size={32} className="text-text3" /></div>
              )}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-xs text-white gap-1">
                <Upload size={14} /> Trocar
              </div>
              <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} disabled={uploading} />
            </label>
            <p className="text-[10px] text-text3 mt-2 leading-tight">A imagem escolhida deve estar no formato JPG ou PNG e ter no máximo 10 MB. Dimensões ideais: 600×600 pixels.</p>
          </div>

          <div className="flex-1 space-y-3 min-w-0">
            <div>
              <label className="label">Nome do produto *</label>
              <input {...register('name', { required: true })} className="input" />
              <p className="text-[10px] text-text3 mt-1">Esse nome será exibido na empresa para os clientes</p>
            </div>

            <div>
              <label className="label">Descrição do produto</label>
              <textarea {...register('description')} rows={3} className="input resize-y" placeholder="Fale sobre o que se trata seu produto, o que ele faz e como ele pode ajudar o cliente." />
            </div>

            <div>
              <label className="label">Nome da fatura</label>
              <input {...register('nameOnInvoice', { maxLength: 10 })} maxLength={10} className="input" />
              <p className="text-[10px] text-text3 mt-1">Informe o nome que aparecerá na fatura do cliente. (Máximo 10 caracteres). Não utilize caracteres especiais.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Categoria do produto *</label>
                <select {...register('category', { required: true })} className="input">
                  <option value="">Selecione...</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
                  {/* Mantém compatível com categorias legadas */}
                  {product?.category && !CATEGORIES.includes(product.category) && (
                    <option value={product.category}>{product.category}</option>
                  )}
                </select>
              </div>
              <div>
                <label className="label">Prazo de reembolso (garantia) *</label>
                <select {...register('refundDays', { valueAsNumber: true })} className="input">
                  <option value={7}>7 dias (prazo mínimo)</option>
                  <option value={15}>15 dias</option>
                  <option value={30}>30 dias</option>
                  <option value={60}>60 dias</option>
                  <option value={90}>90 dias</option>
                </select>
              </div>
            </div>

            <div>
              <label className="label">Página de vendas ou rede social</label>
              <input {...register('salesPageUrl')} type="url" placeholder="https://..." className="input" />
              <p className="text-[10px] text-text3 mt-1">Informe o endereço completo da página de vendas desse produto.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">E-mail de suporte</label>
                <input {...register('supportEmail')} type="email" className="input" />
                <p className="text-[10px] text-text3 mt-1">Este e-mail será exibido na página de checkout.</p>
              </div>
              <div>
                <label className="label">WhatsApp de suporte</label>
                <input {...register('supportPhone')} type="tel" placeholder="(11) 99999-9999" className="input" />
                <p className="text-[10px] text-text3 mt-1">Este número será exibido na sessão de pedido confirmado.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <button type="submit" disabled={save.isPending || (!isDirty && imageUrl === product?.imageUrl)} className="btn-primary w-full justify-center py-3">
        {save.isPending ? 'Salvando...' : 'Salvar alterações'}
      </button>
    </form>
  );
}
