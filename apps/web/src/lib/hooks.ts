"use client";

import { useEffect, useRef, useState } from "react";
import { playerMessage } from "./errors";
import { useGame } from "./store";

/**
 * Poll a REST endpoint on an interval.
 * - Returns `undefined` while loading (same semantics as Convex `useQuery`).
 * - Pass `null` as fetcher to skip polling (same as Convex `"skip"` arg).
 * - Re-fetches when the fetcher reference changes (stabilise with `useCallback`).
 */
export function usePolling<T>(fetcher: (() => Promise<T>) | null, intervalMs: number): T | undefined {
  const [data, setData] = useState<T | undefined>(undefined);
  const fetcherRef = useRef(fetcher);

  // Reset data when fetcher reference changes (e.g. switching rooms)
  if (fetcherRef.current !== fetcher) {
    fetcherRef.current = fetcher;
    setData(undefined);
  }

  useEffect(() => {
    if (!fetcher) return;

    let cancelled = false;
    const run = () => {
      fetcher().then((result) => {
        if (!cancelled) setData(result);
      }).catch(() => {
        // Swallow polling errors silently (like Convex useQuery)
      });
    };

    run();
    const id = setInterval(run, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [fetcher, intervalMs]);

  return data;
}

/** Wrap a mutation call with toast-based error handling. */
export function useMutate() {
  const toast = useGame((s) => s.toast);
  return async (fn: () => Promise<unknown>) => {
    try {
      await fn();
    } catch (e) {
      toast(playerMessage(e), "error");
    }
  };
}
