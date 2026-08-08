import { apiClient } from './client';
import type { Poll, PollResults, PollSuggestion, VoteResult } from '../types';

export interface CreatePollPayload {
  question: string;
  options: string[];
  /** Optional — index into `options` of the correct answer. Omit for a plain opinion poll with no right answer. */
  correctOptionIndex?: number | null;
}

export const pollApi = {
  getSessionPolls: (sessionId: string) =>
    apiClient.get<Poll[]>(`/sessions/${sessionId}/polls`).then((res) => res.data),

  create: (sessionId: string, payload: CreatePollPayload) =>
    apiClient.post<Poll>(`/sessions/${sessionId}/polls`, payload).then((res) => res.data),

  activate: (pollId: string) =>
    apiClient.post<Poll>(`/polls/${pollId}/activate`).then((res) => res.data),

  generateSuggestion: (sessionId: string, topic: string) =>
    apiClient
      .post<PollSuggestion>(`/sessions/${sessionId}/polls/generate`, { topic })
      .then((res) => res.data),

  close: (pollId: string) => apiClient.post(`/polls/${pollId}/close`),

  // Public — no auth needed
  getActivePoll: (sessionId: string) =>
    apiClient
      .get<Poll>(`/sessions/${sessionId}/polls/active`)
      .then((res) => (res.status === 204 ? null : res.data))
      .catch((err) => {
        if (err.response?.status === 204) return null;
        throw err;
      }),

  getResults: (pollId: string) =>
    apiClient.get<PollResults>(`/polls/${pollId}/results`).then((res) => res.data),

  vote: (pollId: string, optionId: string, participantId: string) =>
    apiClient
      .post<VoteResult>(`/polls/${pollId}/vote`, { optionId, participantId })
      .then((res) => res.data),
};
