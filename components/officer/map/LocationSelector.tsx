"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "cn";
import { geographyService } from "@/lib/services/officer/geography";
import type {
  GeographyLga,
  GeographyState,
} from "@/lib/services/officer/geography";

interface Props {
  /** Current MapFilters.stateId (slug, "" = nothing selected yet). */
  stateId: string;
  /** Current MapFilters.lgaId (slug, "" = the whole state is selected). */
  lgaId: string;
  /** Emits a structurally-valid (stateId, lgaId) pair. */
  onChange: (stateId: string, lgaId: string) => void;
}

const STATE_ACTIVE_ROW = "bg-[#1267E8]/10 text-[#08214A] font-semibold";
const STATE_BASE_ROW = "text-gray-700 hover:bg-gray-50";

/**
 * Hierarchical State -> LGA selector, data-driven through the geography
 * service. The component never sees the reference array directly:
 *
 *   - States are listed via getStates().
 *   - Expanding a State asks for its LGAs via getLgasByState(state.id).
 *   - Selecting an LGA always reports the parent State id taken from the tree
 *     (lga.stateId), never from a display-name search.
 */
export function LocationSelector({ stateId, lgaId, onChange }: Props) {
  const [states, setStates] = useState<readonly GeographyState[] | null>(null);
  const [statesError, setStatesError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [lgasByStateId, setLgasByStateId] = useState<
    Record<string, readonly GeographyLga[]>
  >({});
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set([stateId]),
  );

  // Capture the initially-selected scope once so the effect below only
  // pre-loads the default geography, not every subsequent selection.
  const initialStateId = useRef(stateId);

  useEffect(() => {
    let cancelled = false;
    geographyService
      .getStates()
      .then((loadedStates) => {
        if (!cancelled) {
          setStates(loadedStates);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatesError(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [loadAttempt]);

  // Pre-load the default State's LGAs so the initially-expanded State is
  // immediately usable.
  useEffect(() => {
    const sid = initialStateId.current;
    if (!sid) {
      return;
    }
    let cancelled = false;
    geographyService
      .getLgasByState(sid)
      .then((lgas) => {
        if (!cancelled) {
          setLgasByStateId((prev) => ({ ...prev, [sid]: lgas }));
        }
      })
      .catch(() => {
        // Left unloaded; re-expanding the State retries through the handler.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadLgas = (sid: string) => {
    void geographyService
      .getLgasByState(sid)
      .then((lgas) => {
        setLgasByStateId((prev) => ({ ...prev, [sid]: lgas }));
      })
      .catch(() => {
        // Left unloaded; re-expanding the State retries.
      });
  };

  const handleToggleState = (state: GeographyState) => {
    const isExpanding = !expanded.has(state.id);
    setExpanded((prev) => {
      const next = new Set(prev);
      if (isExpanding) {
        next.add(state.id);
      } else {
        next.delete(state.id);
      }
      return next;
    });
    if (isExpanding && !lgasByStateId[state.id]) {
      loadLgas(state.id);
    }
    // Selecting a State means "aggregate for the entire State".
    onChange(state.id, "");
  };

  const handleSelectLga = (state: GeographyState, lga: GeographyLga) => {
    onChange(state.id, lga.id);
  };

  const selectedState = states?.find((s) => s.id === stateId) ?? null;
  const selectedLga =
    lgasByStateId[stateId]?.find((l) => l.id === lgaId) ?? null;

  if (statesError) {
    return (
      <div className="flex flex-col items-start gap-2 p-1">
        <p className="text-xs text-gray-500">
          Could not load available locations.
        </p>
        <button
          type="button"
          onClick={() => setLoadAttempt((n) => n + 1)}
          className="text-xs font-medium text-[#1267E8] hover:underline"
        >
          Retry locations
        </button>
      </div>
    );
  }

  return (
    <div className="min-w-0">
      {states ? (
        <ul className="min-w-0 space-y-1" aria-label="Select location">
          {states.map((state) => {
            const open = expanded.has(state.id);
            const stateSelected = stateId === state.id;
            const lgas = lgasByStateId[state.id];
            const loadingLgas = open && !lgas;

            return (
              <li key={state.id} className="min-w-0">
                <button
                  type="button"
                  aria-expanded={open}
                  aria-controls={`lga-panel-${state.id}`}
                  aria-current={stateSelected ? "true" : undefined}
                  onClick={() => handleToggleState(state)}
                  className={cn(
                    "flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#1267E8]/60",
                    stateSelected ? STATE_ACTIVE_ROW : STATE_BASE_ROW,
                  )}
                >
                  {open ? (
                    <ChevronDown
                      className="h-3.5 w-3.5 shrink-0 text-gray-400"
                      aria-hidden="true"
                    />
                  ) : (
                    <ChevronRight
                      className="h-3.5 w-3.5 shrink-0 text-gray-400"
                      aria-hidden="true"
                    />
                  )}
                  <span
                    className={cn(
                      "h-2.5 w-2.5 shrink-0 rounded-full border",
                      stateSelected
                        ? "border-[#1267E8] bg-[#1267E8]"
                        : "border-gray-300 bg-white",
                    )}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 truncate">{state.name}</span>
                  {stateSelected && lgaId === "" && (
                    <span className="shrink-0 text-[10px] font-medium text-[#1267E8]">
                      Entire state
                    </span>
                  )}
                </button>

                {open && (
                  <div
                    id={`lga-panel-${state.id}`}
                    role="region"
                    aria-label={`${state.name} local government areas`}
                    className="ml-4 mt-0.5 border-l border-gray-200 pl-2"
                  >
                    {loadingLgas ? (
                      <div className="animate-pulse px-2 py-1.5 pl-3 text-xs text-gray-400">
                        Loading LGAs...
                      </div>
                    ) : (
                      <ul
                        role="listbox"
                        aria-label={`${state.name} LGAs`}
                        className="min-w-0 space-y-0.5"
                      >
                        {(lgas ?? []).map((lga) => {
                          const selected = stateSelected && lgaId === lga.id;
                          return (
                            <li key={lga.id} role="presentation" className="min-w-0">
                              <button
                                type="button"
                                role="option"
                                aria-selected={selected}
                                onClick={() => handleSelectLga(state, lga)}
                                className={cn(
                                  "flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 pl-3 text-left text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#1267E8]/60",
                                  selected
                                    ? "bg-[#1267E8]/10 font-medium text-[#08214A]"
                                    : "text-gray-600 hover:bg-gray-50",
                                )}
                              >
                                <span
                                  className={cn(
                                    "h-2 w-2 shrink-0 rounded-full border",
                                    selected
                                      ? "border-[#1267E8] bg-[#1267E8]"
                                      : "border-gray-300 bg-white",
                                  )}
                                  aria-hidden="true"
                                />
                                <span className="min-w-0 flex-1 truncate">
                                  {lga.name}
                                </span>
                                {selected && (
                                  <Check
                                    className="h-3 w-3 shrink-0 text-[#1267E8]"
                                    aria-hidden="true"
                                  />
                                )}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <div
          className="flex flex-col gap-2 p-1"
          aria-label="Loading location options"
          aria-busy="true"
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-4 w-full animate-pulse rounded bg-gray-100"
            />
          ))}
        </div>
      )}

      <p className="mt-1.5 border-t border-gray-100 px-2 pt-1.5 text-[10px] text-gray-400">
        Selected: {selectedState?.name ?? stateId}
        {lgaId ? ` / ${selectedLga?.name ?? lgaId}` : " / Entire state"}
      </p>
    </div>
  );
}