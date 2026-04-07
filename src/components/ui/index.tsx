import { ReactNode } from 'react';
import { cn, formatBRL, bpsToPct, RECIPIENT_COLOR, RECIPIENT_LABEL } from '@/lib/utils';
import { X } from 'lucide-react';
import type { SplitRule } from '@/types';

// ── STAT CARD ──────────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: string | number;
  change?: string;
  changeUp?: boolean;
  icon?: ReactNode;
  accent?: string;
  sub?: string;
}
export function StatCard({ label, value, change, changeUp, icon, accent, sub }: StatCardProps) {
  return (
    <div className={cn('stat-card', accent && `border-l-2 border-l-[${accent}]`)}>
      <div className="flex items-center justify-between">
        <span className="stat-label">{label}</span>
        {icon && <span className="text-text3">{icon}</span>}
      </div>
      <div className="stat-value">{value}</div>
      {sub && <div className="text-xs text-text3">{sub}</div>}
      {change && (
        <div className={changeUp ? 'stat-change-up' : 'stat-change-down'}>
          {changeUp ? '↑' : '↓'} {change}
        </div>
      )}
    </div>
  );
}

// ── PAGE HEADER ─────────────────────────────────────────────────────
interface PageHeaderProps {
  title: string;
  sub?: string;
  actions?: ReactNode;
}
export function PageHeader({ title, sub, actions }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="page-title">{title}</h1>
        {sub && <p className="page-sub">{sub}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

// ── MODAL ───────────────────────────────────────────────────────────
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}
export function Modal({ open, onClose, title, children, footer, size = 'md' }: ModalProps) {
  if (!open) return null;
  const sizeMap = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={cn('modal', sizeMap[size])} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="font-semibold text-text">{title}</span>
          <button onClick={onClose} className="btn-ghost btn-sm p-1"><X size={16} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

// ── SPLIT BAR ───────────────────────────────────────────────────────
interface SplitBarProps {
  rules      : SplitRule[];
  priceCents?: number;  // preço da oferta para calcular valores reais
  showLabels?: boolean;
}
export function SplitBarVisual({ rules, priceCents, showLabels = true }: SplitBarProps) {
  const colorMap: Record<string, string> = {
    PLATFORM:   '#7C3AED',
    PRODUCER:   '#0055FE',
    COPRODUCER: '#00C9A7',
    AFFILIATE:  '#F59E0B',
  };
  return (
    <div>
      <div className="split-bar h-3 rounded-full overflow-hidden flex gap-0.5 mb-2">
        {rules.map((r) => (
          <div
            key={r.id}
            style={{ width: `${r.basisPoints / 100}%`, background: colorMap[r.recipientType] }}
            title={`${RECIPIENT_LABEL[r.recipientType]}: ${bpsToPct(r.basisPoints)}%`}
          />
        ))}
      </div>
      {showLabels && (
        <div className="flex flex-wrap gap-2">
          {rules.map((r) => (
            <div key={r.id} className="flex items-center gap-1 text-xs text-text2">
              <span className="w-2 h-2 rounded-sm" style={{ background: colorMap[r.recipientType] }} />
              <span>{RECIPIENT_LABEL[r.recipientType]}</span>
              <span className="font-semibold text-text">{bpsToPct(r.basisPoints)}%</span>
              {r.basisPoints > 0 && priceCents && <span className="text-text3">= {formatBRL(Math.round(priceCents * r.basisPoints / 10000))}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── EMPTY STATE ──────────────────────────────────────────────────────
interface EmptyProps { icon?: ReactNode; title: string; sub?: string; action?: ReactNode; }
export function EmptyState({ icon, title, sub, action }: EmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && <div className="text-text3 mb-4">{icon}</div>}
      <div className="text-base font-semibold text-text2">{title}</div>
      {sub && <div className="text-sm text-text3 mt-1 max-w-xs">{sub}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ── LOADING ──────────────────────────────────────────────────────────
export function Loading({ text = 'Carregando...' }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      <span className="text-sm text-text3">{text}</span>
    </div>
  );
}

// ── TAB NAV ──────────────────────────────────────────────────────────
interface TabNavProps {
  tabs: { id: string; label: string; badge?: string | number }[];
  active: string;
  onChange: (id: string) => void;
}
export function TabNav({ tabs, active, onChange }: TabNavProps) {
  return (
    <div className="tab-nav">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={cn('tab-btn', active === t.id && 'active')}
        >
          {t.label}
          {t.badge !== undefined && (
            <span className={cn('ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full',
              active === t.id ? 'bg-accent/20 text-accent' : 'bg-bg3 text-text3'
            )}>{t.badge}</span>
          )}
        </button>
      ))}
    </div>
  );
}

// ── CONFIRM DIALOG ──────────────────────────────────────────────────
interface ConfirmProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}
export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirmar', danger }: ConfirmProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className={danger ? 'btn-danger' : 'btn-primary'} onClick={() => { onConfirm(); onClose(); }}>
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm text-text2">{message}</p>
    </Modal>
  );
}

// ── MONEY DISPLAY ───────────────────────────────────────────────────
export function Money({ cents, className }: { cents: number; className?: string }) {
  return <span className={className}>{formatBRL(cents)}</span>;
}