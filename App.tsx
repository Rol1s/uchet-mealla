import React, { Suspense, lazy } from 'react';
import { HashRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import AuthGuard from './components/AuthGuard';
import Layout from './components/Layout';
import Login from './pages/Login';
import { Loader2 } from 'lucide-react';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Movements = lazy(() => import('./pages/Movements'));
const Inventory = lazy(() => import('./pages/Inventory'));
const Rates = lazy(() => import('./pages/Rates'));
const Works = lazy(() => import('./pages/Works'));
const Companies = lazy(() => import('./pages/Companies'));
const Materials = lazy(() => import('./pages/Materials'));
const FinanceCashless = lazy(() => import('./pages/FinanceCashless'));
const FinanceCash = lazy(() => import('./pages/FinanceCash'));
const CounterpartyCard = lazy(() => import('./pages/CounterpartyCard'));
const Shipments = lazy(() => import('./pages/Shipments'));
const Analytics = lazy(() => import('./pages/Analytics'));
const InventoryCard = lazy(() => import('./pages/InventoryCard'));
const History = lazy(() => import('./pages/History'));
const Help = lazy(() => import('./pages/Help'));
const Updates = lazy(() => import('./pages/Updates'));

const PageFallback: React.FC = () => (
  <div className="flex items-center justify-center min-h-[200px]">
    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
  </div>
);

/** Обёртка для всех защищённых роутов — один AuthGuard + Layout */
const ProtectedLayout: React.FC = () => (
  <AuthGuard>
    <Layout>
      <Suspense fallback={<PageFallback />}>
        <Outlet />
      </Suspense>
    </Layout>
  </AuthGuard>
);

const AdminLayout: React.FC = () => (
  <AuthGuard requireAdmin>
    <Layout>
      <Suspense fallback={<PageFallback />}>
        <Outlet />
      </Suspense>
    </Layout>
  </AuthGuard>
);

const App: React.FC = () => (
  <AuthProvider>
    <HashRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/movements" element={<Movements />} />
          <Route path="/shipments" element={<Shipments />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/inventory-card" element={<InventoryCard />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/rates" element={<Rates />} />
          <Route path="/works" element={<Works />} />
          <Route path="/finance" element={<Navigate to="/finance-cashless" replace />} />
          <Route path="/finance-cashless" element={<FinanceCashless />} />
          <Route path="/finance-cash" element={<FinanceCash />} />
          <Route path="/counterparty/:id" element={<CounterpartyCard />} />
          <Route path="/companies" element={<Companies />} />
          <Route path="/materials" element={<Materials />} />
          <Route path="/help" element={<Help />} />
          <Route path="/updates" element={<Updates />} />
        </Route>

        <Route element={<AdminLayout />}>
          <Route path="/history" element={<History />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  </AuthProvider>
);

export default App;
