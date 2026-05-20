import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { trpc } from "@/lib/trpc";

const TOKEN_KEY = "tradevisor_user_token";

export type AccountUser = {
  userId: string;
  email: string;
  name: string;
  createdAt?: unknown;
};

export type VipStatus = {
  active: boolean;
  plan: string | null;
  expiresAt: unknown;
};

type UserAuthContextType = {
  user: AccountUser | null;
  vip: VipStatus | null;
  isLoggedIn: boolean;
  loading: boolean;
  /** Persist a freshly issued session token + user (called after login/signup). */
  setSession: (token: string, user: AccountUser) => void;
  logout: () => Promise<void>;
  /** Re-fetch the current user from the server. */
  refresh: () => void;
};

const UserAuthContext = createContext<UserAuthContextType>({
  user: null,
  vip: null,
  isLoggedIn: false,
  loading: true,
  setSession: () => {},
  logout: async () => {},
  refresh: () => {},
});

export function useUserAuth() {
  return useContext(UserAuthContext);
}

export function UserAuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(
    typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null,
  );
  const [user, setUser] = useState<AccountUser | null>(null);
  const [vip, setVip] = useState<VipStatus | null>(null);

  const logoutMutation = trpc.auth.logout.useMutation();

  // `auth.me` resolves the session on load. Only enabled when a token exists.
  const meQuery = trpc.auth.me.useQuery(undefined, {
    enabled: Boolean(token),
    retry: false,
  });

  useEffect(() => {
    if (!token) {
      setUser(null);
      setVip(null);
      return;
    }
    if (meQuery.data) {
      if (meQuery.data.loggedIn) {
        setUser(meQuery.data.user as AccountUser);
        setVip(meQuery.data.vip as VipStatus);
      } else {
        // Token no longer valid — clear it.
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
        setVip(null);
      }
    }
  }, [meQuery.data, token]);

  const setSession = useCallback((newToken: string, newUser: AccountUser) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch {
      // Even if the server call fails, clear locally.
    }
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    setVip(null);
  }, [logoutMutation]);

  const refresh = useCallback(() => {
    meQuery.refetch();
  }, [meQuery]);

  const loading = Boolean(token) && meQuery.isLoading;

  return (
    <UserAuthContext.Provider
      value={{
        user,
        vip,
        isLoggedIn: Boolean(user),
        loading,
        setSession,
        logout,
        refresh,
      }}
    >
      {children}
    </UserAuthContext.Provider>
  );
}
