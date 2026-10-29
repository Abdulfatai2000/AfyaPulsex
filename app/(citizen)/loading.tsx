"use client";
import { usePathname } from "next/navigation";
import { CitizenLoading } from "@/components/citizen/feedback/CitizenLoading";

export default function Loading() {
  const path = usePathname();
  const message =
    path === "/alerts"
      ? "Loading alerts..."
      : path === "/vitals"
        ? "Loading your vitals..."
        : path === "/my-health"
          ? "Loading your health records..."
          : "Preparing your health information...";
  return (
    <CitizenLoading
      message={message}
      layout={path === "/dashboard" || path === "/vitals" ? "cards" : "rows"}
    />
  );
}
