import { useParams, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [showInviteOptions, setShowInviteOptions] = useState(false);

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
      queryClient.invalidateQueries({ queryKey: ['polls', id] });
    },
    onError: (err) => setError(getApiErrorMessage(err)),
  });

  const endMutation = useMutation({
    mutationFn: () => sessionApi.end(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions', id] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['polls', id] });
    },
    onError: (err) => setError(getApiErrorMessage(err)),
  });

  if (isLoading) return <p className="text-muted text-sm">Loading...</p>;
  if (!session) return <p className="text-pulse-magenta text-sm">Session not found.</p>;

  const isLive = session.status === 'Live';

  async function copyJoinLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/join?code=${session!.joinCode}`);
      setCopyMessage('Join link copied');
    } catch {
      setCopyMessage('Copy is unavailable. Share the join code or QR code instead.');
    }
  }

  return (
    <div>
      <Link to="/dashboard" className="focus-ring text-sm text-muted hover:text-paper mb-5 inline-flex min-h-9 items-center">
        ← All sessions
      </Link>
      <header className="mb-7">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-pulse-violet">Session workspace</span>
          <StatusBadge status={session.status} />
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight break-words">{session.title}</h1>
        <p className="mt-2 text-sm sm:text-base text-muted break-words">{session.topic}</p>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-8">
        <aside className="glass-card rounded-2xl p-5 sm:p-6 lg:sticky lg:top-24">
          <p className="text-xs uppercase tracking-[0.16em] text-muted font-semibold mb-3">Invite your audience</p>
          <p className="font-mono text-3xl sm:text-4xl font-semibold tracking-[0.16em] text-paper mb-2" aria-label={`Join code ${session.joinCode}`}>
            {session.joinCode}
          </p>
          <button type="button" className="focus-ring min-h-11 text-sm text-pulse-violet lg:hidden"
            aria-expanded={showInviteOptions} aria-controls="invite-options" onClick={() => setShowInviteOptions((visible) => !visible)}>
            {showInviteOptions ? 'Hide sharing options −' : 'Share code or invite link +'}
          </button>
          <div id="invite-options" className={`${showInviteOptions ? 'block' : 'hidden'} lg:block`}>
          <p className="text-xs leading-relaxed text-muted mb-5">Share this code or a join link. Participants can join once the session is live.</p>
          <Button variant="secondary" fullWidth onClick={copyJoinLink}>Copy join link</Button>
          {copyMessage && <p role="status" className="text-xs text-signal-mint mt-2">{copyMessage}</p>}
          <div className="grid gap-3 mt-4">
            <JoinQrCode joinCode={session.joinCode} />
            <ShareSessionButton title={session.title} joinCode={session.joinCode} />
          </div>
          </div>

          <div className="border-t border-border-soft mt-5 pt-5">
            <p className="text-sm font-medium mb-1">{isLive ? 'Your session is live' : session.status === 'Draft' ? 'Ready when you are' : 'Session complete'}</p>
            <p className="text-xs text-muted leading-relaxed mb-4">
              {isLive ? 'Activate a question to start collecting responses.' : session.status === 'Draft' ? 'Prepare a few questions, then invite everyone in.' : 'Your polls and results are available below.'}
            </p>
            {session.status === 'Draft' && (
              <Button fullWidth onClick={() => { setError(null); startMutation.mutate(); }} disabled={startMutation.isPending}>
                {startMutation.isPending ? 'Starting…' : 'Start session →'}
              </Button>
            )}
            {isLive && (
              <Button fullWidth variant="danger" onClick={() => { setError(null); endMutation.mutate(); }} disabled={endMutation.isPending}>
                {endMutation.isPending ? 'Ending…' : 'End session'}
              </Button>
            )}
            {error && <p role="alert" className="text-pulse-magenta text-sm mt-3">{error}</p>}
          </div>
          {session.startedAt && <p className="text-xs text-muted mt-4">Started {new Date(session.startedAt).toLocaleString()}</p>}
          {session.endedAt && <p className="text-xs text-muted mt-2">Ended {new Date(session.endedAt).toLocaleString()}</p>}
        </aside>

        <section className="min-w-0" aria-label="Session questions">
          <PollManager sessionId={session.id} sessionStatus={session.status} />
        </section>
      </div>
    </div>
  );
}
