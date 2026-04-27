import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Modal, Loading } from '@/components/ui';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { Plus, Pencil, Trash2, Video, Lock, Eye, EyeOff, ChevronDown, ChevronRight } from 'lucide-react';

type Lesson = {
  id: string; title: string; description: string | null;
  coverUrl: string | null; videoUrl: string | null; videoSource: string | null;
  hideVideo: boolean; defaultPlayer: boolean; position: number;
};
type Module = {
  id: string; title: string; description: string | null;
  coverUrl: string | null; releaseAfterDays: number; visible: boolean;
  showPublishDate: boolean; showModuleTitle: boolean; position: number;
  lessons: Lesson[];
};
type Area = {
  id: string; title: string; description: string | null;
  coverUrl: string | null; commentsEnabled: boolean;
  modules: Module[];
};

export function ProductMembersAreaSection() {
  const { product } = useOutletContext<{ product: any }>();
  const qc = useQueryClient();

  const { data: area, isLoading } = useQuery<Area | null>({
    queryKey: ['members-area', product.id],
    queryFn : () => api.get(`/members-area/products/${product.id}`)
      .then(r => r.data)
      .catch(e => e?.response?.status === 404 ? null : Promise.reject(e)),
  });

  if (isLoading) return <Loading />;

  return area
    ? <AreaEditor area={area} productId={product.id} onChanged={() => qc.invalidateQueries({ queryKey: ['members-area', product.id] })} />
    : <CreateAreaForm productId={product.id} onCreated={() => qc.invalidateQueries({ queryKey: ['members-area', product.id] })} />;
}

// ─────────────────────────────────────────────────────────
// CRIAR
// ─────────────────────────────────────────────────────────
function CreateAreaForm({ productId, onCreated }: { productId: string; onCreated: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [commentsEnabled, setCommentsEnabled] = useState(true);

  const create = useMutation({
    mutationFn: () => api.post(`/members-area/products/${productId}`, {
      title,
      description: description || null,
      coverUrl   : coverUrl || null,
      commentsEnabled,
    }),
    onSuccess: () => { toast.success('Área de membros criada!'); onCreated(); },
    onError  : (e: any) => toast.error(e?.response?.data?.message || 'Erro ao criar'),
  });

  return (
    <div className="space-y-4 max-w-3xl">
      <h2 className="text-lg font-semibold text-text">Criar área de membros</h2>
      <p className="text-sm text-text3">Após criar, você poderá adicionar módulos e aulas.</p>

      <div className="form-group">
        <label className="label">Título *</label>
        <input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Curso completo de marketing digital" />
      </div>

      <div className="form-group">
        <label className="label">Descrição</label>
        <textarea className="input" rows={3} value={description} onChange={e => setDescription(e.target.value)}
          placeholder="Descrição da área de membros. Será exibida na página inicial do curso." />
      </div>

      <div className="form-group">
        <label className="label">Foto de capa</label>
        <ImageUpload folder="members-area" value={coverUrl} onChange={setCoverUrl} />
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={commentsEnabled} onChange={e => setCommentsEnabled(e.target.checked)} className="w-4 h-4" />
        <span className="text-sm text-text2">Permitir comentários nas aulas</span>
      </label>

      <button
        onClick={() => create.mutate()}
        disabled={!title.trim() || create.isPending}
        className="btn-primary w-full justify-center py-3"
      >
        {create.isPending ? 'Criando...' : 'Criar Área de Membros'}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// EDITOR PRINCIPAL (área criada)
// ─────────────────────────────────────────────────────────
function AreaEditor({ area, productId, onChanged }: { area: Area; productId: string; onChanged: () => void }) {
  const [tab, setTab] = useState<'preferences' | 'modules'>('modules');
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [creatingModule, setCreatingModule] = useState(false);
  const [moduleForLesson, setModuleForLesson] = useState<string | null>(null);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {[
          { k: 'preferences', label: 'Preferências' },
          { k: 'modules',     label: 'Módulos', count: area.modules.length },
        ].map(t => (
          <button
            key={t.k}
            onClick={() => setTab(t.k as any)}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              tab === t.k ? 'border-accent text-accent' : 'border-transparent text-text3 hover:text-text2'
            }`}
          >
            {t.label}
            {(t as any).count > 0 && <span className="bg-bg3 text-text2 text-[10px] px-1.5 py-0.5 rounded-full">{(t as any).count}</span>}
          </button>
        ))}
      </div>

      {tab === 'preferences' && <PreferencesPanel area={area} onSaved={onChanged} />}
      {tab === 'modules' && (
        <ModulesPanel
          area={area}
          onCreateModule={() => setCreatingModule(true)}
          onEditModule={setEditingModule}
          onCreateLesson={(modId) => setModuleForLesson(modId)}
          onEditLesson={setEditingLesson}
          onChanged={onChanged}
        />
      )}

      {(creatingModule || editingModule) && (
        <ModuleModal
          areaId={area.id}
          module={editingModule}
          onClose={() => { setCreatingModule(false); setEditingModule(null); }}
          onSaved={() => { setCreatingModule(false); setEditingModule(null); onChanged(); }}
        />
      )}
      {(moduleForLesson || editingLesson) && (
        <LessonModal
          moduleId={moduleForLesson || (editingLesson && area.modules.find(m => m.lessons.some(l => l.id === editingLesson.id))?.id) || ''}
          lesson={editingLesson}
          onClose={() => { setModuleForLesson(null); setEditingLesson(null); }}
          onSaved={() => { setModuleForLesson(null); setEditingLesson(null); onChanged(); }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// PREFERÊNCIAS
// ─────────────────────────────────────────────────────────
function PreferencesPanel({ area, onSaved }: { area: Area; onSaved: () => void }) {
  const [title, setTitle] = useState(area.title);
  const [description, setDescription] = useState(area.description || '');
  const [coverUrl, setCoverUrl] = useState(area.coverUrl || '');
  const [commentsEnabled, setCommentsEnabled] = useState(area.commentsEnabled);

  const save = useMutation({
    mutationFn: () => api.patch(`/members-area/${area.id}`, {
      title, description: description || null, coverUrl: coverUrl || null, commentsEnabled,
    }),
    onSuccess: () => { toast.success('Preferências salvas'); onSaved(); },
    onError  : (e: any) => toast.error(e?.response?.data?.message || 'Erro'),
  });

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="form-group">
        <label className="label">Título *</label>
        <input className="input" value={title} onChange={e => setTitle(e.target.value)} />
      </div>
      <div className="form-group">
        <label className="label">Descrição</label>
        <textarea className="input" rows={3} value={description} onChange={e => setDescription(e.target.value)} />
      </div>
      <div className="form-group">
        <label className="label">Foto de capa</label>
        <ImageUpload folder="members-area" value={coverUrl} onChange={setCoverUrl} />
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={commentsEnabled} onChange={e => setCommentsEnabled(e.target.checked)} className="w-4 h-4" />
        <span className="text-sm text-text2">Permitir comentários nas aulas</span>
      </label>
      <button onClick={() => save.mutate()} disabled={save.isPending} className="btn-primary">
        {save.isPending ? 'Salvando...' : 'Salvar'}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// MÓDULOS
// ─────────────────────────────────────────────────────────
function ModulesPanel({ area, onCreateModule, onEditModule, onCreateLesson, onEditLesson, onChanged }: {
  area: Area;
  onCreateModule: () => void;
  onEditModule: (m: Module) => void;
  onCreateLesson: (modId: string) => void;
  onEditLesson: (l: Lesson) => void;
  onChanged: () => void;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggleExpand = (id: string) => setExpanded(s => ({ ...s, [id]: !s[id] }));

  const deleteModule = useMutation({
    mutationFn: (id: string) => api.delete(`/members-area/modules/${id}`),
    onSuccess : () => { toast.success('Módulo removido'); onChanged(); },
    onError   : (e: any) => toast.error(e?.response?.data?.message || 'Erro'),
  });

  const deleteLesson = useMutation({
    mutationFn: (id: string) => api.delete(`/members-area/lessons/${id}`),
    onSuccess : () => { toast.success('Aula removida'); onChanged(); },
    onError   : (e: any) => toast.error(e?.response?.data?.message || 'Erro'),
  });

  return (
    <div className="space-y-3">
      <div className="card p-3 flex items-center justify-between">
        <div className="text-sm text-text2">Crie módulos e adicione aulas, arquivos e conteúdo.</div>
        <button onClick={onCreateModule} className="btn-primary btn-sm">
          <Plus size={14} /> Módulo
        </button>
      </div>

      {area.modules.length === 0 ? (
        <div className="card p-8 text-center text-text3">
          Nenhum módulo ainda. Clique em <strong>+ Módulo</strong> para começar.
        </div>
      ) : (
        <div className="space-y-2">
          {area.modules.map(mod => (
            <div key={mod.id} className="card overflow-hidden">
              <div className="p-3 flex items-center gap-3">
                <button onClick={() => toggleExpand(mod.id)} className="text-text3 hover:text-text">
                  {expanded[mod.id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
                <div className="flex items-center gap-1.5 text-text3 text-xs">
                  <Lock size={12} /> {mod.releaseAfterDays}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <strong className="text-text truncate">{mod.title}</strong>
                    {!mod.visible && <EyeOff size={12} className="text-amber" />}
                  </div>
                  {mod.description && <div className="text-xs text-text3 truncate">{mod.description}</div>}
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => { if (window.confirm(`Remover módulo "${mod.title}" e todas as aulas?`)) deleteModule.mutate(mod.id); }}
                    className="btn-ghost btn-sm border border-red/40 text-red hover:bg-red/10"
                    title="Remover módulo"
                  >
                    <Trash2 size={12} />
                  </button>
                  <button onClick={() => onEditModule(mod)} className="btn-ghost btn-sm" title="Editar módulo">
                    <Pencil size={12} />
                  </button>
                  <button onClick={() => onCreateLesson(mod.id)} className="btn-primary btn-sm">
                    <Plus size={12} /> Aula
                  </button>
                </div>
              </div>

              {expanded[mod.id] && mod.lessons.length > 0 && (
                <div className="border-t border-border bg-bg3/30 px-3 py-2 space-y-1.5">
                  {mod.lessons.map(lesson => (
                    <div key={lesson.id} className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-bg2">
                      <Video size={14} className="text-accent flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-text truncate">{lesson.title}</div>
                        {lesson.description && <div className="text-xs text-text3 truncate">{lesson.description}</div>}
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => { if (window.confirm(`Remover aula "${lesson.title}"?`)) deleteLesson.mutate(lesson.id); }}
                          className="btn-ghost btn-sm border border-red/40 text-red hover:bg-red/10"
                          title="Remover aula"
                        >
                          <Trash2 size={11} />
                        </button>
                        <button onClick={() => onEditLesson(lesson)} className="btn-ghost btn-sm" title="Editar aula">
                          <Pencil size={11} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {expanded[mod.id] && mod.lessons.length === 0 && (
                <div className="border-t border-border bg-bg3/30 px-4 py-3 text-xs text-text3">
                  Nenhuma aula. Clique em <strong>+ Aula</strong> para adicionar.
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// MODAL MÓDULO (criar/editar)
// ─────────────────────────────────────────────────────────
function ModuleModal({ areaId, module, onClose, onSaved }: { areaId: string; module: Module | null; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!module;
  const [title, setTitle] = useState(module?.title || '');
  const [description, setDescription] = useState(module?.description || '');
  const [coverUrl, setCoverUrl] = useState(module?.coverUrl || '');
  const [releaseAfterDays, setReleaseAfterDays] = useState(module?.releaseAfterDays ?? 0);
  const [visible, setVisible] = useState(module?.visible ?? true);
  const [showPublishDate, setShowPublishDate] = useState(module?.showPublishDate ?? true);
  const [showModuleTitle, setShowModuleTitle] = useState(module?.showModuleTitle ?? true);

  const save = useMutation({
    mutationFn: () => isEdit
      ? api.patch(`/members-area/modules/${module!.id}`, { title, description: description || null, coverUrl: coverUrl || null, releaseAfterDays, visible, showPublishDate, showModuleTitle })
      : api.post (`/members-area/${areaId}/modules`,        { title, description: description || null, coverUrl: coverUrl || null, releaseAfterDays, visible, showPublishDate, showModuleTitle }),
    onSuccess: () => { toast.success(isEdit ? 'Módulo atualizado' : 'Módulo criado'); onSaved(); },
    onError  : (e: any) => toast.error(e?.response?.data?.message || 'Erro'),
  });

  return (
    <Modal open onClose={onClose} title={isEdit ? 'Editar Módulo' : 'Novo Módulo'}>
      <div className="space-y-3">
        <div className="form-group">
          <label className="label">Título do Módulo *</label>
          <input className="input" value={title} onChange={e => setTitle(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="label">Descrição do Módulo</label>
          <textarea className="input" rows={3} value={description} onChange={e => setDescription(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="label">Dias para liberação *</label>
          <input type="number" min={0} className="input" value={releaseAfterDays} onChange={e => setReleaseAfterDays(Number(e.target.value) || 0)} />
          <p className="text-xs text-text3 mt-1">Quantos dias após a compra o módulo será liberado (0 = imediato)</p>
        </div>
        <div className="form-group">
          <label className="label">Visibilidade</label>
          <select className="input" value={visible ? '1' : '0'} onChange={e => setVisible(e.target.value === '1')}>
            <option value="1">Visível</option>
            <option value="0">Oculto</option>
          </select>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={showPublishDate} onChange={e => setShowPublishDate(e.target.checked)} className="w-4 h-4" />
          <span className="text-sm text-text2">Mostrar data de publicação da aula</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={showModuleTitle} onChange={e => setShowModuleTitle(e.target.checked)} className="w-4 h-4" />
          <span className="text-sm text-text2">Mostrar título do módulo na área</span>
        </label>
        <div className="form-group">
          <label className="label">Foto de capa</label>
          <ImageUpload folder="members-area-modules" value={coverUrl} onChange={setCoverUrl} />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="btn-ghost btn-sm text-red">Cancelar</button>
          <button onClick={() => save.mutate()} disabled={!title.trim() || save.isPending} className="btn-primary btn-sm">
            {save.isPending ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────
// MODAL AULA (criar/editar)
// ─────────────────────────────────────────────────────────
function LessonModal({ moduleId, lesson, onClose, onSaved }: { moduleId: string; lesson: Lesson | null; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!lesson;
  const [title, setTitle] = useState(lesson?.title || '');
  const [description, setDescription] = useState(lesson?.description || '');
  const [coverUrl, setCoverUrl] = useState(lesson?.coverUrl || '');
  const [hideVideo, setHideVideo] = useState(lesson?.hideVideo ?? false);
  const [videoSource, setVideoSource] = useState<string>(lesson?.videoSource || 'YOUTUBE');
  const [videoUrl, setVideoUrl] = useState(lesson?.videoUrl || '');
  const [defaultPlayer, setDefaultPlayer] = useState(lesson?.defaultPlayer ?? false);

  const save = useMutation({
    mutationFn: () => isEdit
      ? api.patch(`/members-area/lessons/${lesson!.id}`, {
          title, description: description || null, coverUrl: coverUrl || null,
          videoUrl: videoUrl || null, videoSource: videoUrl ? videoSource : null,
          hideVideo, defaultPlayer,
        })
      : api.post (`/members-area/modules/${moduleId}/lessons`, {
          title, description: description || null, coverUrl: coverUrl || null,
          videoUrl: videoUrl || null, videoSource: videoUrl ? videoSource : null,
          hideVideo, defaultPlayer,
        }),
    onSuccess: () => { toast.success(isEdit ? 'Aula atualizada' : 'Aula criada'); onSaved(); },
    onError  : (e: any) => toast.error(e?.response?.data?.message || 'Erro'),
  });

  return (
    <Modal open onClose={onClose} title={isEdit ? 'Editar aula' : 'Criar aula'}>
      <div className="space-y-3">
        <div className="form-group">
          <label className="label">Título *</label>
          <input className="input" value={title} onChange={e => setTitle(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="label">Descrição</label>
          <textarea className="input" rows={2} value={description} onChange={e => setDescription(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="label">Foto de capa</label>
          <ImageUpload folder="members-area-lessons" value={coverUrl} onChange={setCoverUrl} />
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={hideVideo} onChange={e => setHideVideo(e.target.checked)} className="w-4 h-4" />
          <span className="text-sm text-text2">Ocultar vídeo</span>
        </label>

        {!hideVideo && (
          <>
            <div className="form-group">
              <label className="label">Origem do vídeo</label>
              <select className="input" value={videoSource} onChange={e => setVideoSource(e.target.value)}>
                <option value="YOUTUBE">YouTube</option>
                <option value="MP4_DIRECT">MP4 direto (URL)</option>
                <option value="OTHER">Outros</option>
              </select>
            </div>
            <div className="form-group">
              <label className="label">URL do vídeo</label>
              <input className="input" value={videoUrl} onChange={e => setVideoUrl(e.target.value)}
                placeholder={videoSource === 'YOUTUBE' ? 'https://youtube.com/watch?v=...' : videoSource === 'MP4_DIRECT' ? 'https://...mp4' : 'URL do vídeo (embed iframe ou link direto)'} />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={defaultPlayer} onChange={e => setDefaultPlayer(e.target.checked)} className="w-4 h-4" />
              <span className="text-sm text-text2">Reprodutor de vídeo padrão (sem customização)</span>
            </label>
          </>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="btn-ghost btn-sm text-red">Cancelar</button>
          <button onClick={() => save.mutate()} disabled={!title.trim() || save.isPending} className="btn-primary btn-sm">
            {save.isPending ? 'Salvando...' : isEdit ? 'Salvar' : 'Criar'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
