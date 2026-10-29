"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

/** Shared "Go Back" action for error/not-found states (history-back). */
export function BackButton({ label = "Go Back" }: { label?: string }) {
  const router = useRouter();
  return (
    <Button type="button" variant="outline" onClick={() => router.back()}>
      {label}
    </Button>
  );
}
