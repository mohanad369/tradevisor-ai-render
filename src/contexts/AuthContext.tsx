import { createContext, useContext, useState, type ReactNode } from "react";

const configuredApiOrigin = import.meta.env.VITE_API_ORIGIN?.replace(/\/$/, "");

function getAdminApiOrigin() {
  if (configuredApiOrigin) return configuredApiOrigin;
  if (typeof window === "undefined") return "";
  if (window.location.protocol === "http:" || window.location.protocol === "https:") {
    return window.location.origin;
  }
  return "";
}

interface AuthContextType {
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isAdmin: false,
  login: async () => false,
  logout: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

function decodeTokenExp(token: string | null): number | null {
  if (!token || !token.includes(".")) return null;
  try {
    const [payload] = token.split(".");
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(atob(normalized)) as { exp?: number };
    return typeof decoded.exp === "number" ? decoded.exp : null;
  } catch {
    return null;
  }
}

function isValidSession(token: string | null): boolean {
  const exp = decodeTokenExp(token);
  return exp !== null && exp > Date.now();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const session = typeof window !== "undefined" ? localStorage.getItem("tradevisor_admin_session") : null;
  const hasAuth = isValidSession(session);

  const [isAuthenticated, setIsAuthenticated] = useState(hasAuth);
  const [isAdmin, setIsAdmin] = useState(hasAuth);

  const login = async (password: string): Promise<boolean> => {
    const apiOrigin = getAdminApiOrigin();
    if (!apiOrigin) return false;
    try {
      const response = await fetch(`${apiOrigin}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!response.ok) return false;
      const data = await response.json() as { token?: string };
      if (!data.token || !isValidSession(data.token)) return false;
      setIsAuthenticated(true);
      setIsAdmin(true);
      localStorage.setItem("tradevisor_admin_session", data.token);
      localStorage.setItem("tradevisor_admin_token", "session");
      return true;
    } catch {
      return false;
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    setIsAdmin(false);
    localStorage.removeItem("tradevisor_admin_token");
    localStorage.removeItem("tradevisor_admin_session");
    window.location.href = "/";
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isAdmin, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
