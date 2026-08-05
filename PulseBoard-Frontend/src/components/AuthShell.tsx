import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

/**
 * Shared shell for Login/Register — the animated pulse logo mark,
 * gradient title, and glass card container both pages sit inside.
 */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Ambient floating orbs */}
      <motion.div
        className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-pulse-violet/20 blur-3xl"
        animate={{ y: [0, 20, 0], x: [0, 15, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-pulse-magenta/20 blur-3xl"
        animate={{ y: [0, -20, 0], x: [0, -15, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm relative"
      >
        <Link to="/" className="flex items-center justify-center gap-2 mb-6">
          <span className="relative flex h-3 w-3">
            <span className="pulse-ring absolute inline-flex h-3 w-3 rounded-full" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-signal-mint" />
          </span>
          <span className="font-display font-semibold text-xl tracking-tight">
            Pulse<span className="gradient-text">Board</span>
          </span>
        </Link>

        <h1 className="font-display text-2xl font-semibold text-center mb-1">{title}</h1>
        <p className="text-muted text-center mb-8 text-sm">{subtitle}</p>

        <div className="glass-card rounded-2xl p-6 shadow-2xl shadow-black/40">{children}</div>

        <p className="text-center text-sm text-muted mt-6">{footer}</p>
      </motion.div>
    </div>
  );
}
