import { useRef, useEffect, useCallback, useState } from 'react';
import {
  Bold, Italic, Underline, List, ListOrdered,
  AlignLeft, AlignCenter, Link2, Trash2, Heading2,
} from 'lucide-react';

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

export function sanitizeHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '')
    .replace(/javascript:/gi, '');
}

export function RichTextEditor({ value, onChange, placeholder = 'Digite a mensagem...', minHeight = 200 }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isEmpty, setIsEmpty] = useState(!value);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = value || '';
      setIsEmpty(!value);
    }
  }, []); // only on mount

  const exec = useCallback((cmd: string, val?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      onChange(html);
      setIsEmpty(!html || html === '<br>');
    }
  }, [onChange]);

  const handleInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      onChange(html);
      setIsEmpty(!html || html === '<br>');
    }
  };

  const insertLink = () => {
    const url = prompt('URL do link (ex: https://exemplo.com):');
    if (url) exec('createLink', url);
  };

  const clear = () => {
    if (editorRef.current) {
      editorRef.current.innerHTML = '';
      onChange('');
      setIsEmpty(true);
    }
  };

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-bg focus-within:border-accent/50 transition-colors">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border bg-bg2 flex-wrap">
        <Btn onClick={() => exec('bold')}                 title="Negrito (Ctrl+B)">      <Bold         size={13} /></Btn>
        <Btn onClick={() => exec('italic')}               title="Itálico (Ctrl+I)">     <Italic       size={13} /></Btn>
        <Btn onClick={() => exec('underline')}            title="Sublinhado (Ctrl+U)">  <Underline    size={13} /></Btn>
        <Sep />
        <Btn onClick={() => exec('formatBlock', 'h2')}   title="Título">               <Heading2     size={13} /></Btn>
        <Btn onClick={() => exec('formatBlock', 'p')}    title="Parágrafo">            <span className="text-[11px] font-bold leading-none">¶</span></Btn>
        <Sep />
        <Btn onClick={() => exec('insertUnorderedList')} title="Lista">               <List         size={13} /></Btn>
        <Btn onClick={() => exec('insertOrderedList')}   title="Lista numerada">      <ListOrdered  size={13} /></Btn>
        <Sep />
        <Btn onClick={() => exec('justifyLeft')}         title="Alinhar esquerda">    <AlignLeft    size={13} /></Btn>
        <Btn onClick={() => exec('justifyCenter')}       title="Centralizar">         <AlignCenter  size={13} /></Btn>
        <Sep />
        <Btn onClick={insertLink}                        title="Inserir link">        <Link2        size={13} /></Btn>
        <Btn onClick={clear}                             title="Limpar tudo">         <Trash2       size={13} /></Btn>
      </div>

      {/* Área de edição */}
      <div className="relative">
        {isEmpty && (
          <div className="absolute top-3 left-4 text-text3 text-sm pointer-events-none select-none">
            {placeholder}
          </div>
        )}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onFocus={() => setIsEmpty(false)}
          onBlur={() => {
            if (editorRef.current) {
              const t = editorRef.current.innerText.trim();
              setIsEmpty(!t);
            }
          }}
          className="outline-none px-4 py-3 text-sm text-text leading-relaxed rich-content"
          style={{ minHeight }}
        />
      </div>
    </div>
  );
}

function Btn({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      className="w-7 h-7 flex items-center justify-center rounded-md text-text2 hover:bg-bg3 hover:text-text transition-colors"
    >
      {children}
    </button>
  );
}

function Sep() {
  return <div className="w-px h-4 bg-border mx-1 flex-shrink-0" />;
}
