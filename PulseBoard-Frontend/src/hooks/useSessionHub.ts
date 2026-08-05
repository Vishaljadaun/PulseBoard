import { useEffect, useRef, useState } from 'react';
import * as signalR from '@microsoft/signalr';
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

    connection
      .start()
      .then(() => {
        setIsConnected(true);
        return connection.invoke('JoinSession', sessionId);
      })
      .catch((err) => console.error('SignalR connection failed:', err));

    connectionRef.current = connection;

    return () => {
      connection.invoke('LeaveSession', sessionId).catch(() => {});
      connection.stop();
      connectionRef.current = null;
      setIsConnected(false);
    };
  }, [sessionId]);

  return { activePoll, results, isConnected, setActivePoll, setResults };
}
