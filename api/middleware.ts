import { initTRPC } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const createRouter = t.router;
export const publicQuery = t.procedure;
export const adminQuery = t.procedure.use(({ ctx, next }) => {
  if (!ctx.isAdmin) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Admin authentication required" });
  }
  return next({ ctx });
});
