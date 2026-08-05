import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Navbar } from './Navbar';
import { PageTransition } from './PageTransition';

/** Wraps every route under /dashboard, /sessions/*, i.e. anything requiring login. */
export function ProtectedLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-10">
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>
    </div>
  );
}
