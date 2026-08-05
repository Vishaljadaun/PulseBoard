import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { sessionApi } from '../api/sessionApi';
import { getApiErrorMessage } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { FormField } from '../components/FormField';
import { Button } from '../components/Button';
import { staggerContainer, staggerItem } from '../components/PageTransition';

export function DashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: sessions, isLoading, isError } = useQuery({
    queryKey: ['sessions'],
    queryFn: sessionApi.getMySessions,
  });

  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: sessionApi.create,
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      navigate(`/sessions/${session.id}`);
    },
    onError: (err) => setError(getApiErrorMessage(err)),
  });

  function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    createMutation.mutate({ title, topic });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-2xl font-semibold">Your sessions</h1>
          <p className="text-muted text-sm mt-1">Create a session to get a live join code</p>
        </div>
        <Button onClick={() => setIsCreating((v) => !v)} variant={isCreating ? 'secondary' : 'primary'}>
          {isCreating ? 'Cancel' : '+ New session'}
        </Button>
      </div>

      <AnimatePresence>
        {isCreating && (
          <motion.form
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            onSubmit={handleCreate}
            className="glass-card rounded-2xl p-6 space-y-4 overflow-hidden"
          >
            {error && (
              <div className="bg-pulse-magenta/10 text-pulse-magenta text-sm px-3 py-2 rounded-lg border border-pulse-magenta/20">
                {error}
              </div>
            )}
            <FormField
              label="Title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Team Retro — August"
            />
            <FormField
              label="Topic"
              required
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. What's blocking us this sprint?"
            />
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create session'}
            </Button>
          </motion.form>
        )}
      </AnimatePresence>

      {isLoading && <p className="text-muted text-sm">Loading sessions...</p>}
      {isError && <p className="text-pulse-magenta text-sm">Couldn't load sessions. Is the API running?</p>}

      {sessions && sessions.length === 0 && !isCreating && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20 glass-card rounded-2xl"
        >
          <p className="font-display text-lg mb-1">No sessions yet</p>
          <p className="text-sm text-muted">Create your first one to get a join code.</p>
        </motion.div>
      )}

      {sessions && sessions.length > 0 && (
        <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid gap-3">
          {sessions.map((s) => (
            <motion.button
              key={s.id}
              variants={staggerItem}
              whileHover={{ y: -2, transition: { duration: 0.15 } }}
              onClick={() => navigate(`/sessions/${s.id}`)}
              className="focus-ring glass-card rounded-2xl px-6 py-5 text-left flex items-center justify-between group"
            >
              <div>
                <p className="font-display font-medium text-paper group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-pulse-violet group-hover:to-pulse-magenta transition-all">
                  {s.title}
                </p>
                <p className="text-sm text-muted mt-0.5">{s.topic}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-mono text-sm text-muted tracking-wider">{s.joinCode}</span>
                <StatusBadge status={s.status} />
              </div>
            </motion.button>
          ))}
        </motion.div>
      )}
    </div>
  );
}
