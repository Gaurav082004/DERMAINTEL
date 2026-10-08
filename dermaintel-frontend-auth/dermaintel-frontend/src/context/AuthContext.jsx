import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as api from '../api/client';

/**
 * AuthContext — real, session-backed authentication.
 *
 * Replaces the previous mock/demo version (which stored a fake session
 * in localStorage/sessionStorage and never talked to a backend). This
 * version holds NO password, NO token, and NO session identifier in
 * React state or browser storage at all -- the session lives entirely
 * in an HttpOnly cookie the browser manages on its own, invisible to
 * JavaScript. All this context does is ask Express "am I logged in?"
 * (GET /api/auth/me) and hold whatever user object comes back.
 *
 * Session restore on load: since there's no longer a synchronous
 * localStorage read to seed initial state from, `user` starts as
 * `undefined` (distinct from `null`, which means "confirmed logged
 * out") and an effect calls GET /me once on mount. `isLoading` is true
 * until that resolves -- consumers (ProtectedRoute in particular) must
 * wait for isLoading to go false before trusting isAuthenticated,
 * otherwise a logged-in user would flash through a "not authenticated"
 * state on every page load/refresh.
 */

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = not checked yet, null = confirmed logged out
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const data = await api.getCurrentUser();
      setUser(data.authenticated ? data.user : null);
    } catch {
      // Network/server failure while checking session status -- treat
      // as logged out rather than leaving the app stuck loading. The
      // user can still retry by logging in again; individual pages
      // handle their own network-error messaging for their own calls.
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const value = useMemo(
    () => ({
      user: user ?? null,
      isAuthenticated: Boolean(user),
      isLoading,

      async signup({ name, email, password }) {
        const created = await api.signup({ name, email, password });
        setUser(created);
        return created;
      },

      async login({ email, password }) {
        const loggedIn = await api.login({ email, password });
        setUser(loggedIn);
        return loggedIn;
      },

      async logout() {
        try {
          await api.logout();
        } finally {
          // Clear local state regardless of whether the request
          // succeeded -- a failed logout call shouldn't leave the UI
          // claiming the user is still authenticated.
          setUser(null);
        }
      },

      /** Re-check session state with the backend (e.g. after email verification). */
      refreshUser,
    }),
    [user, isLoading, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
