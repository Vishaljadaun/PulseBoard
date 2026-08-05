import { motion } from 'framer-motion';
import type { SessionStatus } from '../types';

const CONFIG: Record<SessionStatus, { label: string; dot: string; text: string; bg: string }> = {
  Draft: { label: 'Draft', dot: 'bg-muted', text: 'text-muted', bg: 'bg-white/5' },
  Live: { label: 'Live', dot: 'bg-signal-mint', text: 'text-signal-mint', bg: 'bg-signal-mint/10' },
  Ended: { label: 'Ended', dot: 'bg-muted', text: 'text-muted', bg: 'bg-white/5' },
};

export function StatusBadge({ status }: { status: SessionStatus }) {
  const c = CONFIG[status];
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`}
    >
      <span className="relative flex h-2 w-2">
        {status === 'Live' && (
          <span className="pulse-ring absolute inline-flex h-2 w-2 rounded-full" />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${c.dot}`} />
      </span>
      {c.label}
    </motion.span>
  );
}
