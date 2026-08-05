import { useParams, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { sessionApi } from '../api/sessionApi';
import { getApiErrorMessage } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { Button } from '../components/Button';
import { PollManager } from '../components/PollManager';
import { JoinQrCode } from '../components/JoinQrCode';
import { ShareSessionButton } from '../components/ShareSessionButton';
import { useState } from 'react';

export function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const { data: session, isLoading } = useQuery({
    queryKey: ['sessions', id],
    queryFn: () => sessionApi.getById(id!),
    enabled: !!id,
  });

  const startMutation = useMutation({
    mutationFn: () => sessionApi.start(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions', id] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
    onError: (err) => setError(getApiErrorMessage(err)),
  });

  const endMutation = useMutation({
    mutationFn: () => sessionApi.end(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions', id] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
    onError: (err) => setError(getApiErrorMessage(err)),
  });

  if (isLoading) return <p className="text-muted text-sm">Loading...</p>;
  if (!session) return <p className="text-pulse-magenta text-sm">Session not found.</p>;

  const isLive = session.status === 'Live';

  return (
    <div className="max-w-lg mx-auto">
      <Link to="/dashboard" className="focus-ring text-sm text-muted hover:text-paper mb-6 inline-block transition-colors">
        ← Back to sessions
      </Link>

      {/* Animated gradient-border hero card */}
      <div className="relative rounded-3xl p-[1.5px] overflow-hidden">
        <motion.div
          className="absolute inset-0"
          style={{
            background:
              'conic-gradient(from 0deg, var(--color-pulse-violet), var(--color-pulse-magenta), var(--color-signal-mint), var(--color-pulse-violet))',
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
        />
        <div className="relative bg-surface rounded-3xl px-8 py-10 text-center">
          <div className="flex items-center justify-center mb-4">
            <StatusBadge status={session.status} />
          </div>

          <h1 className="font-display text-xl font-semibold mb-1">{session.title}</h1>
          <p className="text-muted mb-8 text-sm">{session.topic}</p>

          <p className="text-xs uppercase tracking-[0.2em] text-muted mb-3">Join code</p>

          <div className="flex justify-center gap-1.5 mb-8">
            {session.joinCode.split('').map((digit, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12, rotateX: -90 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                transition={{ delay: i * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className={`w-11 h-14 rounded-xl flex items-center justify-center font-mono text-3xl font-bold ${
                  isLive
                    ? 'bg-signal-mint/10 text-signal-mint border border-signal-mint/30'
                    : 'bg-ink/60 text-paper border border-border-soft'
                }`}
              >
                {digit}
              </motion.div>
            ))}
          </div>

          <JoinQrCode joinCode={session.joinCode} />

          <div className="mb-2">
            <ShareSessionButton title={session.title} joinCode={session.joinCode} />
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-pulse-magenta/10 text-pulse-magenta text-sm px-3 py-2 rounded-lg mb-4 border border-pulse-magenta/20"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex gap-3 justify-center">
            {session.status === 'Draft' && (
              <Button onClick={() => startMutation.mutate()} disabled={startMutation.isPending}>
                {startMutation.isPending ? 'Starting...' : 'Start session'}
              </Button>
            )}
            {session.status === 'Live' && (
              <Button variant="danger" onClick={() => endMutation.mutate()} disabled={endMutation.isPending}>
                {endMutation.isPending ? 'Ending...' : 'End session'}
              </Button>
            )}
            {session.status === 'Ended' && <p className="text-sm text-muted">This session has ended.</p>}
          </div>
        </div>
      </div>

      <div className="mt-6 text-center text-xs text-muted space-y-1">
        {session.startedAt && <p>Started: {new Date(session.startedAt).toLocaleString()}</p>}
        {session.endedAt && <p>Ended: {new Date(session.endedAt).toLocaleString()}</p>}
      </div>

      <PollManager sessionId={session.id} />
    </div>
  );
}
