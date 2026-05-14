import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { verifyAdminSessionToken } from "./lib/security";

export type TrpcContext = {
  req: Request;
  resHeaders: Headers;
  isAdmin: boolean;
};

export async function createContext(
  opts: FetchCreateContextFnOptions,
): Promise<TrpcContext> {
  const authorization = opts.req.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  return {
    req: opts.req,
    resHeaders: opts.resHeaders,
    isAdmin: verifyAdminSessionToken(token),
  };
}
