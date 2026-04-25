import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Upload, FileText, Monitor, ExternalLink } from 'lucide-react';

export function ProductFilesSection() {
  const { product } = useOutletContext<{ product: any }>();
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const save = useMutation({
    mutationFn: (digitalUrl: string | null) => api.patch(`/products/${product.id}`, { digitalUrl }),
    onSuccess : () => {
      toast.success('Arquivo salvo!');
      qc.invalidateQueries({ queryKey: ['producer-product', product.id] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erro'),
  });

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('purpose', 'product-digital');
      const r = await api.post('/uploads', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      save.mutate(r.data.url);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Erro no upload');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <h2 className="text-base font-semibold text-text">Arquivo digital de entrega</h2>
      <div className="card p-4">
        {product.digitalUrl ? (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center text-accent flex-shrink-0">
                <FileText size={18} />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-text">Arquivo enviado</div>
                <a href={product.digitalUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline truncate flex items-center gap-1">
                  <span className="truncate">{product.digitalUrl}</span> <ExternalLink size={10} />
                </a>
              </div>
            </div>
            <div className="flex gap-2">
              <label className="btn-secondary btn-sm cursor-pointer">
                <Upload size={12} /> Trocar
                <input type="file" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} disabled={uploading} />
              </label>
              <button onClick={() => confirm('Remover arquivo?') && save.mutate(null)} className="btn-danger btn-sm">Remover</button>
            </div>
          </div>
        ) : (
          <label className="block w-full border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-accent transition-colors">
            <Upload size={28} className="text-text3 mx-auto mb-2" />
            <div className="text-sm text-text mb-1">{uploading ? 'Enviando...' : 'Clique para enviar arquivo'}</div>
            <div className="text-xs text-text3">PDF, ZIP, MP4, etc — máx 100MB</div>
            <input type="file" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} disabled={uploading} />
          </label>
        )}
      </div>
      <p className="text-xs text-text3">Esse arquivo será enviado automaticamente ao cliente após a aprovação do pagamento.</p>
    </div>
  );
}

export function ProductMembersAreaSection() {
  const { product } = useOutletContext<{ product: any }>();
  const qc = useQueryClient();
  const { register, handleSubmit, reset } = useForm<{ membersAreaUrl: string }>({
    defaultValues: { membersAreaUrl: product?.membersAreaUrl || '' },
  });

  useEffect(() => { reset({ membersAreaUrl: product?.membersAreaUrl || '' }); }, [product?.membersAreaUrl, reset]);

  const save = useMutation({
    mutationFn: (d: { membersAreaUrl: string }) => api.patch(`/products/${product.id}`, { membersAreaUrl: d.membersAreaUrl || null }),
    onSuccess : () => {
      toast.success('Salvo!');
      qc.invalidateQueries({ queryKey: ['producer-product', product.id] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erro'),
  });

  return (
    <form onSubmit={handleSubmit(d => save.mutate(d))} className="space-y-3">
      <h2 className="text-base font-semibold text-text">Área de membros</h2>
      <div className="card p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center text-accent flex-shrink-0">
            <Monitor size={18} />
          </div>
          <div className="flex-1">
            <label className="label">URL da área de membros</label>
            <input {...register('membersAreaUrl')} type="url" className="input" placeholder="https://meu-curso.com.br/login" />
            <p className="text-[10px] text-text3 mt-1">O link será enviado por email após a confirmação do pagamento.</p>
          </div>
        </div>
      </div>
      <button type="submit" disabled={save.isPending} className="btn-primary w-full justify-center py-3">
        {save.isPending ? 'Salvando...' : 'Salvar'}
      </button>
    </form>
  );
}
