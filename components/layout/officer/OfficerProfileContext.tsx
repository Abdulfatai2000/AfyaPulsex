"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getOfficerProfile,
  type OfficerProfile,
} from "@/lib/services/officer/profile";
import { resolveOfficerData } from "@/lib/services/officer/data-mode";
import { useDataMode } from "@/components/officer/data-mode/DataModeProvider";
import { getOfficerProfileLive } from "@/lib/services/officer/live-adapters";

interface OfficerProfileContextValue {
  profile: OfficerProfile | null;
  loading: boolean;
  /** Re-reads the profile from the profile service boundary. */
  refresh: () => Promise<void>;
}

const OfficerProfileContext = createContext<OfficerProfileContextValue | null>(
  null,
);

/**
 * Single UI-wide source of truth for the current officer profile. Reads
 * exclusively through the profile service boundary in the active Data Mode
 * (demo identity or the live session/profile boundary — the header avatar
 * therefore follows the same photo URL as the profile page, with initials
 * as the fallback). Consuming components (topbar menu, headers) receive
 * live updates when the profile is refreshed after an edit.
 */
export function OfficerProfileProvider({ children }: { children: ReactNode }) {
  const { mode } = useDataMode();
  const [profile, setProfile] = useState<OfficerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      // Identity always uses the real session, ignoring Data Mode.
      const data = await getOfficerProfileLive();
      setProfile(data);
    } catch {
      // Non-authoritative display data; keep the previous value on failure.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    // Identity always uses the real session, ignoring Data Mode.
    getOfficerProfileLive().then(
      (data) => {
        if (!cancelled) {
          setProfile(data);
          setLoading(false);
        }
      },
      () => {
        if (!cancelled) {
          setLoading(false);
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(
    () => ({ profile, loading, refresh }),
    [profile, loading, refresh],
  );

  return (
    <OfficerProfileContext.Provider value={value}>
      {children}
    </OfficerProfileContext.Provider>
  );
}

export function useOfficerProfile(): OfficerProfileContextValue {
  const context = useContext(OfficerProfileContext);
  if (!context) {
    throw new Error(
      "useOfficerProfile must be used within an OfficerProfileProvider",
    );
  }
  return context;
}