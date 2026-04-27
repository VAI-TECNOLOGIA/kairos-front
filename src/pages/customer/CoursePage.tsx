import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { ArrowLeft, ChevronDown, ChevronRight, Video, Lock, Send, Trash2, PlayCircle, MessageCircle, LogOut, Menu, X } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';

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
type Course = {
  id: string; title: string; description: string | null;
  coverUrl: string | null; commentsEnabled: boolean;
  primaryColor: string | null; accentColor: string | null;
  theme: string | null; layout: string | null;
  modules: Module[];
};

function ytEmbed(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([\w-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

export default function CoursePage() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: course, isLoading, error } = useQuery<Course>({
    queryKey: ['course', productId],
    queryFn : () => api.get(`/members-area/customer/products/${productId}`).then(r => r.data),
    enabled : !!productId,
    retry   : false,
  });

  const theme   = course?.theme || 'dark';
  const primary = course?.primaryColor || '#0055FE';
  const accent  = course?.accentColor  || '#7C3AED';
  const isDark  = theme === 'dark';

  // Variáveis CSS controlam todo o visual
  const themeVars = useMemo<React.CSSProperties>(() => ({
    ['--c-primary' as any]: primary,
    ['--c-accent'  as any]: accent,
    ['--c-bg'      as any]: isDark ? '#0a0e1a' : '#f9fafb',
    ['--c-bg2'     as any]: isDark ? '#111827' : '#ffffff',
    ['--c-bg3'     as any]: isDark ? '#1f2937' : '#f3f4f6',
    ['--c-text'    as any]: isDark ? '#f9fafb' : '#111827',
    ['--c-text2'   as any]: isDark ? '#cbd5e1' : '#374151',
    ['--c-text3'   as any]: isDark ? '#94a3b8' : '#6b7280',
    ['--c-border'  as any]: isDark ? '#1f2937' : '#e5e7eb',
    minHeight: '100vh',
    background: isDark ? '#0a0e1a' : '#f9fafb',
    color: isDark ? '#f9fafb' : '#111827',
  }), [primary, accent, isDark]);

  if (isLoading) {
    return (
      <div style={themeVars} className="flex items-center justify-center">
        <div className="text-sm" style={{ color: 'var(--c-text3)' }}>Carregando curso...</div>
      </div>
    );
  }
  if (error || !course) {
    return (
      <div style={themeVars} className="flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <Lock size={32} className="mx-auto mb-3" style={{ color: 'var(--c-text3)' }} />
          <h2 className="text-lg font-semibold mb-1">Acesso restrito</h2>
          <p className="text-sm mb-4" style={{ color: 'var(--c-text3)' }}>
            Você precisa ter comprado este curso para acessá-lo.
          </p>
          <button
            onClick={() => navigate('/cliente/compras')}
            className="px-4 py-2 rounded-md text-sm font-medium text-white"
            style={{ background: primary }}
          >
            Voltar para minhas compras
          </button>
        </div>
      </div>
    );
  }

  const allLessons = course.modules.flatMap(m => m.lessons);
  const currentLesson = selectedLessonId ? allLessons.find(l => l.id === selectedLessonId) : null;
  const totalLessons = allLessons.length;
  const currentIndex = currentLesson ? allLessons.findIndex(l => l.id === currentLesson.id) : -1;
  const layoutMode = course.layout || 'sidebar';

  const handleLogout = () => { logout(); navigate('/cliente/login'); };

  return (
    <div style={themeVars}>
      <style>{`
        .crs-card { background: var(--c-bg2); border: 1px solid var(--c-border); border-radius: 16px; }
        .crs-text  { color: var(--c-text); }
        .crs-text2 { color: var(--c-text2); }
        .crs-text3 { color: var(--c-text3); }
        .crs-btn-primary { background: var(--c-primary); color: #fff; padding: 8px 14px; border-radius: 8px; font-weight: 500; transition: filter .15s; display: inline-flex; align-items: center; gap: 6px; }
        .crs-btn-primary:hover { filter: brightness(1.1); }
        .crs-btn-primary:disabled { opacity: .4; cursor: not-allowed; }
        .crs-btn-ghost { color: var(--c-text2); padding: 6px 10px; border-radius: 6px; transition: color .15s, background .15s; display: inline-flex; align-items: center; gap: 4px; }
        .crs-btn-ghost:hover { color: var(--c-text); background: var(--c-bg3); }
        .crs-input { background: var(--c-bg3); border: 1px solid var(--c-border); color: var(--c-text); padding: 8px 12px; border-radius: 8px; outline: none; transition: border-color .15s; width: 100%; }
        .crs-input:focus { border-color: var(--c-primary); }
        .crs-lesson-row { padding: 10px 12px; display: flex; align-items: center; gap: 8px; cursor: pointer; transition: background .15s; color: var(--c-text2); font-size: 13px; }
        .crs-lesson-row:hover { background: var(--c-bg3); }
        .crs-lesson-active { background: color-mix(in srgb, var(--c-primary) 15%, transparent); color: var(--c-primary); border-left: 3px solid var(--c-primary); padding-left: 9px; font-weight: 500; }
      `}</style>

      {/* Topbar imersiva */}
      <header className="sticky top-0 z-30" style={{ background: 'var(--c-bg2)', borderBottom: '1px solid var(--c-border)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <button onClick={() => navigate('/cliente/compras')} className="crs-btn-ghost text-sm">
            <ArrowLeft size={14} /> Minhas compras
          </button>
          <div className="hidden md:block flex-1 text-center text-sm font-medium truncate" style={{ color: 'var(--c-text)' }}>
            {course.title}
          </div>
          <div className="flex items-center gap-2">
            {user && (
              <div className="hidden sm:flex items-center gap-2 text-sm" style={{ color: 'var(--c-text2)' }}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: primary }}>
                  {user.name?.slice(0, 2).toUpperCase()}
                </div>
                <span className="font-medium">{user.name?.split(' ')[0]}</span>
              </div>
            )}
            <button
              onClick={() => setSidebarOpen(s => !s)}
              className="lg:hidden crs-btn-ghost"
              aria-label="Menu"
            >
              {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
            <button onClick={handleLogout} className="crs-btn-ghost text-xs" title="Sair">
              <LogOut size={13} />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Hero */}
        <header className="crs-card overflow-hidden mb-6">
          {course.coverUrl ? (
            <div className="aspect-[3/1] relative">
              <img src={course.coverUrl} alt={course.title} className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, transparent 30%, ${isDark ? 'rgba(10,14,26,.95)' : 'rgba(249,250,251,.95)'} 100%)` }} />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <h1 className="text-3xl font-bold crs-text mb-1">{course.title}</h1>
                {course.description && <p className="crs-text2 max-w-2xl">{course.description}</p>}
                <div className="flex items-center gap-3 mt-3 text-xs crs-text3">
                  <span className="inline-flex items-center gap-1"><PlayCircle size={12} /> {totalLessons} aula{totalLessons !== 1 ? 's' : ''}</span>
                  <span>•</span>
                  <span>{course.modules.length} módulo{course.modules.length !== 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8" style={{ background: `linear-gradient(135deg, ${primary}25, ${accent}10)` }}>
              <h1 className="text-3xl font-bold crs-text">{course.title}</h1>
              {course.description && <p className="crs-text2 mt-2">{course.description}</p>}
              <div className="flex items-center gap-3 mt-3 text-xs crs-text3">
                <span className="inline-flex items-center gap-1"><PlayCircle size={12} /> {totalLessons} aula{totalLessons !== 1 ? 's' : ''}</span>
                <span>•</span>
                <span>{course.modules.length} módulo{course.modules.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
          )}
        </header>

        {/* Layout principal */}
        <div className={layoutMode === 'sidebar' ? 'grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6' : 'space-y-6'}>
          <main>
            {currentLesson ? (
              <LessonView
                lesson={currentLesson}
                commentsEnabled={course.commentsEnabled}
                primary={primary}
                onPrev={() => currentIndex > 0 && setSelectedLessonId(allLessons[currentIndex - 1].id)}
                onNext={() => currentIndex < allLessons.length - 1 && setSelectedLessonId(allLessons[currentIndex + 1].id)}
                hasPrev={currentIndex > 0}
                hasNext={currentIndex < allLessons.length - 1 && currentIndex >= 0}
              />
            ) : (
              <div className="crs-card p-12 text-center">
                <PlayCircle size={48} className="mx-auto mb-3" style={{ color: primary, opacity: 0.6 }} />
                <h2 className="text-lg font-semibold crs-text mb-1">Bem-vindo ao curso!</h2>
                <p className="text-sm crs-text3">
                  Selecione uma aula no menu {layoutMode === 'sidebar' ? 'ao lado' : 'abaixo'} para começar.
                </p>
                {totalLessons > 0 && (
                  <button onClick={() => setSelectedLessonId(allLessons[0].id)} className="crs-btn-primary mt-5 mx-auto">
                    <PlayCircle size={14} /> Começar agora
                  </button>
                )}
              </div>
            )}
          </main>

          <aside className={layoutMode === 'sidebar'
            ? `space-y-2 ${sidebarOpen ? 'block' : 'hidden lg:block'}`
            : 'space-y-2'
          }>
            {course.modules.length === 0 ? (
              <div className="crs-card p-4 text-sm crs-text3 text-center">Nenhum módulo disponível ainda.</div>
            ) : (
              course.modules.map(mod => (
                <ModuleCard
                  key={mod.id}
                  module={mod}
                  selectedLessonId={selectedLessonId || undefined}
                  onSelectLesson={(id) => { setSelectedLessonId(id); setSidebarOpen(false); }}
                />
              ))
            )}
          </aside>
        </div>
      </div>

      <footer className="text-center text-xs py-6" style={{ color: 'var(--c-text3)', borderTop: '1px solid var(--c-border)' }}>
        © {new Date().getFullYear()} Kairos Way · Gateway de Pagamentos
      </footer>
    </div>
  );
}

function ModuleCard({ module, selectedLessonId, onSelectLesson }: {
  module: Module;
  selectedLessonId?: string;
  onSelectLesson: (lessonId: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const showTitle = module.showModuleTitle !== false;

  return (
    <div className="crs-card overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-2 p-3 text-left hover:opacity-80 transition-opacity">
        {open ? <ChevronDown size={14} className="crs-text3" /> : <ChevronRight size={14} className="crs-text3" />}
        <div className="flex-1 min-w-0">
          {showTitle && <div className="text-sm font-semibold crs-text truncate">{module.title}</div>}
          <div className="text-[11px] crs-text3">{module.lessons.length} aula{module.lessons.length !== 1 ? 's' : ''}</div>
        </div>
      </button>

      {open && module.lessons.length > 0 && (
        <div style={{ borderTop: '1px solid var(--c-border)' }}>
          {module.lessons.map((l, i) => (
            <button
              key={l.id}
              onClick={() => onSelectLesson(l.id)}
              className={`w-full text-left crs-lesson-row ${selectedLessonId === l.id ? 'crs-lesson-active' : ''}`}
            >
              <span className="text-[10px] crs-text3 w-4 text-right flex-shrink-0">{i + 1}</span>
              <Video size={12} className="flex-shrink-0" />
              <span className="truncate flex-1">{l.title}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function LessonView({ lesson, commentsEnabled, primary, onPrev, onNext, hasPrev, hasNext }: {
  lesson: Lesson; commentsEnabled: boolean; primary: string;
  onPrev: () => void; onNext: () => void; hasPrev: boolean; hasNext: boolean;
}) {
  const embedUrl = !lesson.hideVideo && lesson.videoUrl && lesson.videoSource === 'YOUTUBE'
    ? ytEmbed(lesson.videoUrl)
    : null;

  return (
    <div className="space-y-4">
      <div className="crs-card overflow-hidden">
        {!lesson.hideVideo && lesson.videoUrl ? (
          lesson.videoSource === 'MP4_DIRECT' ? (
            <video controls src={lesson.videoUrl} className="w-full aspect-video bg-black" />
          ) : lesson.videoSource === 'YOUTUBE' && embedUrl ? (
            <iframe src={embedUrl} className="w-full aspect-video border-0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
          ) : lesson.videoSource === 'OTHER' ? (
            <iframe src={lesson.videoUrl} className="w-full aspect-video border-0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
          ) : (
            <div className="aspect-video bg-black flex items-center justify-center crs-text3 text-sm">URL de vídeo inválida</div>
          )
        ) : lesson.coverUrl ? (
          <img src={lesson.coverUrl} alt={lesson.title} className="w-full max-h-[400px] object-cover" />
        ) : (
          <div className="aspect-video bg-black flex items-center justify-center">
            <Video size={32} className="opacity-30 crs-text3" />
          </div>
        )}

        <div className="p-5 sm:p-6">
          <h2 className="text-xl sm:text-2xl font-bold crs-text">{lesson.title}</h2>
          {lesson.description && <p className="crs-text2 mt-2 whitespace-pre-line">{lesson.description}</p>}

          <div className="flex items-center justify-between gap-3 mt-5 pt-5" style={{ borderTop: '1px solid var(--c-border)' }}>
            <button onClick={onPrev} disabled={!hasPrev} className="crs-btn-ghost text-sm disabled:opacity-30">
              <ArrowLeft size={14} /> Aula anterior
            </button>
            <button onClick={onNext} disabled={!hasNext} className="crs-btn-primary text-sm disabled:opacity-30">
              Próxima aula <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {commentsEnabled && <CommentsBlock lessonId={lesson.id} primary={primary} />}
    </div>
  );
}

function CommentsBlock({ lessonId, primary }: { lessonId: string; primary: string }) {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [text, setText] = useState('');

  const { data: comments } = useQuery<any[]>({
    queryKey: ['lesson-comments', lessonId],
    queryFn : () => api.get(`/members-area/lessons/${lessonId}/comments`).then(r => r.data),
  });

  const send = useMutation({
    mutationFn: () => api.post(`/members-area/lessons/${lessonId}/comments`, { content: text }),
    onSuccess : () => { setText(''); qc.invalidateQueries({ queryKey: ['lesson-comments', lessonId] }); },
    onError   : (e: any) => toast.error(e?.response?.data?.message || 'Erro'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/members-area/comments/${id}`),
    onSuccess : () => qc.invalidateQueries({ queryKey: ['lesson-comments', lessonId] }),
    onError   : (e: any) => toast.error(e?.response?.data?.message || 'Erro'),
  });

  return (
    <div className="crs-card p-5 space-y-4">
      <h3 className="text-sm font-semibold crs-text flex items-center gap-2">
        <MessageCircle size={14} style={{ color: primary }} />
        Comentários ({(comments || []).length})
      </h3>

      <form onSubmit={(e) => { e.preventDefault(); if (text.trim()) send.mutate(); }} className="flex gap-2">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Tire uma dúvida ou compartilhe algo..."
          className="crs-input flex-1"
          maxLength={2000}
        />
        <button type="submit" disabled={!text.trim() || send.isPending} className="crs-btn-primary">
          <Send size={13} />
        </button>
      </form>

      <div className="space-y-3">
        {(comments || []).length === 0 ? (
          <p className="text-xs crs-text3 text-center py-3">Nenhum comentário ainda. Seja o primeiro!</p>
        ) : (
          (comments || []).map((c: any) => (
            <div key={c.id} className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 overflow-hidden text-white" style={{ background: primary + 'DD' }}>
                {c.user?.avatarUrl
                  ? <img src={c.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                  : c.user?.name?.slice(0, 2).toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <strong className="text-sm crs-text">{c.user?.name || 'Anônimo'}</strong>
                  <span className="text-[10px] crs-text3">{new Date(c.createdAt).toLocaleString('pt-BR')}</span>
                </div>
                <p className="text-sm crs-text2 whitespace-pre-line break-words">{c.content}</p>
              </div>
              {c.user?.id === user?.id && (
                <button onClick={() => remove.mutate(c.id)} className="crs-text3 hover:text-red-500 flex-shrink-0" title="Remover meu comentário">
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
