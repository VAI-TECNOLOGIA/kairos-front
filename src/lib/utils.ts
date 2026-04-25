import { clsx, type ClassValue } from 'clsx';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/** Formata centavos para R$ */
export function formatBRL(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100);
}

/** Formata data */
export function formatDate(date: string | Date, fmt = 'dd/MM/yyyy'): string {
  return format(new Date(date), fmt, { locale: ptBR });
}

export function formatDateTime(date: string | Date): string {
  return format(new Date(date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}

export function timeAgo(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { locale: ptBR, addSuffix: true });
}

/** Formata data para exibição em duas linhas: relativa + absoluta */
export function dateRelAbs(date: string | Date | null | undefined): { rel: string; abs: string } | null {
  if (!date) return null;
  return { rel: timeAgo(date), abs: formatDateTime(date) };
}

/** Gera link wa.me a partir de telefone (BR). Aceita +55, espaços, parênteses, traços. */
export function whatsappLink(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) return null;
  const withCountry = digits.startsWith('55') ? digits : `55${digits}`;
  return `https://wa.me/${withCountry}`;
}

/** Converte basis points para porcentagem: 2000 → 20.00 */
export function bpsToPct(bps: number): string {
  return (bps / 100).toFixed(2);
}

/** Trunca texto */
export function truncate(str: string, maxLen = 40): string {
  return str.length > maxLen ? str.slice(0, maxLen) + '…' : str;
}

/** Status badge variant */
export function orderStatusVariant(status: string): string {
  const map: Record<string, string> = {
    APPROVED:   'badge-green',
    PENDING:    'badge-amber',
    PROCESSING: 'badge-blue',
    REJECTED:   'badge-red',
    REFUNDED:   'badge-gray',
    CHARGEBACK: 'badge-red',
    CANCELLED:  'badge-gray',
  };
  return map[status] || 'badge-gray';
}

export function kycStatusVariant(status: string): string {
  const map: Record<string, string> = {
    APPROVED:         'badge-green',
    PENDING:          'badge-amber',
    DOCUMENTS_SENT:   'badge-blue',
    REJECTED:         'badge-red',
  };
  return map[status] || 'badge-gray';
}

export function productStatusVariant(status: string): string {
  const map: Record<string, string> = {
    APPROVED:  'badge-green',
    PENDING:   'badge-amber',
    REVIEW:    'badge-blue',
    REJECTED:  'badge-red',
    INACTIVE:  'badge-gray',
  };
  return map[status] || 'badge-gray';
}

/** Formata número compacto: 1234567 → 1.2M */
export function formatCompact(n: number): string {
  return new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}

/** Tradução de enums */
export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  PIX: 'Pix', CREDIT_CARD: 'Cartão de Crédito', DEBIT_CARD: 'Cartão de Débito', BOLETO: 'Boleto',
};
export const SUB_CYCLE_LABEL: Record<string, string> = {
  WEEKLY: 'Semanal', BIWEEKLY: 'Quinzenal', MONTHLY: 'Mensal',
  QUARTERLY: 'Trimestral', SEMIANNUAL: 'Semestral', ANNUAL: 'Anual',
};
export const PRODUCT_TYPE_LABEL: Record<string, string> = {
  PHYSICAL: 'Físico', DIGITAL: 'Digital', SUBSCRIPTION: 'Assinatura', BUNDLE: 'Bundle',
};
export const RECIPIENT_LABEL: Record<string, string> = {
  PLATFORM: 'Plataforma', PRODUCER: 'Produtor', COPRODUCER: 'Produtor', AFFILIATE: 'Afiliado',
};
export const RECIPIENT_COLOR: Record<string, string> = {
  PLATFORM:   'bg-purple',
  PRODUCER:   'bg-accent',
  COPRODUCER: 'bg-green',
  AFFILIATE:  'bg-amber',
};
