import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { apiFetch } from "../lib/api";
import { getToken, setToken, clearToken } from "../lib/authStorage";
import { connectSocket, disconnectSocket } from "../lib/socket";

export interface AuthUser {
  id: string;
  orgId: string;
  email: string;
  name: string;
  role: string;
}

interface RegisterInput {
  orgName: string;
  name: string;
  email: string;
  password: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setIsLoading(false);
      return;
    }
    apiFetch<{ user: AuthUser }>("/api/auth/me")
      .then(({ user }) => {
        setUser(user);
        connectSocket(token);
      })
      .catch(() => {
        clearToken();
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    function handleUnauthorized() {
      clearToken();
      setUser(null);
      disconnectSocket();
    }
    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("auth:unauthorized", handleUnauthorized);
  }, []);

  async function login(email: string, password: string) {
    const result = await apiFetch<{ token: string; user: AuthUser }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setToken(result.token);
    setUser(result.user);
    connectSocket(result.token);
  }

  async function register(input: RegisterInput) {
    const result = await apiFetch<{ token: string; user: AuthUser }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(input),
    });
    setToken(result.token);
    setUser(result.user);
    connectSocket(result.token);
  }

  function logout() {
    clearToken();
    setUser(null);
    disconnectSocket();
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
