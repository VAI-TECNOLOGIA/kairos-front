import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Loading } from '@/components/ui';
import { ArrowLeft, ChevronDown, ChevronRight, Video, Lock, Send, Trash2, PlayCircle, MessageCircle } from 'lucide-react';
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
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);

  const { data: course, isLoading, error } = useQuery<Course>({
    queryKey: ['course', productId],
    queryFn : () => api.get(`/members-area/customer/products/${productId}`).then(r => r.data),
    enabled : !!productId,
    retry   : false,
  });

  const theme = course?.theme || 'dark';
  const primary = course?.primaryColor || '#0055FE';
  const accent  = course?.accentColor  || '#7C3AED';

  // Variáveis CSS personalizadas que controlam todo o visual da tela
  const themeVars = useMemo<React.CSSProperties>(() => ({
    ['--c-primary' as any]: primary,
    ['--c-accent'  as any]: accent,
    ['--c-bg'      as any]: theme === 'dark' ? '#0a0e1a' : '#f9fafb',
    ['--c-bg2'     as any]: theme === 'dark' ? '#111827' : '#ffffff',
    ['--c-bg3'     as any]: theme === 'dark' ? '#1f2937' : '#f3f4f6',
    ['--c-text'    as any]: theme === 'dark' ? '#f9fafb' : '#111827',
    ['--c-text2'   as any]: theme === 'dark' ? '#cbd5e1' : '#374151',
    ['--c-text3'   as any]: theme === 'dark' ? '#94a3b8' : '#6b7280',
    ['--c-border'  as any]: theme === 'dark' ? '#1f2937' : '#e5e7eb',
  }), [primary, accent, theme]);

  if (isLoading) return <Loading />;
  if (error) {
    return (
      <div className="card p-8 text-center">
        <Lock size={32} className="mx-auto text-text3 mb-3" />
        <h2 className="text-lg font-semibold text-text mb-1">Acesso restrito</h2>
        <p className="text-sm text-text3 mb-4">Você precisa ter comprado este curso para acessá-lo.</p>
        <button onClick={() => navigate('/cliente/compras')} className="btn-primary btn-sm">Voltar para minhas compras</button>
      </div>
    );
  }
  if (!course) return null;

  const allLessons = course.modules.flatMap(m => m.lessons);
  const currentLesson = selectedLessonId
    ? allLessons.find(l => l.id === selectedLessonId)
    : null;
  const totalLessons = allLessons.length;
  const currentIndex = currentLesson ? allLessons.findIndex(l => l.id === currentLesson.id) : -1;
  const layoutMode = course.layout || 'sidebar';

  return (
    <div style={themeVars} className="course-shell -mx-4 sm:-mx-6 -my-8">
      <style>{`
        .course-shell { background: var(--c-bg); color: var(--c-text); min-height: calc(100vh - 56px); }
        .course-shell .card-c { background: var(--c-bg2); border: 1px solid var(--c-border); border-radius: 16px; }
        .course-shell .text-t { color: var(--c-text); }
        .course-shell .text-t2 { color: var(--c-text2); }
        .course-shell .text-t3 { color: var(--c-text3); }
        .course-shell .btn-c { background: var(--c-primary); color: #fff; padding: 8px 14px; border-radius: 8px; font-weight: 500; transition: filter .15s; }
        .course-shell .btn-c:hover { filter: brightness(1.1); }
        .course-shell .lesson-active { background: color-mix(in srgb, var(--c-primary) 15%, transparent); color: var(--c-primary); border-left: 3px solid var(--c-primary); }
        .course-shell .lesson-row:hover:not(.lesson-active) { background: var(--c-bg3); }
      `}</style>

      <div className="px-4 sm:px-6 py-6 max-w-7xl mx-auto">

        <button onClick={() => navigate('/cliente/compras')} className="text-sm text-t3 hover:text-t inline-flex items-center gap-1 mb-4">
          <ArrowLeft size={14} /> Minhas compras
        </button>

        {/* Hero */}
        <header className="card-c overflow-hidden mb-6 relative">
          {course.coverUrl ? (
            <div className="aspect-[3/1] relative">
              <img src={course.coverUrl} alt={course.title} className="absolute inset-0 w-full h-full object-cover" />
              <div
                className="absolute inset-0"
                style={{ background: `linear-gradient(180deg, transparent 30%, ${theme === 'dark' ? 'rgba(10,14,26,.95)' : 'rgba(249,250,251,.95)'} 100%)` }}
              />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <h1 className="text-3xl font-bold text-t mb-1">{course.title}</h1>
                {course.description && <p className="text-t2 max-w-2xl">{course.description}</p>}
                <div className="flex items-center gap-3 mt-3 text-xs text-t3">
                  <span className="inline-flex items-center gap-1"><PlayCircle size={12} /> {totalLessons} aula{totalLessons !== 1 ? 's' : ''}</span>
                  <span>•</span>
                  <span>{course.modules.length} módulo{course.modules.length !== 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8" style={{ background: `linear-gradient(135deg, ${primary}25, ${accent}10)` }}>
              <h1 className="text-3xl font-bold text-t">{course.title}</h1>
              {course.description && <p className="text-t2 mt-2">{course.description}</p>}
              <div className="flex items-center gap-3 mt-3 text-xs text-t3">
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
              <div className="card-c p-12 text-center">
                <PlayCircle size={48} className="mx-auto text-t3 mb-3 opacity-50" style={{ color: primary, opacity: 0.6 }} />
                <h2 className="text-lg font-semibold text-t mb-1">Bem-vindo ao curso!</h2>
                <p className="text-sm text-t3">Selecione uma aula no menu {layoutMode === 'sidebar' ? 'ao lado' : 'abaixo'} para começar.</p>
                {totalLessons > 0 && (
                  <button
                    onClick={() => setSelectedLessonId(allLessons[0].id)}
                    className="btn-c mt-5 inline-flex items-center gap-1.5"
                  >
                    <PlayCircle size={14} /> Começar agora
                  </button>
                )}
              </div>
            )}
          </main>

          <aside className="space-y-2">
            {course.modules.length === 0 ? (
              <div className="card-c p-4 text-sm text-t3 text-center">Nenhum módulo disponível ainda.</div>
            ) : (
              course.modules.map(mod => (
                <ModuleCard
                  key={mod.id}
                  module={mod}
                  selectedLessonId={selectedLessonId || undefined}
                  onSelectLesson={setSelectedLessonId}
                />
              ))
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

function ModuleCard({ module, selectedLessonId, onSelectLesson }: {
  module: Module;
  selectedLessonId?: string;
  onSelectLesson: (lessonId: string) => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="card-c overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-2 p-3 text-left hover:opacity-80 transition-opacity">
        {open ? <ChevronDown size={14} className="text-t3" /> : <ChevronRight size={14} className="text-t3" />}
        <div className="flex-1 min-w-0">
          {module.showModuleTitle !== false && <div className="text-sm font-semibold text-t truncate">{module.title}</div>}
          <div className="text-[11px] text-t3">{module.lessons.length} aula{module.lessons.length !== 1 ? 's' : ''}</div>
        </div>
      </button>

      {open && module.lessons.length > 0 && (
        <div style={{ borderTop: '1px solid var(--c-border)' }}>
          {module.lessons.map((l, i) => (
            <button
              key={l.id}
              onClick={() => onSelectLesson(l.id)}
              className={`lesson-row w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors ${
                selectedLessonId === l.id ? 'lesson-active font-medium' : 'text-t2'
              }`}
              style={{ paddingLeft: selectedLessonId === l.id ? '13px' : '12px' }}
            >
              <span className="text-[10px] text-t3 w-4 text-right flex-shrink-0">{i + 1}</span>
              <Video size={12} className="flex-shrink-0" />
              <span className="truncate">{l.title}</span>
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
      <div className="card-c overflow-hidden">
        {!lesson.hideVideo && lesson.videoUrl ? (
          lesson.videoSource === 'MP4_DIRECT' ? (
            <video controls src={lesson.videoUrl} className="w-full aspect-video bg-black" />
          ) : lesson.videoSource === 'YOUTUBE' && embedUrl ? (
            <iframe
              src={embedUrl}
              className="w-full aspect-video border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : lesson.videoSource === 'OTHER' ? (
            <iframe
              src={lesson.videoUrl}
              className="w-full aspect-video border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="aspect-video bg-black flex items-center justify-center text-t3 text-sm">
              URL de vídeo inválida
            </div>
          )
        ) : lesson.coverUrl ? (
          <img src={lesson.coverUrl} alt={lesson.title} className="w-full max-h-[400px] object-cover" />
        ) : (
          <div className="aspect-video bg-black flex items-center justify-center text-t3 text-sm">
            <Video size={32} className="opacity-30" />
          </div>
        )}

        <div className="p-5 sm:p-6">
          <h2 className="text-xl sm:text-2xl font-bold text-t">{lesson.title}</h2>
          {lesson.description && <p className="text-t2 mt-2 whitespace-pre-line">{lesson.description}</p>}

          <div className="flex items-center justify-between gap-3 mt-5 pt-5" style={{ borderTop: '1px solid var(--c-border)' }}>
            <button onClick={onPrev} disabled={!hasPrev} className="text-sm text-t2 hover:text-t inline-flex items-center gap-1 disabled:opacity-30">
              <ArrowLeft size={14} /> Aula anterior
            </button>
            <button onClick={onNext} disabled={!hasNext} className="btn-c inline-flex items-center gap-1 text-sm disabled:opacity-30">
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
    onSuccess : () => {
      setText('');
      qc.invalidateQueries({ queryKey: ['lesson-comments', lessonId] });
    },
    onError   : (e: any) => toast.error(e?.response?.data?.message || 'Erro'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/members-area/comments/${id}`),
    onSuccess : () => qc.invalidateQueries({ queryKey: ['lesson-comments', lessonId] }),
    onError   : (e: any) => toast.error(e?.response?.data?.message || 'Erro'),
  });

  return (
    <div className="card-c p-5 space-y-4">
      <h3 className="text-sm font-semibold text-t flex items-center gap-2">
        <MessageCircle size={14} style={{ color: primary }} />
        Comentários ({(comments || []).length})
      </h3>

      <form
        onSubmit={(e) => { e.preventDefault(); if (text.trim()) send.mutate(); }}
        className="flex gap-2"
      >
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Tire uma dúvida ou compartilhe algo..."
          className="input flex-1"
          maxLength={2000}
          style={{ background: 'var(--c-bg3)', borderColor: 'var(--c-border)', color: 'var(--c-text)' }}
        />
        <button type="submit" disabled={!text.trim() || send.isPending} className="btn-c inline-flex items-center disabled:opacity-50">
          <Send size={13} />
        </button>
      </form>

      <div className="space-y-3">
        {(comments || []).length === 0 ? (
          <p className="text-xs text-t3 text-center py-3">Nenhum comentário ainda. Seja o primeiro!</p>
        ) : (
          (comments || []).map((c: any) => (
            <div key={c.id} className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 overflow-hidden text-white" style={{ background: primary + '99' }}>
                {c.user?.avatarUrl
                  ? <img src={c.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                  : c.user?.name?.slice(0, 2).toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <strong className="text-sm text-t">{c.user?.name || 'Anônimo'}</strong>
                  <span className="text-[10px] text-t3">{new Date(c.createdAt).toLocaleString('pt-BR')}</span>
                </div>
                <p className="text-sm text-t2 whitespace-pre-line break-words">{c.content}</p>
              </div>
              {c.user?.id === user?.id && (
                <button
                  onClick={() => remove.mutate(c.id)}
                  className="text-t3 hover:text-red flex-shrink-0"
                  title="Remover meu comentário"
                >
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
