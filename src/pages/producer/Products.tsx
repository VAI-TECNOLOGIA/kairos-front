import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { PageHeader, Modal, Loading, EmptyState } from '@/components/ui';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { formatBRL, formatDate, productStatusVariant, PRODUCT_TYPE_LABEL } from '@/lib/utils';
import type { Product } from '@/types';
import { Package, Plus, ExternalLink, Image as ImageIcon, Tag, Pencil, MessageSquareHeart, Eye, EyeOff } from 'lucide-react';
import { RichTextEditor, sanitizeHtml } from '@/components/RichTextEditor';
import { ICON_MAP, ICON_OPTIONS, COLOR_OPTIONS, DEFAULT_SUCCESS_ICON, DEFAULT_SUCCESS_COLOR } from '@/lib/successConfig';
import { usePlatformFee, feeMultiplier } from '@/hooks/usePlatformFee';

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
  const navigate = useNavigate();
  const isAffiliateArea = useLocation().pathname.startsWith('/afiliado/');
  const productBase = isAffiliateArea ? '/afiliado/meus-produtos' : '/produtor/produtos';
  const [openCreate, setOpenCreate]       = useState(false);
  const [selected, setSelected]           = useState<any>(null);
  const [editProduct, setEdit]            = useState<any>(null);
  const [imageUrl, setImageUrl]           = useState('');
  const [editImageUrl, setEditImageUrl]   = useState('');
  const [editSuccessMsg,   setEditSuccessMsg]   = useState('');
  const [editSuccessIcon,  setEditSuccessIcon]  = useState(DEFAULT_SUCCESS_ICON);
  const [editSuccessColor, setEditSuccessColor] = useState(DEFAULT_SUCCESS_COLOR);
  const [editTab,          setEditTab]          = useState<'info' | 'posVenda'>('info');
  const [previewMsg,       setPreviewMsg]       = useState(false);

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

  // Toggle isActive (esconder/mostrar produto). Não deleta — preserva histórico de vendas/afiliações.
  // Quando isActive=false: checkout retorna unavailable, marketplace afiliado/cliente filtram out.
  const toggleHidden = useMutation({
    mutationFn: (p: any) => api.patch(`/products/${p.id}`, { isActive: !p.isActive }),
    onSuccess : (_res, p: any) => {
      toast.success(p.isActive ? 'Produto oculto' : 'Produto visível novamente');
      qc.invalidateQueries({ queryKey: ['my-products'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erro ao alterar visibilidade'),
  });

  const update = useMutation({
    mutationFn: (d: FormData) => api.patch(`/products/${editProduct?.id}`, {
      ...d,
      imageUrl         : editImageUrl || undefined,
      digitalUrl       : d.digitalUrl || undefined,
      successMessage   : editSuccessMsg   || null,
      successIcon      : editSuccessIcon  || null,
      successIconColor : editSuccessColor || null,
    }),
    onSuccess: () => {
      toast.success('Produto atualizado!');
      qc.invalidateQueries({ queryKey: ['my-products'] });
      setEdit(null); rr(); setEditImageUrl(''); setEditSuccessMsg(''); setEditTab('info');
      setEditSuccessIcon(DEFAULT_SUCCESS_ICON); setEditSuccessColor(DEFAULT_SUCCESS_COLOR);
      setSelected(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erro ao atualizar'),
  });

  const openEdit = (p: any, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`${productBase}/${p.id}`);
  };

  const { data: feeData } = usePlatformFee();
  const PLATFORM_FEE = feeMultiplier(feeData);
  const recebeAte = (priceCents: number) => Math.round(priceCents * (1 - PLATFORM_FEE));

  const bestOffer = (p: any) => {
    const offers = p.offers || [];
    if (!offers.length) return null;
    return offers.reduce((best: any, o: any) =>
      !best || o.priceCents < best.priceCents ? o : best, null);
  };

  const allProducts: any[] = data?.data || [];
  const activeProducts = allProducts.filter(p => p.isActive !== false);
  const hiddenProducts = allProducts.filter(p => p.isActive === false);
  const [tab, setTab] = useState<'active' | 'hidden'>('active');
  const products = tab === 'hidden' ? hiddenProducts : activeProducts;

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

      {/* Tabs Ativos / Ocultos */}
      {allProducts.length > 0 && (
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setTab('active')}
            className={`btn-sm ${tab === 'active' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <Eye size={13} /> Ativos
            <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full ${tab === 'active' ? 'bg-white/20' : 'bg-bg3'}`}>
              {activeProducts.length}
            </span>
          </button>
          <button
            onClick={() => setTab('hidden')}
            className={`btn-sm ${tab === 'hidden' ? 'btn-primary' : 'btn-secondary'}`}
            disabled={hiddenProducts.length === 0}
          >
            <EyeOff size={13} /> Ocultos
            <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full ${tab === 'hidden' ? 'bg-white/20' : 'bg-bg3'}`}>
              {hiddenProducts.length}
            </span>
          </button>
        </div>
      )}

      {isLoading ? <Loading /> : allProducts.length === 0 ? (
        <EmptyState
          icon={<Package size={32} />}
          title="Nenhum produto"
          sub="Crie seu primeiro produto."
          action={<button onClick={() => setOpenCreate(true)} className="btn-primary btn-sm">Criar produto</button>}
        />
      ) : products.length === 0 ? (
        <EmptyState
          icon={<EyeOff size={32} />}
          title={tab === 'hidden' ? 'Nenhum produto oculto' : 'Nenhum produto ativo'}
          sub={tab === 'hidden' ? 'Quando você ocultar um produto ele aparece aqui.' : 'Todos os seus produtos estão ocultos. Volte na aba "Ocultos" pra mostrar.'}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {products.map((p: any) => {
            const offer  = bestOffer(p);
            const recebe = offer ? recebeAte(offer.priceCents) : null;

            const hidden = p.isActive === false;
            return (
              <div
                key={p.id}
                onClick={(e) => openEdit(p, e)}
                className={`card p-0 overflow-hidden cursor-pointer hover:border-accent/40 hover:shadow-lg hover:shadow-accent/5 transition-all group relative ${hidden ? 'opacity-60' : ''}`}
              >
                {/* Botão Ocultar/Mostrar — canto superior direito, sempre visível */}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); toggleHidden.mutate(p); }}
                  disabled={toggleHidden.isPending}
                  title={hidden ? 'Tornar visível' : 'Ocultar produto'}
                  className="absolute top-2 right-2 z-20 inline-flex items-center justify-center w-7 h-7 rounded-full bg-bg2/90 hover:bg-accent/90 hover:text-white text-text2 border border-border backdrop-blur-sm transition-colors"
                >
                  {hidden ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>

                {/* Badge "Oculto" sobre a imagem quando aplicável */}
                {hidden && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-bg/40 backdrop-blur-[1px] pointer-events-none">
                    <span className="inline-flex items-center gap-1.5 bg-bg2/95 border border-border rounded-full px-3 py-1 text-[11px] font-semibold text-text2">
                      <EyeOff size={12} /> Oculto
                    </span>
                  </div>
                )}

                {/* Indicador "Editar" no hover (entrada direta — click em qualquer lugar abre edit) */}
                <div className="absolute top-2 right-11 z-10 inline-flex items-center gap-1 bg-accent/90 backdrop-blur-sm rounded-full px-2 py-1 text-[10px] font-semibold text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  <Pencil size={11} /> Abrir
                </div>

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
                    <div className="text-xs text-amber italic flex items-start gap-1">
                      <span>Configure sua primeira oferta para esse produto</span>
                    </div>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        onClose={() => { setEdit(null); rr(); setEditImageUrl(''); setEditSuccessMsg(''); setEditTab('info'); }}
        title="Editar Produto"
        size="lg"
        footer={
          <div className="flex gap-2">
            <button className="btn-ghost" onClick={() => { setEdit(null); rr(); setEditImageUrl(''); setEditSuccessMsg(''); setEditTab('info'); }}>Cancelar</button>
            <button className="btn-primary" onClick={he(d => update.mutate(d))} disabled={update.isPending}>
              {update.isPending ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        }
      >
        {/* Abas */}
        <div className="flex gap-1 p-1 bg-bg3 rounded-xl mb-5">
          {([
            { key: 'info',     label: 'Informações' },
            { key: 'posVenda', label: 'Pós-Venda',  icon: <MessageSquareHeart size={13} /> },
          ] as const).map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setEditTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                editTab === tab.key ? 'bg-bg2 text-text shadow-sm' : 'text-text3 hover:text-text2'
              }`}
            >
              {'icon' in tab && tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Aba: Informações */}
        {editTab === 'info' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        )}

        {/* Aba: Pós-Venda */}
        {editTab === 'posVenda' && (
          <div className="space-y-5">
            <div className="bg-bg3 border border-border rounded-xl p-3 text-xs text-text3 leading-relaxed">
              <strong className="text-text2">Personalização da tela de parabéns</strong> — escolha o ícone, a cor e a mensagem exibida após a compra deste produto. Se deixado em branco, será usado o padrão da plataforma.
            </div>

            {/* ── Ícone ────────────────────────────────────────────── */}
            <div>
              <label className="label mb-2">Ícone</label>
              {ICON_OPTIONS.map(group => (
                <div key={group.group} className="mb-3">
                  <p className="text-[11px] font-semibold text-text3 uppercase tracking-wider mb-1.5">{group.group}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {group.items.map(opt => {
                      const Ic = ICON_MAP[opt.id];
                      const active = editSuccessIcon === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          title={opt.label}
                          onClick={() => setEditSuccessIcon(opt.id)}
                          className={`flex flex-col items-center gap-1 px-2.5 py-2 rounded-xl border transition-all ${
                            active
                              ? 'border-accent/60 bg-accent/10 text-text'
                              : 'border-border bg-bg3 text-text3 hover:text-text2 hover:border-border/80'
                          }`}
                        >
                          <Ic size={18} style={active ? { color: editSuccessColor } : undefined} strokeWidth={1.5} />
                          <span className="text-[10px] leading-none">{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* ── Cor ──────────────────────────────────────────────── */}
            <div>
              <label className="label mb-2">Cor do ícone</label>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map(c => (
                  <button
                    key={c.hex}
                    type="button"
                    title={c.label}
                    onClick={() => setEditSuccessColor(c.hex)}
                    className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${
                      editSuccessColor === c.hex ? 'border-white scale-110 shadow-md' : 'border-transparent'
                    }`}
                    style={{ background: c.hex }}
                  />
                ))}
              </div>
            </div>

            {/* ── Preview do ícone ─────────────────────────────────── */}
            {(() => {
              const Ic = ICON_MAP[editSuccessIcon] ?? ICON_MAP[DEFAULT_SUCCESS_ICON];
              return (
                <div className="flex items-center gap-3 bg-bg3 rounded-xl p-3 border border-border">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center border flex-shrink-0"
                    style={{ background: `${editSuccessColor}20`, borderColor: `${editSuccessColor}40` }}>
                    <Ic size={22} strokeWidth={1.5} style={{ color: editSuccessColor }} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text">Pré-visualização</p>
                    <p className="text-xs text-text3">
                      {ICON_OPTIONS.flatMap(g => g.items).find(i => i.id === editSuccessIcon)?.label ?? editSuccessIcon}
                      {' · '}{COLOR_OPTIONS.find(c => c.hex === editSuccessColor)?.label ?? editSuccessColor}
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* ── Mensagem ─────────────────────────────────────────── */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label mb-0">Mensagem de Pós-Venda</label>
                <button
                  type="button"
                  onClick={() => setPreviewMsg(p => !p)}
                  className="flex items-center gap-1.5 text-xs text-text2 hover:text-text transition-colors"
                >
                  {previewMsg ? <EyeOff size={12} /> : <Eye size={12} />}
                  {previewMsg ? 'Editar' : 'Pré-visualizar'}
                </button>
              </div>

              {previewMsg ? (
                <div
                  className="rich-content border border-border rounded-xl px-4 py-3 bg-bg text-sm leading-relaxed"
                  style={{ minHeight: 160 }}
                  dangerouslySetInnerHTML={{
                    __html: sanitizeHtml(editSuccessMsg) || '<p style="color:var(--text3);font-style:italic">Nenhuma mensagem — será usada a mensagem padrão da plataforma.</p>',
                  }}
                />
              ) : (
                <RichTextEditor
                  value={editSuccessMsg}
                  onChange={setEditSuccessMsg}
                  placeholder="Ex: Parabéns pela sua escolha! Você fez parte de algo incrível..."
                  minHeight={160}
                />
              )}

              {editSuccessMsg && (
                <button
                  type="button"
                  onClick={() => { setEditSuccessMsg(''); setPreviewMsg(false); }}
                  className="mt-1 text-xs text-text3 hover:text-red transition-colors"
                >
                  Remover mensagem personalizada
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}