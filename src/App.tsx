import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';

// Public pages
import LoginPage      from '@/pages/public/LoginPage';
import MfaPage        from '@/pages/public/MfaPage';
import RegisterPage   from '@/pages/public/RegisterPage';
import CheckoutPage   from '@/pages/public/CheckoutPage';

// Layouts
import AdminLayout    from '@/components/layout/AdminLayout';
import ProducerLayout from '@/components/layout/ProducerLayout';

// Admin pages
import AdminDashboard   from '@/pages/admin/Dashboard';
import ProducersPage    from '@/pages/admin/Producers';
import AdminProducts    from '@/pages/admin/Products';
import OffersPage       from '@/pages/admin/Offers';
import SalesPage        from '@/pages/admin/Sales';
import AffiliatesPage   from '@/pages/admin/Affiliates';
import CoproducersPage  from '@/pages/admin/Coproducers';
import SubscriptionsPage from '@/pages/admin/Subscriptions';
import LogisticsPage    from '@/pages/admin/Logistics';
import FinancialPage    from '@/pages/admin/Financial';
import WebhooksPage     from '@/pages/admin/Webhooks';
import ReportsPage      from '@/pages/admin/Reports';
import AuditLogPage     from '@/pages/admin/AuditLog';
import SecurityPage     from '@/pages/admin/Security';
import TestEnvironmentPage from '@/pages/admin/TestEnvironment';
import ProfilePage         from '@/pages/shared/ProfilePage';
import IntegrationsPage    from '@/pages/producer/Integrations';
import AdminSettings    from '@/pages/admin/Settings';

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

// Protected route wrapper
function ProtectedRoute({ role, children }: { role?: string; children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated()) return <Navigate to="/login" replace />;
  if (role && !['ADMIN', 'STAFF'].includes(user?.role || '') && user?.role !== role) {
    return <Navigate to={user?.role === 'PRODUCER' ? '/produtor/dashboard' : '/admin/dashboard'} replace />;
  }
  return <>{children}</>;
}

export default function App() {
  const { user, isAuthenticated } = useAuthStore();

  return (
    <Routes>
      {/* ── PUBLIC ── */}
      <Route path="/login"    element={<LoginPage />} />
      <Route path="/mfa"      element={<MfaPage />} />
      <Route path="/cadastro" element={<RegisterPage />} />
      <Route path="/checkout/:slug" element={<CheckoutPage />} />

      {/* ── ADMIN ── */}
      <Route path="/admin" element={<ProtectedRoute role="ADMIN"><AdminLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard"    element={<AdminDashboard />} />
        <Route path="produtores"   element={<ProducersPage />} />
        <Route path="produtos"     element={<AdminProducts />} />
        <Route path="ofertas"      element={<OffersPage />} />
        <Route path="vendas"       element={<SalesPage />} />
        <Route path="afiliados"    element={<AffiliatesPage />} />
        <Route path="coprodutores" element={<CoproducersPage />} />
        <Route path="assinaturas"  element={<SubscriptionsPage />} />
        <Route path="logistica"    element={<LogisticsPage />} />
        <Route path="financeiro"   element={<FinancialPage />} />
        <Route path="webhooks"     element={<WebhooksPage />} />
        <Route path="relatorios"   element={<ReportsPage />} />
        <Route path="audit-log"    element={<AuditLogPage />} />
        <Route path="seguranca"    element={<SecurityPage />} />
        <Route path="configuracoes"     element={<AdminSettings />} />
        <Route path="ambiente-de-teste"  element={<TestEnvironmentPage />} />
        <Route path="perfil"             element={<ProfilePage />} />
      </Route>

      {/* ── PRODUTOR ── */}
      <Route path="/produtor" element={<ProtectedRoute role="PRODUCER"><ProducerLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard"    element={<ProducerDashboard />} />
        <Route path="produtos"     element={<MyProducts />} />
        <Route path="ofertas"      element={<OfferManager />} />
        <Route path="vendas"       element={<MySales />} />
        <Route path="afiliados"    element={<MyAffiliates />} />
        <Route path="coprodutores" element={<MyCoproducers />} />
        <Route path="checkout"     element={<CheckoutConfig />} />
        <Route path="financeiro"   element={<MyFinancial />} />
        <Route path="configuracoes" element={<ProducerSettings />} />
        <Route path="perfil"        element={<ProfilePage />} />
        <Route path="integracoes"   element={<IntegrationsPage />} />
      </Route>

      {/* ── REDIRECT ROOT ── */}
      <Route
        path="/"
        element={
          isAuthenticated()
            ? <Navigate to={user?.role === 'PRODUCER' ? '/produtor/dashboard' : '/admin/dashboard'} replace />
            : <Navigate to="/login" replace />
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}