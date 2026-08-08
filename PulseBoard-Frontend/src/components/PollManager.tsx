import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { pollApi } from '../api/pollApi';
import { getApiErrorMessage } from '../api/client';
import { useSessionHub } from '../hooks/useSessionHub';
import { Button } from './Button';
import { FormField } from './FormField';
import { LiveBarChart } from './LiveBarChart';
import { staggerContainer, staggerItem } from './PageTransition';
import type { Poll, PollResults } from '../types';

const POLL_STATUS_STYLES: Record<Poll['status'], string> = {
  Draft: 'bg-white/5 text-muted',
  Active: 'bg-signal-mint/10 text-signal-mint',
  Closed: 'bg-white/5 text-muted',
};

function SparkleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8L12 2zM19 15l.9 2.6L22.5 18.5l-2.6.9L19 22l-.9-2.6-2.6-.9 2.6-.9L19 15z" />
    </svg>
  );
}

export function PollManager({ sessionId }: { sessionId: string }) {
  const queryClient = useQueryClient();
  const { results: liveResults } = useSessionHub(sessionId);

  const { data: polls } = useQuery({
    queryKey: ['polls', sessionId],
    queryFn: () => pollApi.getSessionPolls(sessionId),
  });

  // Keyed by poll id. This is deliberately NOT gated on "is this the poll
  // SignalR told us is active" — that broadcast only fires once, at the
  // moment of activation, so a host who loads/reloads the page *after*
  // activation would otherwise see permanently-zero results even though
  // votes are coming in. Instead: every live update overwrites this map by
  // poll id, and a one-time fallback fetch (below) seeds it with whatever
  // the database already has for any non-Draft poll, so the numbers are
  // right immediately regardless of connection timing.
  const [resultsByPollId, setResultsByPollId] = useState<Record<string, PollResults>>({});

  useEffect(() => {
    if (liveResults) {
      setResultsByPollId((prev) => ({ ...prev, [liveResults.pollId]: liveResults }));
    }
  }, [liveResults]);

  useEffect(() => {
    if (!polls) return;
    polls
      .filter((p) => p.status !== 'Draft')
      .forEach((p) => {
        pollApi
          .getResults(p.id)
          .then((r) => setResultsByPollId((prev) => ({ ...prev, [p.id]: r })))
          .catch(() => {});
      });
    // Only re-run when the set of poll ids/status changes, not on every
    // resultsByPollId update — otherwise this would refetch in a loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [polls?.map((p) => `${p.id}:${p.status}`).join(',')]);

  const hasActivePoll = polls?.some((p) => p.status === 'Active') ?? false;

  const [isCreating, setIsCreating] = useState(false);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [correctOptionIndex, setCorrectOptionIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [topic, setTopic] = useState('');
  const [aiError, setAiError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () =>
      pollApi.create(sessionId, {
        question,
        options: options.filter((o) => o.trim() !== ''),
        correctOptionIndex,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['polls', sessionId] });
      setQuestion('');
      setOptions(['', '']);
      setCorrectOptionIndex(null);
      setTopic('');
      setIsCreating(false);
      setError(null);
    },
    onError: (err) => setError(getApiErrorMessage(err)),
  });

  const generateMutation = useMutation({
    mutationFn: () => pollApi.generateSuggestion(sessionId, topic),
    onSuccess: (suggestion) => {
      setQuestion(suggestion.question);
      // Pad to at least 2 slots even if the AI returns fewer, so the form stays usable.
      setOptions(suggestion.options.length >= 2 ? suggestion.options : ['', '']);
      setCorrectOptionIndex(suggestion.correctOptionIndex);
      setAiError(null);
    },
    onError: (err) => setAiError(getApiErrorMessage(err)),
  });

  const activateMutation = useMutation({
    mutationFn: (pollId: string) => pollApi.activate(pollId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['polls', sessionId] }),
    onError: (err) => setError(getApiErrorMessage(err)),
  });

  const closeMutation = useMutation({
    mutationFn: (pollId: string) => pollApi.close(pollId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['polls', sessionId] }),
    onError: (err) => setError(getApiErrorMessage(err)),
  });

  function updateOption(index: number, value: string) {
    setOptions((prev) => prev.map((o, i) => (i === index ? value : o)));
  }

  function addOption() {
    if (options.length < 8) setOptions((prev) => [...prev, '']);
  }

  function removeOption(index: number) {
    if (options.length <= 2) return;
    setOptions((prev) => prev.filter((_, i) => i !== index));
    setCorrectOptionIndex((prev) => {
      if (prev === null) return null;
      if (prev === index) return null; // the removed option was the marked answer
      return prev > index ? prev - 1 : prev;
    });
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    createMutation.mutate();
  }

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-lg font-semibold">Polls</h2>
        <Button
          variant={isCreating ? 'secondary' : 'primary'}
          onClick={() => {
            setIsCreating((v) => !v);
            setTopic('');
            setAiError(null);
          }}
        >
          {isCreating ? 'Cancel' : '+ New poll'}
        </Button>
      </div>

      <AnimatePresence>
        {isCreating && (
          <motion.form
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            onSubmit={handleSubmit}
            className="glass-card rounded-2xl p-6 space-y-4 overflow-hidden"
          >
            {error && (
              <div className="bg-pulse-magenta/10 text-pulse-magenta text-sm px-3 py-2 rounded-lg border border-pulse-magenta/20">
                {error}
              </div>
            )}

            {hasActivePoll && (
              <div className="bg-signal-mint/5 text-signal-mint text-xs px-3 py-2 rounded-lg border border-signal-mint/20">
                A poll is already live — you can still draft this one, but you'll need to close the active poll before activating it.
              </div>
            )}

            <div className="bg-pulse-violet/5 border border-pulse-violet/20 rounded-xl p-4 space-y-3">
              <label className="flex items-center gap-1.5 text-sm font-medium text-pulse-violet">
                <SparkleIcon />
                Generate with AI
              </label>
              <div className="flex gap-2">
                <input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. team retro priorities, favorite programming languages"
                  className="focus-ring flex-1 bg-ink/60 border border-border-soft rounded-xl px-3.5 py-2.5 text-sm text-paper placeholder:text-muted/60 focus:border-pulse-violet transition-colors"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setAiError(null);
                    generateMutation.mutate();
                  }}
                  disabled={generateMutation.isPending || topic.trim() === ''}
                >
                  {generateMutation.isPending ? 'Thinking...' : 'Generate'}
                </Button>
              </div>
              {aiError && <p className="text-xs text-pulse-magenta">{aiError}</p>}
              <p className="text-xs text-muted">
                Drafts a question, options, and a suggested correct answer from a topic — review and edit below before creating.
              </p>
            </div>

            <FormField
              label="Question"
              required
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. What should we tackle first?"
            />

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-muted">Options</label>
                <span className="text-xs text-muted">Click ✓ to mark the correct answer (optional)</span>
              </div>
              <div className="space-y-2">
                {options.map((opt, i) => {
                  const isCorrect = correctOptionIndex === i;
                  return (
                    <div key={i} className="flex gap-2 items-center">
                      <button
                        type="button"
                        onClick={() => setCorrectOptionIndex(isCorrect ? null : i)}
                        title={isCorrect ? 'Marked as correct — click to unmark' : 'Mark as the correct answer'}
                        className={`focus-ring shrink-0 w-9 h-9 rounded-lg border flex items-center justify-center text-sm transition-colors ${
                          isCorrect
                            ? 'bg-signal-mint/15 border-signal-mint text-signal-mint'
                            : 'bg-ink/60 border-border-soft text-muted hover:text-signal-mint hover:border-signal-mint/50'
                        }`}
                      >
                        ✓
                      </button>
                      <input
                        required
                        value={opt}
                        onChange={(e) => updateOption(i, e.target.value)}
                        placeholder={`Option ${i + 1}`}
                        className="focus-ring flex-1 bg-ink/60 border border-border-soft rounded-xl px-3.5 py-2.5 text-sm text-paper placeholder:text-muted/60 focus:border-pulse-violet transition-colors"
                      />
                      {options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeOption(i)}
                          className="focus-ring text-muted hover:text-pulse-magenta px-2 transition-colors"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              {options.length < 8 && (
                <button
                  type="button"
                  onClick={addOption}
                  className="focus-ring text-sm text-pulse-violet hover:text-pulse-magenta mt-2 transition-colors"
                >
                  + Add option
                </button>
              )}
            </div>

            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create poll'}
            </Button>
          </motion.form>
        )}
      </AnimatePresence>

      {polls && polls.length === 0 && !isCreating && (
        <div className="text-center py-12 glass-card rounded-2xl">
          <p className="text-sm text-muted">No polls yet — create one to get voting started.</p>
        </div>
      )}

      {polls && polls.length > 0 && (
        <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-4">
          {polls.map((poll) => {
            const resultsForThisPoll = resultsByPollId[poll.id] ?? null;
            const correctOption = poll.options.find((o) => o.id === poll.correctOptionId);

            return (
              <motion.div key={poll.id} variants={staggerItem} className="glass-card rounded-2xl p-6">
                <div className="flex items-start justify-between mb-2">
                  <p className="font-display font-medium">{poll.question}</p>
                  <span
                    className={`shrink-0 ml-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${POLL_STATUS_STYLES[poll.status]}`}
                  >
                    {poll.status === 'Active' && (
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="pulse-ring absolute inline-flex h-1.5 w-1.5 rounded-full" />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-signal-mint" />
                      </span>
                    )}
                    {poll.status}
                  </span>
                </div>

                {correctOption && (
                  <p className="text-xs text-signal-mint mb-4">✓ Correct answer: {correctOption.text}</p>
                )}
                {!correctOption && <div className="mb-4" />}

                {(poll.status === 'Active' || poll.status === 'Closed') && (
                  <div className="mb-4">
                    <LiveBarChart
                      poll={poll}
                      results={resultsForThisPoll}
                      correctOptionId={poll.correctOptionId}
                    />
                  </div>
                )}

                <div className="flex gap-2">
                  {poll.status === 'Draft' && (
                    <Button
                      onClick={() => activateMutation.mutate(poll.id)}
                      disabled={activateMutation.isPending || hasActivePoll}
                      title={hasActivePoll ? 'Close the currently active poll first' : undefined}
                    >
                      {activateMutation.isPending ? 'Activating...' : 'Activate'}
                    </Button>
                  )}
                  {poll.status === 'Active' && (
                    <Button
                      variant="danger"
                      onClick={() => closeMutation.mutate(poll.id)}
                      disabled={closeMutation.isPending}
                    >
                      {closeMutation.isPending ? 'Closing...' : 'Close poll'}
                    </Button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
