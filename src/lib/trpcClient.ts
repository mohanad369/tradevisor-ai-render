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
        const token = typeof window !== "undefined" ? localStorage.getItem("tradevisor_admin_session") : null;
        return token ? { authorization: `Bearer ${token}` } : {};
      },
    }),
  ],
});

export { trpcClient };
