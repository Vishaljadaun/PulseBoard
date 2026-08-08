import { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useSessionHub } from '../hooks/useSessionHub';
import { pollApi } from '../api/pollApi';
import { getParticipantId } from '../api/participantId';
import { getApiErrorMessage } from '../api/client';
import { LiveBarChart } from '../components/LiveBarChart';
import type { PollResults } from '../types';

export function ParticipatePage() {
  const { id: sessionId } = useParams<{ id: string }>();
  const location = useLocation();
  const sessionTitle = (location.state as { title?: string } | null)?.title;

  const { activePoll, results, setActivePoll, setResults, isConnected } = useSessionHub(sessionId);
  const [hasVoted, setHasVoted] = useState(false);
  const [localResults, setLocalResults] = useState<PollResults | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [voteCorrectness, setVoteCorrectness] = useState<{ isCorrect: boolean | null; correctOptionId: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isVoting, setIsVoting] = useState(false);

  // Reset local voting state whenever the active poll changes (new poll pushed)
  useEffect(() => {
    setHasVoted(false);
    setLocalResults(null);
    setSelectedOptionId(null);
    setVoteCorrectness(null);
    setError(null);
  }, [activePoll?.id]);

  // Fallback: if the host already activated a poll before this participant
  // joined, they'd never receive the one-time SignalR broadcast for it —
  // that only fires at the moment of activation. This fetches whatever's
  // currently active and pushes it into the same state SignalR would have.
  useEffect(() => {
    if (!sessionId || activePoll) return;

    pollApi
      .getActivePoll(sessionId)
      .then((poll) => {
        if (!poll) return;
        setActivePoll(poll);
        // Also grab current tallies in case votes already came in before this participant joined.
        return pollApi.getResults(poll.id).then(setResults);
      })
      .catch(() => {});
  }, [sessionId, activePoll, setActivePoll, setResults]);

  async function handleVote(optionId: string) {
    if (!activePoll || isVoting) return;
    setError(null);
    setIsVoting(true);
    try {
      const participantId = getParticipantId();
      const voteResult = await pollApi.vote(activePoll.id, optionId, participantId);
      setLocalResults(voteResult.results);
      setResults(voteResult.results);
      setSelectedOptionId(voteResult.selectedOptionId);
      // isCorrect/correctOptionId are only ever present in this direct
      // response to the voter — never broadcast, never visible to anyone
      // who hasn't voted on this poll yet.
      setVoteCorrectness({ isCorrect: voteResult.isCorrect, correctOptionId: voteResult.correctOptionId });
      setHasVoted(true);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsVoting(false);
    }
  }

  const displayResults = results ?? localResults;

  return (
    <div className="min-h-screen px-4 py-10 relative overflow-hidden">
      <motion.div
        className="absolute -top-32 left-1/2 -translate-x-1/2 w-[32rem] h-[32rem] rounded-full bg-pulse-violet/10 blur-3xl"
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="max-w-md mx-auto relative">
        <div className="flex items-center justify-center gap-2 mb-8">
          <span className="relative flex h-2.5 w-2.5">
            {isConnected && (
              <span className="pulse-ring absolute inline-flex h-2.5 w-2.5 rounded-full" />
            )}
            <span
              className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isConnected ? 'bg-signal-mint' : 'bg-muted'}`}
            />
          </span>
          <span className="font-display font-semibold tracking-tight">
            Pulse<span className="gradient-text">Board</span>
          </span>
        </div>

        {sessionTitle && (
          <p className="text-center text-muted text-sm mb-6">{sessionTitle}</p>
        )}

        <AnimatePresence mode="wait">
          {!activePoll && (
            <motion.div
              key="waiting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="glass-card rounded-2xl p-10 text-center"
            >
              <motion.div
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                className="w-3 h-3 rounded-full bg-pulse-violet mx-auto mb-4"
              />
              <p className="font-display text-lg mb-1">Waiting for the host</p>
              <p className="text-sm text-muted">A poll will appear here the moment it goes live.</p>
            </motion.div>
          )}

          {activePoll && !hasVoted && (
            <motion.div
              key={activePoll.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="glass-card rounded-2xl p-6"
            >
              <p className="font-display text-lg font-semibold mb-5 text-center">
                {activePoll.question}
              </p>

              {error && (
                <div className="bg-pulse-magenta/10 text-pulse-magenta text-sm px-3 py-2 rounded-lg border border-pulse-magenta/20 mb-4">
                  {error}
                </div>
              )}

              <div className="space-y-2.5">
                {activePoll.options.map((option, i) => (
                  <motion.button
                    key={option.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={isVoting}
                    onClick={() => handleVote(option.id)}
                    className="focus-ring w-full text-left bg-ink/60 hover:bg-ink/40 border border-border-soft hover:border-pulse-violet/60 rounded-xl px-4 py-3.5 text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {option.text}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {activePoll && hasVoted && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-2xl p-6"
            >
              <div className="flex items-center justify-center gap-2 mb-3">
                <span className="text-signal-mint text-sm font-medium">✓ Vote counted — live results</span>
              </div>

              {/* Correctness reveal — only ever shown to the voter themselves, from the direct vote response, never from a broadcast. */}
              {voteCorrectness?.isCorrect !== null && voteCorrectness !== null && (
                <div
                  className={`text-center text-sm font-medium mb-4 px-3 py-2 rounded-lg border ${
                    voteCorrectness.isCorrect
                      ? 'bg-signal-mint/10 text-signal-mint border-signal-mint/20'
                      : 'bg-pulse-magenta/10 text-pulse-magenta border-pulse-magenta/20'
                  }`}
                >
                  {voteCorrectness.isCorrect ? '🎉 Correct!' : '✗ Not quite — check the marked answer below'}
                </div>
              )}

              <p className="font-display font-semibold mb-4 text-center">{activePoll.question}</p>
              <LiveBarChart
                poll={activePoll}
                results={displayResults}
                selectedOptionId={selectedOptionId}
                correctOptionId={voteCorrectness?.correctOptionId}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
