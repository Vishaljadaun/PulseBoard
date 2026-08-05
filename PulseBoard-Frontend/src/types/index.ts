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

/** Shape of the error payload the backend's ExceptionHandlingMiddleware returns. */
export interface ApiErrorResponse {
  error: string;
}
