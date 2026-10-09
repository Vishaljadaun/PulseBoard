import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
const LoginPage = lazy(() =>
  import('./pages/LoginPage').then((module) => ({ default: module.LoginPage }))
);
const RegisterPage = lazy(() =>
  import('./pages/RegisterPage').then((module) => ({
    default: module.RegisterPage,
  }))
);
const DashboardPage = lazy(() =>
  import('./pages/DashboardPage').then((module) => ({
    default: module.DashboardPage,
  }))
);
const SessionDetailPage = lazy(() =>
  import('./pages/SessionDetailPage').then((module) => ({
    default: module.SessionDetailPage,
  }))
);
const JoinPage = lazy(() =>
  import('./pages/JoinPage').then((module) => ({ default: module.JoinPage }))
);
const ParticipatePage = lazy(() =>
  import('./pages/ParticipatePage').then((module) => ({
    default: module.ParticipatePage,
  }))
);
import { ProtectedLayout } from './components/ProtectedLayout';
import { LandingPage } from './pages/LandingPage';
const DemoPage = lazy(() =>
  import('./pages/DemoPage').then((module) => ({ default: module.DemoPage }))
);
const SessionReportPage = lazy(() =>
  import('./pages/SessionReportPage').then((module) => ({
    default: module.SessionReportPage,
  }))
);

function App() {
  return (
    <BrowserRouter>
      <Suspense
        fallback={
          <p role="status" className="text-muted p-8">
            Loading PulseBoard…
          </p>
        }
      >
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/demo" element={<DemoPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/join" element={<JoinPage />} />
          <Route path="/participate/:id" element={<ParticipatePage />} />

          <Route element={<ProtectedLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/sessions/:id" element={<SessionDetailPage />} />
            <Route
              path="/sessions/:id/report"
              element={<SessionReportPage />}
            />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
