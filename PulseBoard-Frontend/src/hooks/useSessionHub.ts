import { useCallback, useEffect, useRef, useState } from 'react';
import * as signalR from '@microsoft/signalr';
import { pollApi } from '../api/pollApi';
import type { Poll, PollResults } from '../types';

const HUB_URL = import.meta.env.VITE_SIGNALR_HUB_URL || 'https://localhost:7050/hubs/session';

/**
 * Joins the SignalR group for one session and keeps `activePoll` /
 * `results` in sync with whatever the server broadcasts. Used by both the
 * host's session detail page and the participant's join/vote page — same
 * hub, same events, different UI on top.
 */
export function useSessionHub(sessionId: string | undefined) {
  const [activePoll, setActivePoll] = useState<Poll | null>(null);
  const [results, setResults] = useState<PollResults | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const connectionRef = useRef<signalR.HubConnection | null>(null);

  // Pulls "what's active right now + its current tallies" straight from the
  // database. Called after every (re)connect — not just the first one.
  // SignalR's automatic reconnect establishes a genuinely new connection
  // under the hood, which starts out NOT a member of the session's group
  // and never replays broadcasts that happened while disconnected. Without
  // this, a dropped connection (Render's free tier idles/cold-starts
  // fairly often) would leave the screen silently stuck on stale data
  // until someone manually reloaded the page.
  const resync = useCallback((sid: string) => {
    pollApi
      .getActivePoll(sid)
      .then((poll) => {
        setActivePoll(poll);
        if (poll) {
          return pollApi.getResults(poll.id).then(setResults);
        }
        setResults(null);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!sessionId) return;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL)
      .withAutomaticReconnect()
      .build();

    connection.on('PollActivated', (poll: Poll) => {
      setActivePoll(poll);
      setResults(null);
    });

    connection.on('PollResultsUpdated', (updatedResults: PollResults) => {
      setResults(updatedResults);
    });

    connection.on('PollClosed', () => {
      setActivePoll(null);
      setResults(null);
    });

    // Fires when the transport drops and SignalR is retrying — surfaces as
    // the "offline" dot in the UI rather than silently doing nothing.
    connection.onreconnecting(() => setIsConnected(false));

    // Fires once a NEW underlying connection is up. Re-joining the group
    // and re-syncing state here is what actually fixes "had to reload the
    // page" — without it, this new connection just sits there receiving
    // nothing, indistinguishable from working correctly until you compare
    // against what actually happened on the server.
    connection.onreconnected(() => {
      setIsConnected(true);
      connection.invoke('JoinSession', sessionId).catch(() => {});
      resync(sessionId);
    });

    connection.onclose(() => setIsConnected(false));

    connection
      .start()
      .then(() => {
        setIsConnected(true);
        return connection.invoke('JoinSession', sessionId);
      })
      .then(() => resync(sessionId))
      .catch((err) => console.error('SignalR connection failed:', err));

    connectionRef.current = connection;

    return () => {
      connection.invoke('LeaveSession', sessionId).catch(() => {});
      connection.stop();
      connectionRef.current = null;
      setIsConnected(false);
    };
  }, [sessionId, resync]);

  return { activePoll, results, isConnected, setActivePoll, setResults };
}
