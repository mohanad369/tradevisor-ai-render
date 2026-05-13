import { describe, expect, it } from "vitest";
import { appRouter } from "./router";

describe("appRouter", () => {
  it("responds to ping", async () => {
    const caller = appRouter.createCaller({
      req: new Request("http://localhost/api/trpc"),
      resHeaders: new Headers(),
    });

    await expect(caller.ping()).resolves.toEqual({ ok: true });
  });
});
