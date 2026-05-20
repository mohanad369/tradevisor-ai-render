import { useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";

/**
 * Fires a single `auth.recordVisit` call per browser session.
 *
 * "Per session" = once per browser tab lifetime (sessionStorage flag).
 * Reloading the page in the same tab does NOT double-count; opening the
 * site in a new tab/visit does. This keeps the counter close to a
 * real "visits" number without storing anything per-visitor.
 *
 * Renders nothing. Safe to mount once at the app root.
 */
const SESSION_FLAG = "tradevisor_visit_counted";

export default function VisitTracker() {
  const recordVisit = trpc.auth.recordVisit.useMutation();
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;

    try {
      if (sessionStorage.getItem(SESSION_FLAG) === "1") return;
      sessionStorage.setItem(SESSION_FLAG, "1");
    } catch {
      // sessionStorage blocked (private mode etc.) — still count once
      // per mount, which is fine.
    }

    // Fire-and-forget. A failed counter must never affect the UI.
    recordVisit.mutate(undefined as void, {
      onError: () => { /* ignored on purpose */ },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
