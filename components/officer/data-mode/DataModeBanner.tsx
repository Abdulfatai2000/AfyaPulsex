"use client";
import { useDataMode } from "./DataModeProvider";
export function DataModeBanner() {
  const { mode } = useDataMode();
  if (mode !== "demo") return null;
  return <p role="status" className="px-4 py-2 text-xs text-amber-900 bg-amber-50">Demo Account · Synthetic Data</p>;
}
