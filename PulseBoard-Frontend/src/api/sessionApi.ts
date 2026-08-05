import { apiClient } from './client';
import type { JoinCodeResult, Session } from '../types';

export interface CreateSessionPayload {
  title: string;
  topic: string;
}

export const sessionApi = {
  getMySessions: () => apiClient.get<Session[]>('/sessions').then((res) => res.data),

  getById: (id: string) => apiClient.get<Session>(`/sessions/${id}`).then((res) => res.data),

  create: (payload: CreateSessionPayload) =>
    apiClient.post<Session>('/sessions', payload).then((res) => res.data),

  start: (id: string) => apiClient.post<Session>(`/sessions/${id}/start`).then((res) => res.data),

  end: (id: string) => apiClient.post<Session>(`/sessions/${id}/end`).then((res) => res.data),

  // Public — no auth needed, used by the /join page.
  getByJoinCode: (joinCode: string) =>
    apiClient.get<JoinCodeResult>(`/sessions/join/${joinCode}`).then((res) => res.data),
};
