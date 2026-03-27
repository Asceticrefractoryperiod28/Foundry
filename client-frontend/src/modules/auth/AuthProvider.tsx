import React, { createContext, useContext, useMemo, useState } from 'react';
import { AuthResult, AuthUser, LoginPayload, RegisterPayload, authApi } from '../../services/authApi';
import { ApiError } from '../../services/apiClient';

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  expiresIn: number | null;
}

interface AuthContextValue extends AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  getErrorMessage: (error: unknown) => string;
}

const AUTH_STORAGE_KEY = 'client_auth_state';

const parseStoredState = (): AuthState => {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return { user: null, accessToken: null, refreshToken: null, expiresIn: null };
    }
    const parsed = JSON.parse(raw) as Partial<AuthState>;
    return {
      user: parsed.user ?? null,
      accessToken: parsed.accessToken ?? null,
      refreshToken: parsed.refreshToken ?? null,
      expiresIn: parsed.expiresIn ?? null,
    };
  } catch {
    return { user: null, accessToken: null, refreshToken: null, expiresIn: null };
  }
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const persistState = (state: AuthState) => {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state));
};

const clearPersistedState = () => {
  localStorage.removeItem(AUTH_STORAGE_KEY);
};

const toAuthState = (result: AuthResult): AuthState => ({
  user: result.user,
  accessToken: result.accessToken,
  refreshToken: result.refreshToken,
  expiresIn: result.expiresIn,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>(() => parseStoredState());
  const [isLoading, setIsLoading] = useState(false);

  const login = async (payload: LoginPayload) => {
    setIsLoading(true);
    try {
      const result = await authApi.login(payload);
      const nextState = toAuthState(result);
      setState(nextState);
      persistState(nextState);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (payload: RegisterPayload) => {
    setIsLoading(true);
    try {
      const result = await authApi.register(payload);
      const nextState = toAuthState(result);
      setState(nextState);
      persistState(nextState);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      if (state.refreshToken) {
        await authApi.logout(state.refreshToken);
      }
    } catch {
      // Ignore logout network/server failures and clear local auth state anyway.
    } finally {
      const emptyState = { user: null, accessToken: null, refreshToken: null, expiresIn: null };
      setState(emptyState);
      clearPersistedState();
      setIsLoading(false);
    }
  };

  const getErrorMessage = (error: unknown): string => {
    if (error instanceof ApiError) {
      const details = error.payload?.details as Record<string, string[] | string> | undefined;
      if (details) {
        const firstDetail = Object.values(details)[0];
        if (Array.isArray(firstDetail)) {
          return firstDetail[0];
        }
        if (typeof firstDetail === 'string') {
          return firstDetail;
        }
      }
      return error.message || 'Request failed';
    }
    if (error instanceof Error) {
      return error.message;
    }
    return 'Unknown error';
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      isAuthenticated: Boolean(state.accessToken && state.user),
      isLoading,
      login,
      register,
      logout,
      getErrorMessage,
    }),
    [state, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
