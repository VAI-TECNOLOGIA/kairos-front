import { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

interface ImageUploadProps {
  value    : string;           // URL atual da imagem
  onChange : (url: string) => void;
  folder?  : string;           // 'products' | 'offers' | 'avatars'
  label?   : string;
  hint?    : string;
  className?: string;
}

export function ImageUpload({
  value,
  onChange,
  folder   = 'products',
  label    = 'Imagem de capa',
  hint     = 'JPG, PNG ou WebP — máx. 10MB',
  className = '',
}: ImageUploadProps) {
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file) return;

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
      toast.error('Tipo de arquivo inválido. Use JPG, PNG ou WebP.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 10MB.');
      return;
    }

    setLoading(true);
    try {
      const form = new FormData();
      form.append('file', file);

      const { data } = await api.post(`/upload/image?folder=${folder}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      onChange(data.url);
      toast.success('Imagem enviada!');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Erro ao enviar imagem');
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div className={className}>
      {label && <label className="label mb-2 block">{label}</label>}

      {value ? (
        // Preview da imagem
        <div className="relative rounded-xl overflow-hidden border border-border group" style={{ aspectRatio: '16/9', maxHeight: 200 }}>
          <img src={value} alt="Preview" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="btn-sec btn-sm"
              disabled={loading}
            >
              <Upload size={13} /> Trocar
            </button>
            <button
              type="button"
              onClick={() => onChange('')}
              className="btn-danger btn-sm"
            >
              <X size={13} /> Remover
            </button>
          </div>
        </div>
      ) : (
        // Área de drop
        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-border hover:border-accent/50 rounded-xl cursor-pointer transition-colors flex flex-col items-center justify-center gap-3 p-8"
          style={{ minHeight: 140 }}
        >
          {loading ? (
            <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          ) : (
            <>
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                <ImageIcon size={22} className="text-accent" strokeWidth={1.5} />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-text">
                  Clique ou arraste a imagem aqui
                </p>
                <p className="text-xs text-text3 mt-0.5">{hint}</p>
              </div>
            </>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
    </div>
  );
}