import { createContext, useContext, useEffect, useReducer, useCallback } from 'react';
import axiosClient from '../api/axiosClient';

// ── State shape ───────────────────────────────────────────────────────────────
const initialState = {
  user:    null,
  token:   null,
  loading: true,   // true while restoring session on mount
};

// ── Reducer ───────────────────────────────────────────────────────────────────
const AUTH_SET     = 'AUTH_SET';
const AUTH_CLEAR   = 'AUTH_CLEAR';
const AUTH_READY   = 'AUTH_READY';

function authReducer(state, action) {
  switch (action.type) {
    case AUTH_SET:
      return { user: action.user, token: action.token, loading: false };
    case AUTH_CLEAR:
      return { user: null, token: null, loading: false };
    case AUTH_READY:
      return { ...state, loading: false };
    default:
      return state;
  }
}

// ── Context ───────────────────────────────────────────────────────────────────
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Restore session on first mount
  useEffect(() => {
    restoreSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Called after a successful login or register API response.
   * Persists token + basic user object to localStorage.
   */
  const login = useCallback((token, refreshToken, user) => {
    localStorage.setItem('sf_token', token);
    localStorage.setItem('sf_refresh_token', refreshToken || '');
    localStorage.setItem('sf_user', JSON.stringify(user));
    dispatch({ type: AUTH_SET, user, token });
  }, []);

  /**
   * Clear auth state and localStorage, redirect to login.
   */
  const logout = useCallback(async () => {
    try {
      await axiosClient.post('/auth/logout');
    } catch {
      // Ignore — we always clear client-side state
    }
    localStorage.removeItem('sf_token');
    localStorage.removeItem('sf_user');
    dispatch({ type: AUTH_CLEAR });
  }, []);

  /**
   * On app boot: try the stored token against GET /auth/me.
   * Sets user from server response (fresh data) or clears state if invalid.
   */
  const restoreSession = useCallback(async () => {
    const token = localStorage.getItem('sf_token');
    if (!token) {
      dispatch({ type: AUTH_READY });
      return;
    }
    try {
      const { data } = await axiosClient.get('/auth/me');
      dispatch({ type: AUTH_SET, user: data.user, token });
    } catch {
      localStorage.removeItem('sf_token');
      localStorage.removeItem('sf_user');
      dispatch({ type: AUTH_CLEAR });
    }
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, restoreSession }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

export default AuthContext;