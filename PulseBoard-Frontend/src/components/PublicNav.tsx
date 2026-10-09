import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export function PublicNav() {
  const authenticated = useAuthStore((s) => s.isAuthenticated);
  return (
    <nav
      className="border-b border-border-soft/60 print:hidden"
      aria-label="Main navigation"
    >
      <div className="max-w-6xl mx-auto px-5 sm:px-8 min-h-20 flex items-center justify-between gap-4">
        <Link
          to="/"
          className="focus-ring flex items-center gap-2 font-display font-semibold text-lg"
        >
          <span
            className="h-7 w-7 rounded-lg bg-pulse-violet/15 flex items-center justify-center text-signal-mint"
            aria-hidden="true"
          >
            ▥
          </span>
          PulseBoard
        </Link>
        <div className="flex items-center gap-4 sm:gap-7 text-sm">
          <Link
            to="/join"
            className="focus-ring text-muted hover:text-paper py-3"
          >
            Join a session
          </Link>
          <Link
            to={authenticated ? '/dashboard' : '/login'}
            className="focus-ring text-pulse-violet py-3"
          >
            {authenticated ? 'Workspace →' : 'Log in →'}
          </Link>
        </div>
      </div>
    </nav>
  );
}
