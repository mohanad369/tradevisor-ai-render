import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

// Admin password hash (SHA-256 of "Tradevisor2026!")
const ADMIN_PASSWORD_HASH = "0f18e01da6b8904711c136ffdb98322c1a0fce88199b9c34828a567ddf504460";
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

// Simple hash function
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Synchronous check on first render — no useEffect delay
  const token = typeof window !== 'undefined' ? localStorage.getItem("tradevisor_admin_token") : null;
  const session = typeof window !== 'undefined' ? localStorage.getItem("tradevisor_admin_session") : null;
  const adminApiOrigin = getAdminApiOrigin();
  const hasAuth = adminApiOrigin ? Boolean(session && token === ADMIN_PASSWORD_HASH) : token === ADMIN_PASSWORD_HASH;

  const [isAuthenticated, setIsAuthenticated] = useState(hasAuth);
  const [isAdmin, setIsAdmin] = useState(hasAuth);

  const login = async (password: string): Promise<boolean> => {
    const apiOrigin = getAdminApiOrigin();
    if (apiOrigin) {
      try {
        const response = await fetch(`${apiOrigin}/api/admin/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
        });
        if (!response.ok) return false;
        const data = await response.json() as { token?: string };
        if (!data.token) return false;
        setIsAuthenticated(true);
        setIsAdmin(true);
        localStorage.setItem("tradevisor_admin_session", data.token);
        localStorage.setItem("tradevisor_admin_token", ADMIN_PASSWORD_HASH);
        return true;
      } catch {
        return false;
      }
    }

    const hashed = await hashPassword(password);
    if (hashed === ADMIN_PASSWORD_HASH) {
      setIsAuthenticated(true);
      setIsAdmin(true);
      localStorage.setItem("tradevisor_admin_token", ADMIN_PASSWORD_HASH);
      return true;
    }
    return false;
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
