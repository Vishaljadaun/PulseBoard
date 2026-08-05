import axios from 'axios';
import { useAuthStore } from '../store/authStore';

/**
 * Single axios instance for the whole app. Base URL comes from Vite's env
 * system — see .env.development. Change VITE_API_BASE_URL there if your
 * backend runs on a different port.
 */
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'https://localhost:7050/api',
});

// Attach the JWT to every outgoing request, if we have one.
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// If the backend ever returns 401 (expired/invalid token), log the host out
// and bounce them to /login instead of leaving them on a broken page.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

/** Pulls the backend's { error: "..." } message out of an axios error, with a sane fallback. */
export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.error ?? error.message ?? 'Something went wrong.';
  }
  return 'Something went wrong.';
}
