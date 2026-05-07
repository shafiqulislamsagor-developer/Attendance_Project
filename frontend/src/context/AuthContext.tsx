import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  clearAuthToken,
  getAuthToken,
  getMe,
  loadUser,
  login as loginRequest,
  logoutAllSessions,
  logoutSession,
  saveUser,
  setAuthTokens,
} from "../lib/api";
import type { LoginValues, User } from "../types";

type AuthContextValue = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (values: LoginValues) => Promise<User>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => loadUser());
  const [token, setTokenState] = useState<string | null>(() => getAuthToken());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function hydrate() {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const profile = await getMe();
        if (!mounted) {
          return;
        }
        setUser(profile);
        saveUser(profile);
      } catch {
        clearAuthToken();
        if (mounted) {
          setUser(null);
          setTokenState(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    hydrate();

    return () => {
      mounted = false;
    };
  }, [token]);

  const login = async (values: LoginValues) => {
    const response = await loginRequest(values);
    const accessToken = response.accessToken ?? response.token;
    setAuthTokens(accessToken, response.refreshToken);
    saveUser(response.user);
    setTokenState(accessToken);
    setUser(response.user);
    return response.user;
  };

  const logout = async () => {
    try {
      await logoutSession();
    } finally {
      clearAuthToken();
      setUser(null);
      setTokenState(null);
    }
  };

  const logoutAll = async () => {
    try {
      await logoutAllSessions();
    } finally {
      clearAuthToken();
      setUser(null);
      setTokenState(null);
    }
  };

  const refreshUser = async () => {
    if (!token) {
      return;
    }
    const profile = await getMe();
    setUser(profile);
    saveUser(profile);
  };

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, logout, logoutAll, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
