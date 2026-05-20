import { QueryClient } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import { trpc } from "./trpc";

const configuredApiOrigin = import.meta.env.VITE_API_ORIGIN?.replace(/\/$/, "");
const apiOrigin = configuredApiOrigin || "";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: `${apiOrigin}/api/trpc`,
      transformer: superjson,
      headers() {
        if (typeof window === "undefined") return {};
        const headers: Record<string, string> = {};
        const adminToken = localStorage.getItem("tradevisor_admin_session");
        if (adminToken) headers.authorization = `Bearer ${adminToken}`;
        const userToken = localStorage.getItem("tradevisor_user_token");
        if (userToken) headers["x-user-token"] = userToken;
        return headers;
      },
    }),
  ],
});

export { trpcClient };
