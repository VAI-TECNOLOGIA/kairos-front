import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';

// ── EAGER (carregam junto com o app — não vira chunk lazy) ──
import LoginPage       from '@/pages/public/LoginPage';
import AdminLayout     from '@/components/layout/AdminLayout';
import ProducerLayout  from '@/components/layout/ProducerLayout';
import AffiliateLayout from '@/components/layout/AffiliateLayout';
import CustomerLayout  from '@/components/layout/CustomerLayout';

// ── LAZY: Public pages ──
const ForgotPasswordPage    = lazy(() => import('@/pages/public/ForgotPasswordPage'));
const AffiliateRegisterPage = lazy(() => import('@/pages/public/AffiliateRegisterPage'));
const AffiliateInvitePage   = lazy(() => import('@/pages/public/AffiliateInvitePage'));
const MfaPage               = lazy(() => import('@/pages/public/MfaPage'));
const ImpersonatePage       = lazy(() => import('@/pages/public/ImpersonatePage'));
const RegisterPage          = lazy(() => import('@/pages/public/RegisterPage'));
const CheckoutPage          = lazy(() => import('@/pages/public/CheckoutPage'));
const SecurityPolicyPage    = lazy(() => import('@/pages/public/SecurityPolicy'));
const DeleteAccountPage     = lazy(() => import('@/pages/public/DeleteAccountPage'));
const DeleteDataPage        = lazy(() => import('@/pages/public/DeleteDataPage'));

// ── LAZY: Customer pages ──
const CustomerAuthPage     = lazy(() => import('@/pages/customer/CustomerAuthPage'));
const MyPurchases          = lazy(() => import('@/pages/customer/MyPurchases'));
const CustomerMarketplace  = lazy(() => import('@/pages/customer/Marketplace'));
const CoursePage           = lazy(() => import('@/pages/customer/CoursePage'));

// ── LAZY: Admin pages ──
const AdminDashboard      = lazy(() => import('@/pages/admin/Dashboard'));
const ProducersPage       = lazy(() => import('@/pages/admin/Producers'));
const KycReview           = lazy(() => import('@/pages/admin/KycReview'));
const AdminProducts       = lazy(() => import('@/pages/admin/Products'));
const OffersPage          = lazy(() => import('@/pages/admin/Offers'));
const SalesPage           = lazy(() => import('@/pages/admin/Sales'));
const AffiliatesPage      = lazy(() => import('@/pages/admin/Affiliates'));
const CoproducersPage     = lazy(() => import('@/pages/admin/Coproducers'));
const SubscriptionsPage   = lazy(() => import('@/pages/admin/Subscriptions'));
const LogisticsPage       = lazy(() => import('@/pages/admin/Logistics'));
const FinancialPage       = lazy(() => import('@/pages/admin/Financial'));
const WebhooksPage        = lazy(() => import('@/pages/admin/Webhooks'));
const ReportsPage         = lazy(() => import('@/pages/admin/Reports'));
const AuditLogPage        = lazy(() => import('@/pages/admin/AuditLog'));
const SecurityPage        = lazy(() => import('@/pages/admin/Security'));
const TestEnvironmentPage = lazy(() => import('@/pages/admin/TestEnvironment'));
const AdminFees           = lazy(() => import('@/pages/admin/Fees'));
const AdminMessages       = lazy(() => import('@/pages/admin/Messages'));
const AdminReleaseDays    = lazy(() => import('@/pages/admin/ReleaseDays'));
const FeeCalculator       = lazy(() => import('@/pages/admin/FeeCalculator'));
const AdminBalances       = lazy(() => import('@/pages/admin/Balances'));
const AdminReceivables    = lazy(() => import('@/pages/admin/Receivables'));
const AdminFeesRevenue    = lazy(() => import('@/pages/admin/FeesRevenue'));
const AdminRiskProducts   = lazy(() => import('@/pages/admin/RiskProducts'));
const AdminVai            = lazy(() => import('@/pages/admin/Vai'));
const AdminBlingResync    = lazy(() => import('@/pages/admin/BlingResync'));
const AdminAnticipation   = lazy(() => import('@/pages/admin/Anticipation'));
const AdminSpecialMessages = lazy(() => import('@/pages/admin/SpecialMessages'));
const IntegracaoBlingPublic = lazy(() => import('@/pages/public/IntegracaoBling'));

// ── LAZY: Producer pages ──
const ProducerDashboard      = lazy(() => import('@/pages/producer/Dashboard'));
const MyProducts             = lazy(() => import('@/pages/producer/Products'));
const ProductEdit            = lazy(() => import('@/pages/producer/ProductEdit'));
const ProductInfoSection     = lazy(() => import('@/pages/producer/product-sections/Info'));
const ProductOffersSection   = lazy(() => import('@/pages/producer/product-sections/Offers'));
const ProductAffiliationSection = lazy(() => import('@/pages/producer/product-sections/Affiliation'));
const ProductCouponsSection  = lazy(() => import('@/pages/producer/product-sections/Coupons'));
// Named exports do mesmo arquivo Delivery.tsx (Vite faz cache, baixa só 1x)
const ProductFilesSection         = lazy(() => import('@/pages/producer/product-sections/Delivery').then(m => ({ default: m.ProductFilesSection })));
const ProductMembersAreaSection   = lazy(() => import('@/pages/producer/product-sections/Delivery').then(m => ({ default: m.ProductMembersAreaSection })));
// Named exports do mesmo arquivo Misc.tsx
const ProductCheckoutSection      = lazy(() => import('@/pages/producer/product-sections/Misc').then(m => ({ default: m.ProductCheckoutSection })));
const ProductCoproducersSection   = lazy(() => import('@/pages/producer/product-sections/Misc').then(m => ({ default: m.ProductCoproducersSection })));
const ProductLinksSection         = lazy(() => import('@/pages/producer/product-sections/Misc').then(m => ({ default: m.ProductLinksSection })));
const ProductPixelsSection        = lazy(() => import('@/pages/producer/product-sections/Misc').then(m => ({ default: m.ProductPixelsSection })));
const OfferManager           = lazy(() => import('@/pages/producer/Offers'));
const MySales                = lazy(() => import('@/pages/producer/Sales'));
const MyAffiliates           = lazy(() => import('@/pages/producer/Affiliates'));
const MyCoproducers          = lazy(() => import('@/pages/producer/Coproducers'));
const ProducerCoproductions  = lazy(() => import('@/pages/producer/Coproductions'));
const CheckoutConfig         = lazy(() => import('@/pages/producer/Checkout'));
const MyFinancial            = lazy(() => import('@/pages/producer/Financial'));
const ProducerSettings       = lazy(() => import('@/pages/producer/Settings'));
const Milestones             = lazy(() => import('@/pages/producer/Milestones'));
const ProducerRefunds        = lazy(() => import('@/pages/producer/Refunds'));
const TrackingPixels         = lazy(() => import('@/pages/producer/TrackingPixels'));
const ProducerLogistics      = lazy(() => import('@/pages/producer/Logistics'));
const Verification           = lazy(() => import('@/pages/producer/Verification'));
const TVDashboard            = lazy(() => import('@/pages/producer/TVDashboard'));

// ── LAZY: Affiliate pages ──
const AffiliateDashboard     = lazy(() => import('@/pages/affiliate/Dashboard'));
const AffiliateMarketplace   = lazy(() => import('@/pages/affiliate/Marketplace'));
const AffiliateLinks         = lazy(() => import('@/pages/affiliate/Links'));
const MyCoupons              = lazy(() => import('@/pages/affiliate/MyCoupons'));
const AffiliateCoproductions = lazy(() => import('@/pages/affiliate/Coproductions'));
const AffiliateFinancial     = lazy(() => import('@/pages/affiliate/Financial'));
const AffiliateRanking       = lazy(() => import('@/pages/affiliate/Ranking'));
const AffiliateRefunds       = lazy(() => import('@/pages/affiliate/Refunds'));

// ── LAZY: Shared ──
const ProfilePage         = lazy(() => import('@/pages/shared/ProfilePage'));
const DashboardSettings   = lazy(() => import('@/pages/shared/DashboardSettings'));
const IntegrationsPage    = lazy(() => import('@/pages/shared/Integrations'));
const HelpCenter          = lazy(() => import('@/pages/shared/HelpCenter'));

// Loader minimalista no estilo Kairos (navy + blue)
function PageLoader() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        background: 'transparent',
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          border: '3px solid rgba(0, 85, 254, 0.2)',
          borderTopColor: '#0055FE',
          borderRadius: '50%',
          animation: 'kairos-spin 0.8s linear infinite',
        }}
      />
      <style>{`@keyframes kairos-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// Protected route wrapper
function ProtectedRoute({ role, children }: { role?: string | string[]; children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated()) return <Navigate to="/login" replace />;

  if (role) {
    const allowed = Array.isArray(role) ? role : [role];
    const isAdmin = ['ADMIN', 'STAFF'].includes(user?.role || '');
    if (!isAdmin && !allowed.includes(user?.role || '')) {
      return <Navigate to={getDefaultPath(user?.role)} replace />;
    }
  }

  return <>{children}</>;
}

function getDefaultPath(role?: string) {
  if (role === 'PRODUCER')   return '/produtor/dashboard';
  if (role === 'COPRODUCER') return '/produtor/dashboard';
  if (role === 'AFFILIATE')  return '/afiliado/dashboard';
  if (role === 'CUSTOMER')   return '/cliente/compras';
  return '/admin/dashboard';
}

export default function App() {
  const { user, isAuthenticated } = useAuthStore();
  const authAccessToken = useAuthStore(s => s.accessToken);
  const authHydrated = useAuthStore(s => s.hydrated);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    StatusBar.setBackgroundColor({ color: '#09131D' }).catch(() => {});
    StatusBar.setStyle({ style: Style.Dark }).catch(() => {});

    const handlePromise = CapApp.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        CapApp.exitApp();
      }
    });

    return () => {
      handlePromise.then(h => h.remove()).catch(() => {});
    };
  }, []);

  // Push notifications: dispara setup quando a sessão persistida hidratar com JWT,
  // não apenas no momento do login (auth.store.setAuth). Sem isso, usuários que
  // reabrem o app já logado nunca registram o FCM token.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    if (!authHydrated || !authAccessToken) return;
    import('@/lib/push-notifications')
      .then(m => {
        m.setPushJwtProvider(() => useAuthStore.getState().accessToken);
        return m.setupPushNotifications();
      })
      .catch(() => {});
  }, [authHydrated, authAccessToken]);

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* ── PUBLIC ── */}
        <Route path="/login"              element={<LoginPage />} />
        <Route path="/esqueci-senha"      element={<ForgotPasswordPage />} />
        <Route path="/mfa"                element={<MfaPage />} />
        <Route path="/auth/impersonate"   element={<ImpersonatePage />} />
        <Route path="/cadastro"           element={<RegisterPage />} />
        <Route path="/checkout/:slug"     element={<CheckoutPage />} />
        <Route path="/seja-afiliado"      element={<AffiliateRegisterPage />} />
        <Route path="/afiliar/:offerSlug"        element={<AffiliateInvitePage />} />
        <Route path="/politica-de-seguranca"    element={<SecurityPolicyPage />} />
        <Route path="/excluir-conta"            element={<DeleteAccountPage />} />
        <Route path="/excluir-dados"            element={<DeleteDataPage />} />
        <Route path="/integracao-bling"         element={<IntegracaoBlingPublic />} />

        {/* ── ADMIN ── */}
        <Route path="/admin" element={<ProtectedRoute role={['ADMIN','STAFF']}><AdminLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard"          element={<AdminDashboard />} />
          <Route path="produtores"         element={<ProducersPage />} />
          <Route path="verificacoes"       element={<KycReview />} />
          <Route path="produtos"           element={<AdminProducts />} />
          <Route path="ofertas"            element={<OffersPage />} />
          <Route path="vendas"             element={<SalesPage />} />
          <Route path="afiliados"          element={<AffiliatesPage />} />
          <Route path="coprodutores"       element={<CoproducersPage />} />
          <Route path="assinaturas"        element={<SubscriptionsPage />} />
          <Route path="logistica"          element={<LogisticsPage />} />
          <Route path="tracking"           element={<TrackingPixels />} />
          <Route path="financeiro"         element={<FinancialPage />} />
          <Route path="webhooks"           element={<WebhooksPage />} />
          <Route path="relatorios"         element={<ReportsPage />} />
          <Route path="audit-log"          element={<AuditLogPage />} />
          <Route path="seguranca"          element={<SecurityPage />} />
          <Route path="taxas"              element={<AdminFees />} />
          <Route path="prazos-liberacao"   element={<AdminReleaseDays />} />
          <Route path="mensagens"          element={<AdminMessages />} />
          <Route path="calculadora"        element={<FeeCalculator />} />
          <Route path="saldo-global"       element={<AdminBalances />} />
          <Route path="recebimentos"       element={<AdminReceivables />} />
          <Route path="receitas"           element={<AdminFeesRevenue />} />
          <Route path="risco-produtos"     element={<AdminRiskProducts />} />
          <Route path="ambiente-de-teste"  element={<TestEnvironmentPage />} />
          <Route path="vai"                element={<AdminVai />} />
          <Route path="bling-resync"       element={<AdminBlingResync />} />
          {/* <Route path="antecipacao"        element={<AdminAnticipation />} /> */}
          <Route path="mensagens-especiais" element={<AdminSpecialMessages />} />
          <Route path="perfil"             element={<ProfilePage />} />
          <Route path="integracoes"        element={<IntegrationsPage />} />
          <Route path="configurar-dashboard" element={<DashboardSettings />} />
          {/* Redirect legado */}
          <Route path="configuracoes"      element={<Navigate to="/admin/mensagens" replace />} />
        </Route>

        {/* ── TV Dashboard (standalone — sem layout) ── */}
        <Route path="/tv" element={<ProtectedRoute role={['PRODUCER','ADMIN','STAFF','AFFILIATE']}><TVDashboard /></ProtectedRoute>} />

        {/* ── PRODUTOR ── */}
        <Route path="/produtor" element={<ProtectedRoute role={['PRODUCER','COPRODUCER']}><ProducerLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard"     element={<ProducerDashboard />} />
          <Route path="produtos"      element={<MyProducts />} />
          <Route path="produtos/:id"  element={<ProductEdit />}>
            <Route index            element={<ProductInfoSection />} />
            <Route path="ofertas"   element={<ProductOffersSection />} />
            <Route path="arquivos"  element={<ProductFilesSection />} />
            <Route path="area-membros" element={<ProductMembersAreaSection />} />
            <Route path="checkout"  element={<ProductCheckoutSection />} />
            <Route path="afiliacao" element={<ProductAffiliationSection />} />
            <Route path="cupons"    element={<ProductCouponsSection />} />
            <Route path="coprodutores" element={<ProductCoproducersSection />} />
            <Route path="links"     element={<ProductLinksSection />} />
            <Route path="pixels"    element={<ProductPixelsSection />} />
          </Route>
          <Route path="ofertas"       element={<OfferManager />} />
          <Route path="vendas"        element={<MySales />} />
          <Route path="afiliados"     element={<MyAffiliates />} />
          <Route path="coprodutores"  element={<MyCoproducers />} />
          <Route path="minhas-coproducoes" element={<ProducerCoproductions />} />
          <Route path="marketplace-afiliacao" element={<AffiliateMarketplace />} />
          <Route path="minhas-afiliacoes"     element={<AffiliateLinks />} />
          <Route path="checkout"      element={<CheckoutConfig />} />
          <Route path="financeiro"    element={<MyFinancial />} />
          <Route path="configuracoes"        element={<ProducerSettings />} />
          <Route path="perfil"               element={<ProfilePage />} />
          <Route path="integracoes"          element={<IntegrationsPage />} />
          <Route path="configurar-dashboard" element={<DashboardSettings />} />
          <Route path="marcos"               element={<Milestones />} />
          <Route path="reembolsos"           element={<ProducerRefunds />} />
          <Route path="tracking"             element={<TrackingPixels />} />
          <Route path="logistica"            element={<ProducerLogistics />} />
          <Route path="verificacao"          element={<Verification />} />
          <Route path="ajuda"                element={<HelpCenter />} />
        </Route>

        {/* ── AFILIADO ── */}
        <Route path="/afiliado" element={<ProtectedRoute role={['AFFILIATE','COPRODUCER']}><AffiliateLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard"      element={<AffiliateDashboard />} />
          <Route path="ranking"        element={<AffiliateRanking />} />
          <Route path="marketplace"    element={<AffiliateMarketplace />} />
          <Route path="links"          element={<AffiliateLinks />} />
          <Route path="cupons"         element={<MyCoupons />} />
          <Route path="coproducoes"    element={<AffiliateCoproductions />} />
          <Route path="financeiro"     element={<AffiliateFinancial />} />
          {/* Rotas exclusivas para afiliado co-produtor */}
          <Route path="meus-produtos"        element={<MyProducts />} />
          <Route path="meus-produtos/:id"    element={<ProductEdit />}>
            <Route index            element={<ProductInfoSection />} />
            <Route path="ofertas"   element={<ProductOffersSection />} />
            <Route path="arquivos"  element={<ProductFilesSection />} />
            <Route path="area-membros" element={<ProductMembersAreaSection />} />
            <Route path="checkout"  element={<ProductCheckoutSection />} />
            <Route path="afiliacao" element={<ProductAffiliationSection />} />
            <Route path="cupons"    element={<ProductCouponsSection />} />
            <Route path="coprodutores" element={<ProductCoproducersSection />} />
            <Route path="links"     element={<ProductLinksSection />} />
            <Route path="pixels"    element={<ProductPixelsSection />} />
          </Route>
          <Route path="minhas-ofertas"       element={<OfferManager />} />
          <Route path="minhas-vendas"        element={<MySales />} />
          <Route path="logistica"            element={<ProducerLogistics />} />
          <Route path="perfil"               element={<ProfilePage />} />
          <Route path="integracoes"          element={<IntegrationsPage />} />
          <Route path="configurar-dashboard" element={<DashboardSettings />} />
          <Route path="reembolsos"           element={<AffiliateRefunds />} />
          <Route path="tracking"             element={<TrackingPixels />} />
          <Route path="verificacao"          element={<Verification />} />
          <Route path="ajuda"                element={<HelpCenter />} />
        </Route>

        {/* ── CURSO (shell próprio, fora do CustomerLayout) ── */}
        <Route path="/cliente/curso/:productId" element={<CoursePage />} />

        {/* ── CLIENTE ── */}
        <Route path="/cliente" element={<CustomerLayout />}>
          <Route index element={<Navigate to="marketplace" replace />} />
          <Route path="login"       element={<CustomerAuthPage />} />
          <Route path="marketplace" element={<CustomerMarketplace />} />
          <Route path="compras"     element={<MyPurchases />} />
        </Route>

        {/* ── REDIRECT ROOT ── */}
        <Route
          path="/"
          element={
            isAuthenticated()
              ? <Navigate to={getDefaultPath(user?.role)} replace />
              : <Navigate to="/login" replace />
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}