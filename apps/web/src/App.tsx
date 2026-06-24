import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Dashboard } from './pages/Dashboard';
import { Clients } from './pages/Clients';
import { Products } from './pages/Products';
import { Profitability } from './pages/Profitability';
import { Login } from './pages/Login';
import { NotFound } from './pages/NotFound';
// Ticket 009.1 — page AI Import
import { AiImport } from './pages/AiImport';

export function App() {
    return (
          <Routes>
                <Route path="/login" element={<Login />} />
                <Route
                          element={
                                      <ProtectedRoute>
                                                  <AppLayout />
                                      </ProtectedRoute>ProtectedRoute>
                  }
                      >
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/clients" element={<Clients />} />
                        <Route path="/prospects" element={<Navigate to="/clients" replace />} />
                        <Route path="/products" element={<Products />} />
                        <Route path="/profitability" element={<Profitability />} />
                  {/* Ticket 009.1 — route AI Import */}
                        <Route path="/ai-import" element={<AiImport />} />
                  {/* Ticket 009.4 — 404 inside authenticated layout */}
                        <Route path="*" element={<NotFound />} />
                </Route>Route>
            {/* 404 for unauthenticated routes */}
                <Route path="*" element={<NotFound />} />
          </Routes>Routes>
        );
}
</Routes>
