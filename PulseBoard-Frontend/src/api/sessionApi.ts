import { apiClient } from './client';
import type { JoinCodeResult, Session, SessionStatus, SessionQuestion, SessionReport } from '../types';

export interface CreateSessionPayload {
  title: string;
  topic: string;
  questions?: SessionQuestion[];
}

export const sessionApi = {
  getReport: (id: string) => apiClient.get<SessionReport>(`/sessions/${id}/report`).then((res) => res.data),
  duplicate: (id: string) => apiClient.post<Session>(`/sessions/${id}/duplicate`).then((res) => res.data),
  getStatus: (id: string) =>
    apiClient.get<{ status: SessionStatus }>(`/sessions/${id}/status`).then((res) => res.data),
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
