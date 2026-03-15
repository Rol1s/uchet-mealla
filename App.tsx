import React, { Suspense, lazy } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
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
const Expenses = lazy(() => import('./pages/Expenses'));
const Money = lazy(() => import('./pages/Money'));
const History = lazy(() => import('./pages/History'));
const Help = lazy(() => import('./pages/Help'));

const PageFallback: React.FC = () => (
  <div className="flex items-center justify-center min-h-[200px]">
    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
  </div>
);

const App: React.FC = () => {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          {/* Public route - Login */}
          <Route path="/login" element={<Login />} />

          {/* Protected routes */}
          <Route
            path="/"
            element={
              <AuthGuard>
                <Layout>
                  <Suspense fallback={<PageFallback />}>
                    <Dashboard />
                  </Suspense>
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/movements"
            element={
              <AuthGuard>
                <Layout>
                  <Suspense fallback={<PageFallback />}>
                    <Movements />
                  </Suspense>
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/inventory"
            element={
              <AuthGuard>
                <Layout>
                  <Suspense fallback={<PageFallback />}>
                    <Inventory />
                  </Suspense>
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/rates"
            element={
              <AuthGuard>
                <Layout>
                  <Suspense fallback={<PageFallback />}>
                    <Rates />
                  </Suspense>
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/works"
            element={
              <AuthGuard>
                <Layout>
                  <Suspense fallback={<PageFallback />}>
                    <Works />
                  </Suspense>
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/expenses"
            element={
              <AuthGuard>
                <Layout>
                  <Suspense fallback={<PageFallback />}>
                    <Expenses />
                  </Suspense>
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/money"
            element={
              <AuthGuard>
                <Layout>
                  <Suspense fallback={<PageFallback />}>
                    <Money />
                  </Suspense>
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/companies"
            element={
              <AuthGuard>
                <Layout>
                  <Suspense fallback={<PageFallback />}>
                    <Companies />
                  </Suspense>
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/materials"
            element={
              <AuthGuard>
                <Layout>
                  <Suspense fallback={<PageFallback />}>
                    <Materials />
                  </Suspense>
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/history"
            element={
              <AuthGuard requireAdmin>
                <Layout>
                  <Suspense fallback={<PageFallback />}>
                    <History />
                  </Suspense>
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/help"
            element={
              <AuthGuard>
                <Layout>
                  <Suspense fallback={<PageFallback />}>
                    <Help />
                  </Suspense>
                </Layout>
              </AuthGuard>
            }
          />

          {/* Catch all - redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
};

export default App;
