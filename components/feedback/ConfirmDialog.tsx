"use client";
import type { ReactNode } from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
export function ConfirmDialog({
  trigger,
  title,
  description,
  children,
}: {
  trigger: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <Dialog>
      <DialogTrigger>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {/* Caller supplies the confirmation action and its pending/error state. */}
        <DialogFooter>
          <DialogClose>Cancel</DialogClose>
          {children}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
