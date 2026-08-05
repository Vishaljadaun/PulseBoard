import { apiClient } from './client';
import type { AuthResult } from '../types';

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export const authApi = {
  register: (payload: RegisterPayload) =>
    apiClient.post<AuthResult>('/auth/register', payload).then((res) => res.data),

  login: (payload: LoginPayload) =>
    apiClient.post<AuthResult>('/auth/login', payload).then((res) => res.data),
};
