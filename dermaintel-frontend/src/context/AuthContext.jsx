import { createContext, useContext, useEffect, useMemo, useState } from 'react';

/**
 * AuthContext — MOCK / DEMO ONLY.
 *
 * There is no backend, no API call, and no password is ever stored
 * anywhere (not in state, not in storage). "Login" just records an
 * email and a timestamp as the current demo session, optionally
 * persisted in localStorage (if "remember" is checked) or
 * sessionStorage (if not) purely so a page refresh doesn't
 * immediately log the demo user out.
 *
 * This must be replaced with real authentication before this app
 * ever talks to a real backend.
 */

const AuthContext = createContext(null);
const STORAGE_KEY = 'dermaintel_demo_session';

function readStoredSession() {
  try {
    const fromLocal = localStorage.getItem(STORAGE_KEY);
    const fromSession = sessionStorage.getItem(STORAGE_KEY);
    const raw = fromLocal || fromSession;
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readStoredSession());

  useEffect(() => {
    // Keep multiple tabs roughly in sync for the demo session.
    function handleStorage(event) {
      if (event.key === STORAGE_KEY) {
        setUser(readStoredSession());
      }
    }
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      /**
       * login — mock only. Accepts an email and a "remember" flag.
       * Never receives or stores a password.
       */
      login({ email, remember }) {
        const session = { email, loggedInAt: Date.now() };
        setUser(session);
        const storage = remember ? localStorage : sessionStorage;
        const other = remember ? sessionStorage : localStorage;
        storage.setItem(STORAGE_KEY, JSON.stringify(session));
        other.removeItem(STORAGE_KEY);
      },
      logout() {
        setUser(null);
        localStorage.removeItem(STORAGE_KEY);
        sessionStorage.removeItem(STORAGE_KEY);
      },
    }),
    [user]
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
