"use client";
import { createContext, useContext, type ReactNode } from "react";
import type { OfficerDataMode } from "@/lib/services/officer/data-mode";
const DataModeContext = createContext<{ mode: OfficerDataMode; accountId: string } | null>(null);
/** Read-only server-resolved account environment. No cookie/storage override. */
export function DataModeProvider({ children, mode, accountId }: { children: ReactNode; mode: OfficerDataMode; accountId: string }) {
  return <DataModeContext.Provider value={{ mode, accountId }}>{children}</DataModeContext.Provider>;
}
export function useDataMode() {
  const value = useContext(DataModeContext);
  if (!value) throw new Error("DataModeProvider is required.");
  return value;
}
