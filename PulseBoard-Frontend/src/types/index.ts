export type SessionStatus = 'Draft' | 'Live' | 'Ended';

export interface Session {
  id: string;
  title: string;
  topic: string;
  joinCode: string;
  status: SessionStatus;
  createdAt: string;
  startedAt: string | null;
  endedAt: string | null;
}

export interface AuthResult {
  hostId: string;
  name: string;
  email: string;
  token: string;
}

export interface JoinCodeResult {
  sessionId: string;
  title: string;
  status: SessionStatus;
}

export type PollStatus = 'Draft' | 'Active' | 'Closed';

export interface PollOption {
  id: string;
  text: string;
}

export interface PollSuggestion {
  question: string;
  options: string[];
  correctOptionIndex: number;
}

export interface Poll {
  id: string;
  sessionId: string;
  question: string;
  status: PollStatus;
  createdAt: string;
  activatedAt: string | null;
  closedAt: string | null;
  options: PollOption[];
  /** Only present on host-facing responses (create/list) — never on the public/broadcast poll shape, so participants can't see it before voting. */
  correctOptionId?: string | null;
}

export interface PollOptionResult {
  optionId: string;
  text: string;
  voteCount: number;
}

export interface PollResults {
  pollId: string;
  totalVotes: number;
  options: PollOptionResult[];
}

/** Returned only as the direct response to whoever just voted — never received via SignalR. */
export interface VoteResult {
  results: PollResults;
  selectedOptionId: string;
  isCorrect: boolean | null;
  correctOptionId: string | null;
}

/** Shape of the error payload the backend's ExceptionHandlingMiddleware returns. */
export interface ApiErrorResponse {
  error: string;
}
