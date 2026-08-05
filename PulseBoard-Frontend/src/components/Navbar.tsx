import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';

export function Navbar() {
  const { name, logout } = useAuthStore();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <motion.nav
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="border-b border-border-soft/60 bg-ink/70 backdrop-blur-xl sticky top-0 z-20"
    >
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-2 group">
          <span className="relative flex h-2.5 w-2.5">
            <span className="pulse-ring absolute inline-flex h-2.5 w-2.5 rounded-full" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-signal-mint" />
          </span>
          <span className="font-display font-semibold text-lg tracking-tight">
            Pulse<span className="gradient-text">Board</span>
          </span>
        </Link>
        <div className="flex items-center gap-5 text-sm">
          <span className="text-muted">
            Hi, <span className="text-paper">{name}</span>
          </span>
          <button
            onClick={handleLogout}
            className="focus-ring text-muted hover:text-paper font-medium transition-colors"
          >
            Log out
          </button>
        </div>
      </div>
    </motion.nav>
  );
}
