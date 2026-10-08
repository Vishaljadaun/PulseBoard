import { useEffect, useState } from 'react';
import * as signalR from '@microsoft/signalr';
import { pollApi } from '../api/pollApi';
import { sessionApi } from '../api/sessionApi';
import type { Poll, PollResults } from '../types';

const HUB_URL = import.meta.env.VITE_SIGNALR_HUB_URL || 'https://localhost:7050/hubs/session';

/** Keeps participants current after a reconnect, refresh, or missed broadcast. */
export function useSessionHub(sessionId: string | undefined) {
  const [activePoll, setActivePoll] = useState<Poll | null>(null);
  const [results, setResults] = useState<PollResults | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);

  useEffect(() => {
    setActivePoll(null);
    setResults(null);
    setSessionEnded(false);
    setIsConnected(false);
    if (!sessionId) return;

    let disposed = false;
    let ended = false;
    let revision = 0;
    let syncing = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL)
      .withAutomaticReconnect()
      .build();

    function markEnded() {
      ended = true;
      revision++;
      setSessionEnded(true);
      setActivePoll(null);
      setResults(null);
    }

    async function resync() {
      if (disposed || syncing || ended) return;
      syncing = true;
      const snapshotRevision = revision;
      try {
        const snapshot = await sessionApi.getStatus(sessionId!);
        if (disposed || snapshotRevision !== revision) return;
        if (snapshot.status === 'Ended') {
          markEnded();
          return;
        }
        const poll = snapshot.status === 'Live' ? await pollApi.getActivePoll(sessionId!) : null;
        const tallies = poll ? await pollApi.getResults(poll.id) : null;
        // A broadcast received during these requests is newer than this snapshot.
        if (disposed || snapshotRevision !== revision) return;
        setActivePoll(poll);
        setResults(tallies);
      } catch {
        // The next periodic sync or reconnect retries transient API failures.
      } finally {
        syncing = false;
      }
    }

    connection.on('PollActivated', (poll: Poll) => {
      if (disposed || ended) return;
      revision++;
      setActivePoll(poll);
      setResults(null);
    });
    connection.on('PollResultsUpdated', (updatedResults: PollResults) => {
      if (disposed || ended) return;
      revision++;
      setResults(updatedResults);
    });
    connection.on('PollClosed', () => {
      if (disposed) return;
      revision++;
      setActivePoll(null);
      setResults(null);
    });
    connection.on('SessionEnded', () => {
      if (!disposed) markEnded();
    });

    async function join() {
      await connection.invoke('JoinSession', sessionId);
      if (disposed) return;
      setIsConnected(true);
      await resync();
    }

    function scheduleRetry() {
      if (disposed || retryTimer) return;
      retryTimer = setTimeout(() => {
        retryTimer = undefined;
        void start();
      }, 5000);
    }

    async function start() {
      if (disposed) return;
      try {
        if (connection.state === signalR.HubConnectionState.Disconnected) await connection.start();
        if (disposed) return;
        await join();
      } catch {
        if (!disposed) {
          setIsConnected(false);
          scheduleRetry();
        }
      }
    }

    connection.onreconnecting(() => { if (!disposed) setIsConnected(false); });
    connection.onreconnected(() => {
      void join().catch(() => {
        if (!disposed) {
          setIsConnected(false);
          scheduleRetry();
        }
      });
    });
    connection.onclose(() => {
      if (!disposed) {
        setIsConnected(false);
        scheduleRetry();
      }
    });

    // HTTP also works while the initial SignalR connection is unavailable.
    void resync();
    void start();
    const syncTimer = setInterval(() => { void resync(); }, 10000);
    return () => {
      disposed = true;
      clearInterval(syncTimer);
      clearTimeout(retryTimer);
      void connection.stop().catch(() => {});
    };
  }, [sessionId]);

  return { activePoll, results, isConnected, sessionEnded, setResults };
}
