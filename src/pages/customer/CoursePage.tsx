import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Loading } from '@/components/ui';
import { ArrowLeft, ChevronDown, ChevronRight, Video, Lock, Send, Trash2 } from 'lucide-react';
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
  modules: Module[];
};

function ytEmbed(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([\w-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

export default function CoursePage() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const [selectedLesson, setSelectedLesson] = useState<{ moduleId: string; lessonId: string } | null>(null);

  const { data: course, isLoading, error } = useQuery<Course>({
    queryKey: ['course', productId],
    queryFn : () => api.get(`/members-area/customer/products/${productId}`).then(r => r.data),
    enabled : !!productId,
    retry   : false,
  });

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

  const allLessons = course.modules.flatMap(m => m.lessons.map(l => ({ moduleId: m.id, lesson: l })));
  const currentLesson = selectedLesson
    ? allLessons.find(x => x.lesson.id === selectedLesson.lessonId)?.lesson
    : null;

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/cliente/compras')} className="text-sm text-text3 hover:text-text inline-flex items-center gap-1">
        <ArrowLeft size={14} /> Voltar para minhas compras
      </button>

      <header>
        {course.coverUrl && (
          <div className="rounded-xl overflow-hidden mb-4 max-h-[260px]">
            <img src={course.coverUrl} alt={course.title} className="w-full object-cover" />
          </div>
        )}
        <h1 className="text-2xl font-bold text-text">{course.title}</h1>
        {course.description && <p className="text-text2 mt-2 whitespace-pre-line">{course.description}</p>}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Main: lesson selecionada ou intro */}
        <main>
          {currentLesson ? (
            <LessonView lesson={currentLesson} commentsEnabled={course.commentsEnabled} />
          ) : (
            <div className="card p-6 text-center text-text3">
              <Video size={32} className="mx-auto opacity-40 mb-2" />
              <p className="text-sm">Selecione uma aula no menu ao lado para começar.</p>
            </div>
          )}
        </main>

        {/* Sidebar: módulos */}
        <aside className="space-y-2">
          {course.modules.length === 0 ? (
            <div className="card p-4 text-sm text-text3 text-center">Nenhum módulo disponível ainda.</div>
          ) : (
            course.modules.map(mod => (
              <ModuleCard
                key={mod.id}
                module={mod}
                selectedLessonId={selectedLesson?.lessonId}
                onSelectLesson={(lessonId) => setSelectedLesson({ moduleId: mod.id, lessonId })}
              />
            ))
          )}
        </aside>
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
    <div className="card overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-2 p-3 text-left hover:bg-bg3/50 transition-colors">
        {open ? <ChevronDown size={14} className="text-text3" /> : <ChevronRight size={14} className="text-text3" />}
        <div className="flex-1 min-w-0">
          {module.showModuleTitle && <div className="text-sm font-semibold text-text truncate">{module.title}</div>}
          <div className="text-[11px] text-text3">{module.lessons.length} aula{module.lessons.length !== 1 ? 's' : ''}</div>
        </div>
      </button>

      {open && module.lessons.length > 0 && (
        <div className="border-t border-border">
          {module.lessons.map(l => (
            <button
              key={l.id}
              onClick={() => onSelectLesson(l.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                selectedLessonId === l.id
                  ? 'bg-accent/10 text-accent font-medium'
                  : 'text-text2 hover:bg-bg3/50 hover:text-text'
              }`}
            >
              <Video size={12} className="flex-shrink-0" />
              <span className="truncate">{l.title}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function LessonView({ lesson, commentsEnabled }: { lesson: Lesson; commentsEnabled: boolean }) {
  // Decide o player: YouTube → embed, MP4 → tag video, OTHER → iframe genérico (URL fornecida pelo produtor)
  const embedUrl = !lesson.hideVideo && lesson.videoUrl && lesson.videoSource === 'YOUTUBE'
    ? ytEmbed(lesson.videoUrl)
    : null;

  return (
    <div className="space-y-4">
      <div className="card overflow-hidden">
        {!lesson.hideVideo && lesson.videoUrl ? (
          lesson.videoSource === 'MP4_DIRECT' ? (
            <video controls src={lesson.videoUrl} className="w-full aspect-video bg-black" />
          ) : lesson.videoSource === 'YOUTUBE' && embedUrl ? (
            <iframe
              src={embedUrl}
              className="w-full aspect-video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : lesson.videoSource === 'OTHER' ? (
            <iframe
              src={lesson.videoUrl}
              className="w-full aspect-video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="aspect-video bg-bg3 flex items-center justify-center text-text3 text-sm">
              URL de vídeo inválida
            </div>
          )
        ) : lesson.coverUrl ? (
          <img src={lesson.coverUrl} alt={lesson.title} className="w-full max-h-[400px] object-cover" />
        ) : null}

        <div className="p-5">
          <h2 className="text-xl font-bold text-text">{lesson.title}</h2>
          {lesson.description && <p className="text-text2 mt-2 whitespace-pre-line">{lesson.description}</p>}
        </div>
      </div>

      {commentsEnabled && <CommentsBlock lessonId={lesson.id} />}
    </div>
  );
}

function CommentsBlock({ lessonId }: { lessonId: string }) {
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
    <div className="card p-4 space-y-3">
      <h3 className="text-sm font-semibold text-text">Comentários</h3>

      <form
        onSubmit={(e) => { e.preventDefault(); if (text.trim()) send.mutate(); }}
        className="flex gap-2"
      >
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Escreva um comentário..."
          className="input flex-1"
          maxLength={2000}
        />
        <button type="submit" disabled={!text.trim() || send.isPending} className="btn-primary btn-sm">
          <Send size={13} />
        </button>
      </form>

      <div className="space-y-3">
        {(comments || []).length === 0 ? (
          <p className="text-xs text-text3 text-center py-3">Nenhum comentário ainda. Seja o primeiro!</p>
        ) : (
          (comments || []).map((c: any) => (
            <div key={c.id} className="flex gap-3 items-start">
              <div className="w-8 h-8 bg-accent/20 rounded-full flex items-center justify-center text-accent text-xs font-bold flex-shrink-0 overflow-hidden">
                {c.user?.avatarUrl
                  ? <img src={c.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                  : c.user?.name?.slice(0, 2).toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <strong className="text-sm text-text">{c.user?.name || 'Anônimo'}</strong>
                  <span className="text-[10px] text-text3">{new Date(c.createdAt).toLocaleString('pt-BR')}</span>
                </div>
                <p className="text-sm text-text2 whitespace-pre-line break-words">{c.content}</p>
              </div>
              {c.user?.id === user?.id && (
                <button
                  onClick={() => remove.mutate(c.id)}
                  className="text-text3 hover:text-red flex-shrink-0"
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
