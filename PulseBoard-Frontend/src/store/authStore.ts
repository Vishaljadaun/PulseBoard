import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthResult } from '../types';

interface AuthState {
  token: string | null;
  hostId: string | null;
  name: string | null;
  email: string | null;
  isAuthenticated: boolean;
  setAuth: (result: AuthResult) => void;
  logout: () => void;
}

/**
 * Persisted to localStorage under the key "pulseboard-auth" so a page
 * refresh doesn't log the host out. The axios interceptor (see api/client.ts)
 * reads token directly from this store on every request.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      hostId: null,
      name: null,
      email: null,
      isAuthenticated: false,
      setAuth: (result) =>
        set({
          token: result.token,
          hostId: result.hostId,
          name: result.name,
          email: result.email,
          isAuthenticated: true,
        }),
      logout: () =>
        set({
          token: null,
          hostId: null,
          name: null,
          email: null,
          isAuthenticated: false,
        }),
    }),
    { name: 'pulseboard-auth' }
  )
);
