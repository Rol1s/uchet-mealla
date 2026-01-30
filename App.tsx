import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import AuthGuard from './components/AuthGuard';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Movements from './pages/Movements';
import Inventory from './pages/Inventory';
import Rates from './pages/Rates';
import Works from './pages/Works';
import Companies from './pages/Companies';
import Materials from './pages/Materials';
import History from './pages/History';
import Help from './pages/Help';

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
                  <Dashboard />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/movements"
            element={
              <AuthGuard>
                <Layout>
                  <Movements />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/inventory"
            element={
              <AuthGuard>
                <Layout>
                  <Inventory />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/rates"
            element={
              <AuthGuard>
                <Layout>
                  <Rates />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/works"
            element={
              <AuthGuard>
                <Layout>
                  <Works />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/companies"
            element={
              <AuthGuard>
                <Layout>
                  <Companies />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/materials"
            element={
              <AuthGuard>
                <Layout>
                  <Materials />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/history"
            element={
              <AuthGuard requireAdmin>
                <Layout>
                  <History />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/help"
            element={
              <AuthGuard>
                <Layout>
                  <Help />
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
