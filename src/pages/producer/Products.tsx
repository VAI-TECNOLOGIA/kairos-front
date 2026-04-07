import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { PageHeader, Modal, Loading, EmptyState } from '@/components/ui';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { formatBRL, formatDate, productStatusVariant, PRODUCT_TYPE_LABEL } from '@/lib/utils';
import type { Product } from '@/types';
import { Package, Plus, ExternalLink, Image as ImageIcon, Tag, Pencil } from 'lucide-react';

const PLATFORM_FEE = 0.05;

const schema = z.object({
  name       : z.string().min(3, 'Mínimo 3 caracteres'),
  type       : z.enum(['PHYSICAL', 'DIGITAL', 'SUBSCRIPTION', 'BUNDLE']),
  description: z.string().optional(),
  category   : z.string().optional(),
  imageUrl   : z.string().optional(),
  digitalUrl : z.string().url('URL inválida').optional().or(z.literal('')),
});
type FormData = z.infer<typeof schema>;

export default function MyProducts() {
  const qc = useQueryClient();
  const [openCreate, setOpenCreate] = useState(false);
  const [selected, setSelected]     = useState<any>(null);
  const [editProduct, setEdit]      = useState<any>(null);
  const [imageUrl, setImageUrl]     = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['my-products'],
    queryFn : () => api.get('/products').then(r => r.data),
  });

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const { register: re, handleSubmit: he, reset: rr, watch: we, setValue: sv, formState: { errors: ee } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const productType     = watch('type');
  const editProductType = we('type');

  const create = useMutation({
    mutationFn: (d: FormData) => api.post('/products', { ...d, imageUrl: imageUrl || undefined }),
    onSuccess : () => {
      toast.success('Produto criado! Aguarde aprovação.');
      qc.invalidateQueries({ queryKey: ['my-products'] });
      setOpenCreate(false); reset(); setImageUrl('');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erro ao criar produto'),
  });

  const update = useMutation({
    mutationFn: (d: FormData) => api.patch(`/products/${editProduct?.id}`, {
      ...d,
      imageUrl  : editImageUrl || undefined,
      digitalUrl: d.digitalUrl || undefined,
    }),
    onSuccess: () => {
      toast.success('Produto atualizado!');
      qc.invalidateQueries({ queryKey: ['my-products'] });
      setEdit(null); rr(); setEditImageUrl('');
      setSelected(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erro ao atualizar'),
  });

  const openEdit = (p: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEdit(p);
    setEditImageUrl(p.imageUrl || '');
    sv('name',        p.name);
    sv('type',        p.type);
    sv('description', p.description || '');
    sv('category',    p.category    || '');
    sv('digitalUrl',  p.digitalUrl  || '');
  };

  const recebeAte = (priceCents: number) => Math.round(priceCents * (1 - PLATFORM_FEE));

  const bestOffer = (p: any) => {
    const offers = p.offers || [];
    if (!offers.length) return null;
    return offers.reduce((best: any, o: any) =>
      !best || o.priceCents < best.priceCents ? o : best, null);
  };

  const products: any[] = data?.data || [];

  return (
    <div>
      <PageHeader
        title="Meus Produtos"
        sub="Gerencie seu catálogo"
        actions={
          <button onClick={() => setOpenCreate(true)} className="btn-primary btn-sm">
            <Plus size={14} /> Novo produto
          </button>
        }
      />

      {isLoading ? <Loading /> : products.length === 0 ? (
        <EmptyState
          icon={<Package size={32} />}
          title="Nenhum produto"
          sub="Crie seu primeiro produto."
          action={<button onClick={() => setOpenCreate(true)} className="btn-primary btn-sm">Criar produto</button>}
        />
      ) : (
        <div className="grid grid-cols-4 gap-4">
          {products.map((p: any) => {
            const offer  = bestOffer(p);
            const recebe = offer ? recebeAte(offer.priceCents) : null;

            return (
              <div
                key={p.id}
                onClick={() => setSelected(p)}
                className="card p-0 overflow-hidden cursor-pointer hover:border-accent/40 hover:shadow-lg hover:shadow-accent/5 transition-all group relative"
              >
                {/* Botão editar */}
                <button
                  onClick={(e) => openEdit(p, e)}
                  className="absolute top-2 right-2 z-10 w-7 h-7 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center text-white/70 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Pencil size={12} />
                </button>

                {/* Imagem */}
                <div className="relative bg-bg3 aspect-square overflow-hidden">
                  {p.imageUrl ? (
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon size={36} className="text-text3/40" strokeWidth={1} />
                    </div>
                  )}
                  <div className="absolute top-2 left-2">
                    <span className="badge-gray text-[10px]">{PRODUCT_TYPE_LABEL[p.type] || p.type}</span>
                  </div>
                  {offer && (
                    <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm rounded-full px-2 py-0.5 flex items-center gap-1">
                      <Tag size={10} className="text-white/60" />
                      <span className="text-[10px] text-white/80">{p.offers?.length || 0} oferta(s)</span>
                    </div>
                  )}
                  <div className="absolute top-2 right-10">
                    <span className={productStatusVariant(p.status)}>{p.status}</span>
                  </div>
                </div>

                {/* Conteúdo */}
                <div className="p-3">
                  <h3 className="font-semibold text-text text-sm leading-tight truncate mb-1">{p.name}</h3>
                  {p.category && <p className="text-[10px] text-text3 truncate mb-2">{p.category}</p>}
                  {recebe !== null ? (
                    <div>
                      <div className="text-[10px] text-text3">Você recebe até</div>
                      <div className="text-base font-bold text-green">{formatBRL(recebe)}</div>
                      <div className="text-[10px] text-text3">de {formatBRL(offer.priceCents)} (–5% plataforma)</div>
                    </div>
                  ) : (
                    <div className="text-xs text-text3 italic">Sem oferta cadastrada</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal detalhes */}
      {selected && !editProduct && (
        <Modal
          open={!!selected}
          onClose={() => setSelected(null)}
          title="Detalhes do Produto"
          size="lg"
          footer={
            <div className="flex gap-2">
              <button className="btn-ghost" onClick={() => setSelected(null)}>Fechar</button>
              <button className="btn-sec btn-sm" onClick={(e) => openEdit(selected, e)}>
                <Pencil size={13} /> Editar
              </button>
            </div>
          }
        >
          <div className="flex gap-5">
            <div className="w-40 flex-shrink-0">
              {selected.imageUrl ? (
                <img src={selected.imageUrl} alt={selected.name} className="w-full rounded-xl object-cover border border-border" style={{ aspectRatio: '1' }} />
              ) : (
                <div className="w-full aspect-square rounded-xl bg-bg3 border border-border flex items-center justify-center">
                  <ImageIcon size={32} className="text-text3/40" strokeWidth={1} />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 space-y-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-lg font-bold text-text">{selected.name}</h2>
                  <span className={productStatusVariant(selected.status)}>{selected.status}</span>
                </div>
                {selected.description && <p className="text-sm text-text2 leading-relaxed">{selected.description}</p>}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  ['Tipo',      PRODUCT_TYPE_LABEL[selected.type] || selected.type],
                  ['Categoria', selected.category || '—'],
                  ['Cadastro',  formatDate(selected.createdAt)],
                  ['Ofertas',   `${selected.offers?.length || 0} ativa(s)`],
                ].map(([k, v]) => (
                  <div key={k} className="bg-bg3 rounded-[7px] px-3 py-2">
                    <div className="text-[10px] text-text3 uppercase tracking-wide">{k}</div>
                    <div className="text-sm font-medium text-text">{v}</div>
                  </div>
                ))}
              </div>
              {(selected.offers || []).length > 0 && (
                <div>
                  <div className="text-xs text-text3 uppercase tracking-wide mb-2">Ofertas</div>
                  <div className="space-y-1.5">
                    {selected.offers.map((o: any) => (
                      <div key={o.id} className="flex items-center justify-between bg-bg3 rounded-[7px] px-3 py-2">
                        <div>
                          <div className="text-sm font-medium text-text">{o.name}</div>
                          {o.slug && (
                            <a href={`/checkout/${o.slug}`} target="_blank" rel="noopener noreferrer"
                              className="text-[10px] text-accent flex items-center gap-1 hover:underline">
                              /checkout/{o.slug} <ExternalLink size={9} />
                            </a>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-text">{formatBRL(o.priceCents)}</div>
                          <div className="text-[10px] text-green">Recebe {formatBRL(recebeAte(o.priceCents))}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {selected.digitalUrl && (
                <div className="flex items-center gap-2 bg-bg3 rounded-[7px] px-3 py-2">
                  <ExternalLink size={13} className="text-accent flex-shrink-0" />
                  <a href={selected.digitalUrl} target="_blank" rel="noopener noreferrer"
                    className="text-sm text-accent hover:underline truncate">
                    {selected.digitalUrl}
                  </a>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Criar */}
      <Modal
        open={openCreate}
        onClose={() => { setOpenCreate(false); reset(); setImageUrl(''); }}
        title="Novo Produto"
        size="lg"
        footer={
          <div className="flex gap-2">
            <button className="btn-ghost" onClick={() => { setOpenCreate(false); reset(); setImageUrl(''); }}>Cancelar</button>
            <button className="btn-primary" onClick={handleSubmit(d => create.mutate(d))} disabled={create.isPending}>
              {create.isPending ? 'Criando...' : 'Criar produto'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="label">Nome *</label>
              <input {...register('name')} className="input" placeholder="Nome do produto" />
              {errors.name && <span className="text-xs text-red">{errors.name.message}</span>}
            </div>
            <div className="form-group">
              <label className="label">Tipo *</label>
              <select {...register('type')} className="input">
                <option value="DIGITAL">Digital</option>
                <option value="PHYSICAL">Físico</option>
                <option value="SUBSCRIPTION">Assinatura</option>
                <option value="BUNDLE">Bundle</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="label">Descrição</label>
            <textarea {...register('description')} className="input" rows={2} placeholder="Descreva o produto..." />
          </div>
          <div className="form-group">
            <label className="label">Categoria</label>
            <input {...register('category')} className="input" placeholder="Ex: Cursos, Saúde..." />
          </div>
          <ImageUpload value={imageUrl} onChange={setImageUrl} folder="products" label="Imagem de capa" />
        </div>
      </Modal>

      {/* Modal Editar */}
      <Modal
        open={!!editProduct}
        onClose={() => { setEdit(null); rr(); setEditImageUrl(''); }}
        title="Editar Produto"
        size="lg"
        footer={
          <div className="flex gap-2">
            <button className="btn-ghost" onClick={() => { setEdit(null); rr(); setEditImageUrl(''); }}>Cancelar</button>
            <button className="btn-primary" onClick={he(d => update.mutate(d))} disabled={update.isPending}>
              {update.isPending ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="label">Nome *</label>
              <input {...re('name')} className="input" />
              {ee.name && <span className="text-xs text-red">{ee.name.message}</span>}
            </div>
            <div className="form-group">
              <label className="label">Tipo</label>
              <select {...re('type')} className="input">
                <option value="DIGITAL">Digital</option>
                <option value="PHYSICAL">Físico</option>
                <option value="SUBSCRIPTION">Assinatura</option>
                <option value="BUNDLE">Bundle</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="label">Descrição</label>
            <textarea {...re('description')} className="input" rows={2} />
          </div>
          <div className="form-group">
            <label className="label">Categoria</label>
            <input {...re('category')} className="input" />
          </div>
          {editProductType === 'DIGITAL' && (
            <div className="form-group">
              <label className="label">Link do produto digital</label>
              <div className="relative">
                <input {...re('digitalUrl')} className="input pr-10" placeholder="https://..." />
                {we('digitalUrl') && (
                  <a href={we('digitalUrl')} target="_blank" rel="noopener noreferrer"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text3 hover:text-accent">
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
              {ee.digitalUrl && <span className="text-xs text-red">{ee.digitalUrl.message}</span>}
              <p className="text-xs text-text3 mt-1">Link enviado automaticamente ao cliente após compra confirmada</p>
            </div>
          )}
          <ImageUpload value={editImageUrl} onChange={setEditImageUrl} folder="products" label="Imagem de capa" />
        </div>
      </Modal>
    </div>
  );
}