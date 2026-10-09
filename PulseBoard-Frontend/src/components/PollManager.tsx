import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { pollApi } from '../api/pollApi';
import { canRetryApiError, getApiErrorMessage } from '../api/client';
import { useSessionHub } from '../hooks/useSessionHub';
import { Button } from './Button';
import { FormField } from './FormField';
import { LiveBarChart } from './LiveBarChart';
import { staggerContainer, staggerItem } from './PageTransition';
import type { Poll, PollResults, SessionStatus } from '../types';

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

export function PollManager({ sessionId, sessionStatus }: { sessionId: string; sessionStatus: SessionStatus }) {
  const queryClient = useQueryClient();
  const { results: liveResults } = useSessionHub(sessionId);

  const { data: polls, isLoading, isError, refetch } = useQuery({
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
  const [aiRetryable, setAiRetryable] = useState(true);
  const [aiDraftReady, setAiDraftReady] = useState(false);

  const createMutation = useMutation({
    mutationFn: () =>
      pollApi.create(sessionId, {
        question: question.trim(),
        options: options.map((o) => o.trim()),
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
      setAiDraftReady(true);
    },
    onError: (err) => {
      setAiError(getApiErrorMessage(err));
      setAiRetryable(canRetryApiError(err));
      setAiDraftReady(false);
    },
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
    if (!question.trim() || options.some((option) => !option.trim())) {
      setError('Enter a question and fill in every option.');
      return;
    }
    createMutation.mutate();
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div><h2 className="font-display text-xl font-semibold">Questions <span className="text-sm text-muted font-normal ml-1">{polls?.length ?? 0}</span></h2><p className="text-sm text-muted mt-1">Build a conversation, one question at a time.</p></div>
        <Button
          variant={isCreating ? 'secondary' : 'primary'}
          disabled={sessionStatus === 'Ended' || generateMutation.isPending || createMutation.isPending}
          onClick={() => {
            setIsCreating((v) => !v);
            setAiDraftReady(false);
            setTopic('');
            setAiError(null);
          }}
        >
          {isCreating ? 'Close editor' : '+ New question'}
        </Button>
      </div>

      {sessionStatus === 'Draft' && <p className="text-sm text-muted mb-4">Prepare your polls, then start the session to activate one.</p>}
      {sessionStatus === 'Ended' && <p className="text-sm text-muted mb-4">This session has ended. Polls and results are read-only.</p>}
      {error && (
        <div role="alert" className="bg-pulse-magenta/10 text-pulse-magenta text-sm px-3 py-2 rounded-lg border border-pulse-magenta/20 mb-4">
          {error}
        </div>
      )}

      <AnimatePresence>
        {isCreating && sessionStatus !== 'Ended' && (
          <motion.form
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            onSubmit={handleSubmit}
            className="glass-card rounded-2xl p-4 sm:p-6 space-y-6"
          >
            {hasActivePoll && (
              <div className="bg-signal-mint/5 text-signal-mint text-xs px-3 py-2 rounded-lg border border-signal-mint/20">
                A poll is already live — you can still draft this one, but you'll need to close the active poll before activating it.
              </div>
            )}

            <div className="rounded-xl border border-pulse-violet/20 bg-pulse-violet/5 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2 mb-2">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-paper"><SparkleIcon /> Draft with AI</h3>
                <span className="text-[10px] uppercase tracking-wider text-pulse-violet font-semibold">Optional</span>
              </div>
              <p className="text-xs text-muted leading-relaxed mb-4">Turn a topic into one quiz question. Review the answer before publishing.</p>
              <label htmlFor="ai-topic" className="block text-xs text-muted mb-2">What should the question cover?</label>
              <div className="flex flex-col sm:flex-row gap-2 min-w-0">
                <input
                  id="ai-topic"
                  maxLength={200}
                  value={topic}
                  disabled={generateMutation.isPending}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. async and await in C#"
                  className="focus-ring min-w-0 w-full flex-1 min-h-11 bg-ink/70 border border-border-soft rounded-xl px-3 py-3 text-sm text-paper"
                />
                <Button type="button" variant="secondary" className="w-full sm:w-auto shrink-0"
                  onClick={() => { setAiError(null); setAiDraftReady(false); generateMutation.mutate(); }}
                  disabled={generateMutation.isPending || topic.trim() === ''}>
                  {generateMutation.isPending ? 'Drafting…' : 'Generate draft'}
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-3" aria-label="Example topics">
                {['.NET fundamentals', 'Workplace safety', 'Customer support'].map((example) => (
                  <button type="button" key={example} onClick={() => setTopic(example)} disabled={generateMutation.isPending}
                    className="focus-ring min-h-9 text-xs text-muted rounded-lg border border-border-soft px-2.5 py-1.5 hover:text-paper hover:border-pulse-violet/50 disabled:opacity-50">{example}</button>
                ))}
              </div>
              {generateMutation.isPending && <p role="status" className="text-xs text-pulse-violet mt-3">Preparing your question and four answer choices…</p>}
              {aiError && (
                <div role="alert" className="mt-4 rounded-xl border border-pulse-magenta/25 bg-pulse-magenta/5 p-3">
                  <p className="text-sm font-semibold text-pulse-magenta">AI draft unavailable</p>
                  <p className="text-sm text-muted mt-1 leading-relaxed break-words">{aiError}</p>
                  <div className="flex flex-wrap gap-3 mt-2">
                    {aiRetryable && <button type="button" disabled={generateMutation.isPending} onClick={() => generateMutation.mutate()}
                      className="focus-ring min-h-11 text-sm font-medium text-paper">Try again</button>}
                    <button type="button" onClick={() => document.getElementById('poll-question')?.focus()}
                      className="focus-ring min-h-11 text-sm font-medium text-pulse-violet">Write manually ↓</button>
                  </div>
                </div>
              )}
              {aiDraftReady && !aiError && <p role="status" className="text-xs text-signal-mint mt-3">Draft ready. Check the question and marked answer below.</p>}
            </div>

            <div className="flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-border-soft" />Your question<span className="h-px flex-1 bg-border-soft" /></div>

            <FormField
              label="Question"
              id="poll-question"
              maxLength={300}
              disabled={generateMutation.isPending}
              required
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What would you like to ask?"
            />

            <div>
              <div className="flex flex-col gap-1 mb-3">
                <p className="text-sm font-medium text-paper">Answer choices</p>
                <span className="text-xs text-muted">Mark one correct answer for a quiz, or leave unmarked for a poll.</span>
              </div>
              <div className="space-y-2">
                {options.map((opt, i) => {
                  const isCorrect = correctOptionIndex === i;
                  return (
                    <div key={i} className="flex min-w-0 gap-2 items-center">
                      <button
                        type="button"
                        onClick={() => setCorrectOptionIndex(isCorrect ? null : i)}
                        aria-label={`Mark option ${i + 1} as correct`}
                        aria-pressed={isCorrect}
                        disabled={generateMutation.isPending}
                        title={isCorrect ? 'Marked as correct — click to unmark' : 'Mark as the correct answer'}
                        className={`focus-ring shrink-0 w-11 h-11 rounded-lg border flex items-center justify-center text-sm transition-colors ${
                          isCorrect
                            ? 'bg-signal-mint/15 border-signal-mint text-signal-mint'
                            : 'bg-ink/60 border-border-soft text-muted hover:text-signal-mint hover:border-signal-mint/50'
                        }`}
                      >
                        {isCorrect ? '✓' : String.fromCharCode(65 + i)}
                      </button>
                      <input
                        required
                        maxLength={120}
                        aria-label={`Option ${i + 1}`}
                        disabled={generateMutation.isPending}
                        value={opt}
                        onChange={(e) => updateOption(i, e.target.value)}
                        placeholder={`Option ${i + 1}`}
                        className="focus-ring min-w-0 w-full flex-1 min-h-11 bg-ink/60 border border-border-soft rounded-xl px-3.5 py-2.5 text-sm text-paper placeholder:text-muted/60 focus:border-pulse-violet transition-colors"
                      />
                      {options.length > 2 && (
                        <button
                          type="button"
                          aria-label={`Remove option ${i + 1}`}
                          disabled={generateMutation.isPending}
                          onClick={() => removeOption(i)}
                          className="focus-ring shrink-0 min-h-11 w-9 text-muted hover:text-pulse-magenta transition-colors"
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
                  disabled={generateMutation.isPending}
                  className="focus-ring min-h-11 text-sm text-pulse-violet hover:text-pulse-magenta mt-2 transition-colors"
                >
                  + Add option
                </button>
              )}
            </div>

            <div className="border-t border-border-soft pt-5 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <p className="text-xs text-muted">Saved as a draft. Activate it when you’re ready.</p>
            <Button type="submit" className="w-full sm:w-auto shrink-0" disabled={createMutation.isPending || generateMutation.isPending}>
              {createMutation.isPending ? 'Saving…' : 'Save question'}
            </Button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {isLoading && <p role="status" className="text-sm text-muted py-6">Loading questions…</p>}
      {isError && <div role="alert" className="glass-card rounded-xl p-4"><p className="text-sm text-pulse-magenta">Questions could not be loaded.</p><Button variant="ghost" onClick={() => refetch()}>Try again</Button></div>}
      {polls && polls.length === 0 && !isCreating && (
        <div className="text-center py-12 glass-card rounded-2xl">
          <p className="text-sm text-muted">Your first question starts here. Create a poll or let AI draft a quiz.</p>
        </div>
      )}

      {polls && polls.length > 0 && (
        <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-4">
          {polls.map((poll) => {
            const resultsForThisPoll = resultsByPollId[poll.id] ?? null;
            const correctOption = poll.options.find((o) => o.id === poll.correctOptionId);

            return (
              <motion.div key={poll.id} variants={staggerItem} className="glass-card rounded-2xl p-4 sm:p-6">
                <div className="flex items-start justify-between mb-2">
                  <p className="font-display font-medium min-w-0 break-words">{poll.question}</p>
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
                  {poll.status === 'Draft' && sessionStatus !== 'Ended' && (
                    <Button
                      onClick={() => activateMutation.mutate(poll.id)}
                      disabled={activateMutation.isPending || hasActivePoll || sessionStatus !== 'Live'}
                      title={hasActivePoll ? 'Close the currently active poll first' : undefined}
                    >
                      {activateMutation.isPending ? 'Activating...' : 'Activate'}
                    </Button>
                  )}
                  {poll.status === 'Active' && sessionStatus === 'Live' && (
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
