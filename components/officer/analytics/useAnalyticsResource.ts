"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type AnalyticsResourceStatus = "loading" | "ready" | "empty" | "error";

/**
 * Minimal fetch lifecycle for an Analytics tab, mirroring the states used
 * across the Officer Portal (loading / ready / empty / error with retry).
 * The fetcher is only read through a ref (updated in an effect) so a
 * re-created function never triggers re-fetch loops. Pass `deps` (e.g. the
 * active Data Mode) to refetch when an external selection changes.
 */
export function useAnalyticsResource<T>(
  fetcher: () => Promise<T>,
  emptyWhen: (data: T) => boolean = () => false,
  deps: unknown[] = [],
) {
  const [status, setStatus] = useState<AnalyticsResourceStatus>("loading");
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetcherRef = useRef(fetcher);
  const emptyWhenRef = useRef(emptyWhen);

  useEffect(() => {
    fetcherRef.current = fetcher;
    emptyWhenRef.current = emptyWhen;
  }, [fetcher, emptyWhen]);

  const load = useCallback(() => {
    setStatus("loading");
    setError(null);
    fetcherRef.current()
      .then((result) => {
        setData(result);
        setStatus(emptyWhenRef.current(result) ? "empty" : "ready");
      })
      .catch((err: unknown) => {
        setData(null);
        setStatus("error");
        setError(
          (err as Error)?.message ?? "Unable to load analytics data. Please try again.",
        );
      });
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetcherRef.current()
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setStatus(emptyWhenRef.current(result) ? "empty" : "ready");
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setData(null);
          setStatus("error");
          setError(
            (err as Error)?.message ?? "Unable to load analytics data. Please try again.",
          );
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { status, data, error, retry: load };
}