"use client";
import type { ComponentProps } from "react";
import { Input } from "@/components/ui/input";
export function SearchInput({
  label,
  ...props
}: Omit<ComponentProps<"input">, "type"> & { label: string }) {
  return <Input {...props} type="search" aria-label={label} />;
}
