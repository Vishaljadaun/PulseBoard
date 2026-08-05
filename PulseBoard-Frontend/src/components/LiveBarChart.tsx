import { motion } from 'framer-motion';
import type { Poll, PollResults } from '../types';

/**
 * Renders bars for a poll's options, driven by live results if available
 * (SignalR pushes updates), falling back to zero-vote bars before any
 * votes come in. Bar widths animate via CSS transition on `width`, so
 * every incoming vote visibly grows the right bar in real time.
 */
export function LiveBarChart({ poll, results }: { poll: Poll; results: PollResults | null }) {
  const total = results?.totalVotes ?? 0;

  return (
    <div className="space-y-3">
      {poll.options.map((option, i) => {
        const optionResult = results?.options.find((o) => o.optionId === option.id);
        const count = optionResult?.voteCount ?? 0;
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;

        return (
          <motion.div
            key={option.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <div className="flex items-center justify-between mb-1.5 text-sm">
              <span className="text-paper font-medium">{option.text}</span>
              <span className="text-muted font-mono">
                {count} {count === 1 ? 'vote' : 'votes'} · {pct}%
              </span>
            </div>
            <div className="h-9 rounded-lg bg-ink/60 border border-border-soft overflow-hidden relative">
              <motion.div
                className="h-full rounded-lg bg-gradient-to-r from-pulse-violet to-pulse-magenta relative"
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              >
                {pct > 8 && (
                  <span className="pulse-ring absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-1.5 w-1.5 rounded-full" />
                )}
              </motion.div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
