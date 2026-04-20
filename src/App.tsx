import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';

// Public pages
import LoginPage               from '@/pages/public/LoginPage';
import AffiliateRegisterPage  from '@/pages/public/AffiliateRegisterPage';
import MfaPage        from '@/pages/public/MfaPage';
import RegisterPage   from '@/pages/public/RegisterPage';
import CheckoutPage   from '@/pages/public/CheckoutPage';

// Layouts
import AdminLayout     from '@/components/layout/AdminLayout';
import ProducerLayout  from '@/components/layout/ProducerLayout';
import AffiliateLayout from '@/components/layout/AffiliateLayout';
import CustomerLayout  from '@/components/layout/CustomerLayout';

// Customer pages
import CustomerAuthPage from '@/pages/customer/CustomerAuthPage';
import MyPurchases      from '@/pages/customer/MyPurchases';
import CustomerMarketplace from '@/pages/customer/Marketplace';

// Admin pages
import AdminDashboard      from '@/pages/admin/Dashboard';
import ProducersPage       from '@/pages/admin/Producers';
import AdminProducts       from '@/pages/admin/Products';
import OffersPage          from '@/pages/admin/Offers';
import SalesPage           from '@/pages/admin/Sales';
import AffiliatesPage      from '@/pages/admin/Affiliates';
import CoproducersPage     from '@/pages/admin/Coproducers';
import SubscriptionsPage   from '@/pages/admin/Subscriptions';
import LogisticsPage       from '@/pages/admin/Logistics';
import FinancialPage       from '@/pages/admin/Financial';
import WebhooksPage        from '@/pages/admin/Webhooks';
import ReportsPage         from '@/pages/admin/Reports';
import AuditLogPage        from '@/pages/admin/AuditLog';
import SecurityPage        from '@/pages/admin/Security';
import TestEnvironmentPage from '@/pages/admin/TestEnvironment';
import AdminSettings       from '@/pages/admin/Settings';

// Producer pages
import ProducerDashboard from '@/pages/producer/Dashboard';
import MyProducts        from '@/pages/producer/Products';
import OfferManager      from '@/pages/producer/Offers';
import MySales           from '@/pages/producer/Sales';
import MyAffiliates      from '@/pages/producer/Affiliates';
import MyCoproducers     from '@/pages/producer/Coproducers';
import CheckoutConfig    from '@/pages/producer/Checkout';
import MyFinancial       from '@/pages/producer/Financial';
import ProducerSettings  from '@/pages/producer/Settings';
import IntegrationsPage  from '@/pages/producer/Integrations';
import Milestones        from '@/pages/producer/Milestones';
import ProducerRefunds   from '@/pages/producer/Refunds';
import TrackingPixels    from '@/pages/producer/TrackingPixels';
import ProducerLogistics from '@/pages/producer/Logistics';
import TVDashboard       from '@/pages/producer/TVDashboard';

// Affiliate pages
import AffiliateDashboard   from '@/pages/affiliate/Dashboard';
import AffiliateMarketplace from '@/pages/affiliate/Marketplace';
import AffiliateLinks       from '@/pages/affiliate/Links';
import AffiliateFinancial   from '@/pages/affiliate/Financial';
import AffiliateRanking     from '@/pages/affiliate/Ranking';
import AffiliateRefunds     from '@/pages/affiliate/Refunds';

// Shared
import ProfilePage          from '@/pages/shared/ProfilePage';
import DashboardSettings    from '@/pages/shared/DashboardSettings';

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

  return (
    <Routes>
      {/* ── PUBLIC ── */}
      <Route path="/login"              element={<LoginPage />} />
      <Route path="/mfa"                element={<MfaPage />} />
      <Route path="/cadastro"           element={<RegisterPage />} />
      <Route path="/checkout/:slug"     element={<CheckoutPage />} />
      <Route path="/seja-afiliado"      element={<AffiliateRegisterPage />} />

      {/* ── ADMIN ── */}
      <Route path="/admin" element={<ProtectedRoute role={['ADMIN','STAFF']}><AdminLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard"          element={<AdminDashboard />} />
        <Route path="produtores"         element={<ProducersPage />} />
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
        <Route path="configuracoes"      element={<AdminSettings />} />
        <Route path="ambiente-de-teste"  element={<TestEnvironmentPage />} />
        <Route path="perfil"             element={<ProfilePage />} />
        <Route path="configurar-dashboard" element={<DashboardSettings />} />
      </Route>

      {/* ── TV Dashboard (standalone — sem layout) ── */}
      <Route path="/tv" element={<ProtectedRoute role={['PRODUCER','ADMIN','STAFF','AFFILIATE']}><TVDashboard /></ProtectedRoute>} />

      {/* ── PRODUTOR ── */}
      <Route path="/produtor" element={<ProtectedRoute role={['PRODUCER','COPRODUCER']}><ProducerLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard"     element={<ProducerDashboard />} />
        <Route path="produtos"      element={<MyProducts />} />
        <Route path="ofertas"       element={<OfferManager />} />
        <Route path="vendas"        element={<MySales />} />
        <Route path="afiliados"     element={<MyAffiliates />} />
        <Route path="coprodutores"  element={<MyCoproducers />} />
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
      </Route>

      {/* ── AFILIADO ── */}
      <Route path="/afiliado" element={<ProtectedRoute role={['AFFILIATE','COPRODUCER']}><AffiliateLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard"      element={<AffiliateDashboard />} />
        <Route path="ranking"        element={<AffiliateRanking />} />
        <Route path="marketplace"    element={<AffiliateMarketplace />} />
        <Route path="links"          element={<AffiliateLinks />} />
        <Route path="financeiro"     element={<AffiliateFinancial />} />
        {/* Rotas exclusivas para afiliado co-produtor */}
        <Route path="meus-produtos"        element={<MyProducts />} />
        <Route path="minhas-ofertas"       element={<OfferManager />} />
        <Route path="perfil"               element={<ProfilePage />} />
        <Route path="configurar-dashboard" element={<DashboardSettings />} />
        <Route path="reembolsos"           element={<AffiliateRefunds />} />
        <Route path="tracking"             element={<TrackingPixels />} />
      </Route>

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
  );
}