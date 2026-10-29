/** Account-selected data environment. Server actions independently enforce isolation. */
export type OfficerDataMode = "demo" | "live";
export const LIVE_DATA_ERROR_MESSAGE = "Unable to load live data. Please try again.";

/**
 * Error thrown by the Live adapter. `code` maps onto the portal's existing
 * data-state vocabulary (unauthorized / session-expired / empty / error) so
 * pages keep rendering their existing states.
 */
export class LiveDataError extends Error {
  constructor(
    public code: "unauthorized" | "session-expired" | "empty" | "error",
    message: string = LIVE_DATA_ERROR_MESSAGE,
  ) {
    super(message);
    this.name = "LiveDataError";
  }
}

/**
 * User-safe messages for Live failures, keyed by failure code. Raw error
 * text (network errors, server responses, auth internals) must NEVER reach
 * the UI — pages render `err.message`, so the message stored here IS the
 * user-facing copy. Technical details stay in server logs.
 */
const SESSION_EXPIRED_MESSAGE =
  "Your session has expired. Please sign in again.";
const UNAUTHORIZED_MESSAGE =
  "You don't have permission to access this data. If you believe this is a mistake, contact your administrator.";

/**
 * Normalize any Live failure into a LiveDataError. Server-action auth
 * failures surface as unauthorized/session-expired; everything else becomes
 * the professional live-load error. NEVER returns demo data and NEVER
 * preserves raw error text.
 */
export function toLiveDataError(err: unknown): LiveDataError {
  if (err instanceof LiveDataError) return err;
  const message = err instanceof Error ? err.message : "";
  const normalized = message.toLowerCase();
  if (/session.{0,12}expired|sign.?in again|not authenticated/.test(normalized)) {
    return new LiveDataError("session-expired", SESSION_EXPIRED_MESSAGE);
  }
  if (
    /unauthorized|forbidden|not authori|access (is |was )?restricted|outside your authori|jurisdiction/.test(
      normalized,
    )
  ) {
    return new LiveDataError("unauthorized", UNAUTHORIZED_MESSAGE);
  }
  return new LiveDataError("error", LIVE_DATA_ERROR_MESSAGE);
}

/**
 * Central gateway: run the demo fetcher or the live fetcher depending on the
 * active mode. Pages call this instead of branching on the mode themselves.
 * Live errors propagate (mapped via `toLiveDataError`) — no silent fallback.
 */
export async function resolveOfficerData<T>(
  mode: OfficerDataMode,
  fetchers: { demo: () => Promise<T>; live: () => Promise<T> },
): Promise<T> {
  if (mode === "demo") {
    return fetchers.demo();
  }
  try {
    return await fetchers.live();
  } catch (err) {
    throw toLiveDataError(err);
  }
}

/**
 * Map a fetch failure onto the portal's existing data-state vocabulary.
 * Demo service errors (e.g. `*ServiceError` with code "unauthorized") keep
 * their meaning; Live failures arrive as LiveDataError. Pages without a
 * session-expired state should collapse that outcome to "error".
 */
export function mapFetchErrorStatus(
  err: unknown,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ServiceErrorClass?: new (...args: any[]) => Error,
): "unauthorized" | "session-expired" | "error" {
  if (ServiceErrorClass && err instanceof ServiceErrorClass) {
    const code = (err as { code?: unknown }).code;
    if (code === "unauthorized") {
      return "unauthorized";
    }
  }
  if (err instanceof LiveDataError) {
    return err.code === "empty" ? "error" : err.code;
  }
  return "error";
}

/**
 * Live adapter for domains with no real backend endpoint yet. Throwing here
 * drives the page's existing error state ("Unable to load live data. Please
 * try again.") instead of demo data.
 */
export function unavailableLive<T = never>(domain: string): Promise<T> {
  return Promise.reject(
    new LiveDataError("error", `${LIVE_DATA_ERROR_MESSAGE} (No live ${domain} service is connected yet.)`),
  );
}
