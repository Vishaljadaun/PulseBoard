import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSessionHub } from '../src/hooks/useSessionHub';

const mocks = vi.hoisted(() => ({
  getStatus: vi.fn(), getActivePoll: vi.fn(), getResults: vi.fn(),
  start: vi.fn(), invoke: vi.fn(), stop: vi.fn(),
  events: {} as Record<string, (...args: any[]) => void>,
  lifecycle: {} as Record<string, () => void>,
}));

vi.mock('../src/api/sessionApi', () => ({ sessionApi: { getStatus: mocks.getStatus } }));
vi.mock('../src/api/pollApi', () => ({ pollApi: { getActivePoll: mocks.getActivePoll, getResults: mocks.getResults } }));
vi.mock('@microsoft/signalr', () => ({
  HubConnectionState: { Disconnected: 'Disconnected' },
  HubConnectionBuilder: class {
    withUrl() { return this; }
    withAutomaticReconnect() { return this; }
    build() {
      return {
        state: 'Disconnected', start: mocks.start, invoke: mocks.invoke, stop: mocks.stop,
        on: (name: string, callback: (...args: any[]) => void) => { mocks.events[name] = callback; },
        onreconnecting: (callback: () => void) => { mocks.lifecycle.reconnecting = callback; },
        onreconnected: (callback: () => void) => { mocks.lifecycle.reconnected = callback; },
        onclose: (callback: () => void) => { mocks.lifecycle.close = callback; },
      };
    }
  },
}));

const poll = { id: 'poll-1', sessionId: 'session-1', question: 'Ready?', status: 'Active', options: [] };
const tallies = { pollId: poll.id, totalVotes: 2, options: [] };
const flush = () => act(async () => { await Promise.resolve(); });

beforeEach(() => {
  vi.useFakeTimers();
  vi.resetAllMocks();
  mocks.events = {};
  mocks.lifecycle = {};
  mocks.getStatus.mockResolvedValue({ status: 'Live' });
  mocks.getActivePoll.mockResolvedValue(poll);
  mocks.getResults.mockResolvedValue(tallies);
  mocks.start.mockResolvedValue(undefined);
  mocks.invoke.mockResolvedValue(undefined);
  mocks.stop.mockResolvedValue(undefined);
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('session lifecycle synchronization', () => {
  it('loads the active poll and existing results on arrival', async () => {
    const { result } = renderHook(() => useSessionHub('session-1'));
    await flush();
    expect(result.current.activePoll).toEqual(poll);
    expect(result.current.results).toEqual(tallies);
    expect(mocks.invoke).toHaveBeenCalledWith('JoinSession', 'session-1');
  });

  it('shows an ended session after refresh without waiting for a broadcast', async () => {
    mocks.getStatus.mockResolvedValue({ status: 'Ended' });
    const { result } = renderHook(() => useSessionHub('session-1'));
    await flush();
    expect(result.current.sessionEnded).toBe(true);
    expect(result.current.activePoll).toBeNull();
    expect(mocks.getActivePoll).not.toHaveBeenCalled();
  });

  it('clears the poll on session end and ignores later poll broadcasts', async () => {
    const { result } = renderHook(() => useSessionHub('session-1'));
    await flush();
    act(() => mocks.events.SessionEnded('session-1'));
    act(() => mocks.events.PollActivated(poll));
    expect(result.current.sessionEnded).toBe(true);
    expect(result.current.activePoll).toBeNull();
    expect(result.current.results).toBeNull();
  });

  it('does not let an old HTTP response reopen an ended session', async () => {
    let resolvePoll!: (value: typeof poll) => void;
    mocks.getActivePoll.mockReturnValue(new Promise((resolve) => { resolvePoll = resolve; }));
    const { result } = renderHook(() => useSessionHub('session-1'));
    await flush();
    act(() => mocks.events.SessionEnded('session-1'));
    await act(async () => { resolvePoll(poll); });
    expect(result.current.sessionEnded).toBe(true);
    expect(result.current.activePoll).toBeNull();
  });

  it('retries initial connection failure while keeping HTTP snapshots available', async () => {
    mocks.start.mockRejectedValueOnce(new Error('offline'));
    const { result } = renderHook(() => useSessionHub('session-1'));
    await flush();
    expect(result.current.activePoll).toEqual(poll);
    expect(result.current.isConnected).toBe(false);
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(mocks.start).toHaveBeenCalledTimes(2);
    expect(result.current.isConnected).toBe(true);
  });

  it('recovers a missed end notification through periodic status checks', async () => {
    const { result } = renderHook(() => useSessionHub('session-1'));
    await flush();
    mocks.getStatus.mockResolvedValue({ status: 'Ended' });
    await act(async () => { await vi.advanceTimersByTimeAsync(10000); });
    expect(result.current.sessionEnded).toBe(true);
    expect(result.current.activePoll).toBeNull();
  });

  it('stops retries and polling after unmount', async () => {
    mocks.start.mockRejectedValue(new Error('offline'));
    const { unmount } = renderHook(() => useSessionHub('session-1'));
    await flush();
    unmount();
    await act(async () => { await vi.advanceTimersByTimeAsync(20000); });
    expect(mocks.start).toHaveBeenCalledTimes(1);
    expect(mocks.getStatus).toHaveBeenCalledTimes(1);
    expect(mocks.stop).toHaveBeenCalledTimes(1);
  });
});
