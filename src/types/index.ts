// ── COMMON ──────────────────────────────────────
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// ── AUTH ─────────────────────────────────────────
export interface LoginResponse {
  accessToken?: string;
  refreshToken?: string;
  requiresMfa?: boolean;
  tempToken?: string;
  user?: import('@/stores/auth.store').AuthUser;
}

// ── PRODUCER ─────────────────────────────────────
export interface Producer {
  id: string;
  userId: string;
  companyName?: string;
  kycStatus: 'PENDING' | 'DOCUMENTS_SENT' | 'APPROVED' | 'REJECTED';
  isActive: boolean;
  approvedAt?: string;
  createdAt: string;
  user: { name: string; email: string; phone?: string };
}

// ── PRODUCT ──────────────────────────────────────
export interface Product {
  id: string;
  producerId: string;
  name: string;
  description?: string;
  type: 'PHYSICAL' | 'DIGITAL' | 'SUBSCRIPTION' | 'BUNDLE';
  status: 'PENDING' | 'REVIEW' | 'APPROVED' | 'REJECTED' | 'INACTIVE';
  imageUrl?: string;
  category?: string;
  isActive: boolean;
  createdAt: string;
  offers?: Offer[];
}

// ── OFFER ────────────────────────────────────────
export interface Offer {
  id: string;
  productId: string;
  name: string;
  slug: string;
  priceCents: number;
  type: 'STANDARD' | 'UPSELL' | 'ORDERBUMP' | 'SUBSCRIPTION';
  isActive: boolean;
  splitRules?: SplitRule[];
  product?: Pick<Product, 'name' | 'type'>;
}

// ── SPLIT ────────────────────────────────────────
export interface SplitRule {
  id: string;
  offerId: string;
  recipientType: 'PLATFORM' | 'PRODUCER' | 'COPRODUCER' | 'AFFILIATE';
  recipientId?: string;
  basisPoints: number;
  description?: string;
  isActive: boolean;
}

// ── ORDER ────────────────────────────────────────
export interface Order {
  id: string;
  offerId: string;
  customerEmail?: string;
  customerName?: string;
  amountCents: number;
  status: 'PENDING' | 'PROCESSING' | 'APPROVED' | 'REJECTED' | 'REFUNDED' | 'CHARGEBACK';
  paymentMethod?: string;
  acquirer?: string;
  createdAt: string;
  approvedAt?: string;
  offer?: { product?: { name: string } };
  affiliate?: { user: { name: string } };
}

// ── SUBSCRIPTION ─────────────────────────────────
export interface Subscription {
  id: string;
  offerId: string;
  customerEmail: string;
  customerName?: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';
  cycle: string;
  priceCents: number;
  nextChargeAt: string;
  retryCount: number;
  createdAt: string;
}

// ── AFFILIATE ────────────────────────────────────
export interface Affiliate {
  id: string;
  userId: string;
  code: string;
  isActive: boolean;
  createdAt: string;
  user: { name: string; email: string };
}

// ── WITHDRAWAL ───────────────────────────────────
export interface Withdrawal {
  id: string;
  userId: string;
  amountCents: number;
  pixKey: string;
  status: 'PENDING' | 'PROCESSING' | 'PAID' | 'FAILED';
  createdAt: string;
  processedAt?: string;
}

// ── AUDIT LOG ────────────────────────────────────
export interface AuditLog {
  id: string;
  userId?: string;
  ip?: string;
  action: string;
  resource?: string;
  details?: Record<string, unknown>;
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  createdAt: string;
  user?: { name: string; email: string; role: string };
}

// ── WEBHOOK ──────────────────────────────────────
export interface WebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}
