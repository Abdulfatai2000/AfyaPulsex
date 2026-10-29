"use client";

import { useState } from "react";
import { Loader2, StickyNote } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Persist an internal, operational note. Rejects empty bodies. */
  onSubmit: (body: string) => Promise<unknown>;
  title?: string;
}

/**
 * Controlled dialog for adding an internal operational note to an
 * investigation. Never accepts or displays individual/citizen records.
 */
export function InvestigationAddNoteDialog({
  open,
  onOpenChange,
  onSubmit,
  title = "Add internal note",
}: Props) {
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setBody("");
    setError(null);
    setBusy(false);
  };

  const close = () => {
    if (busy) {
      return;
    }
    reset();
    onOpenChange(false);
  };

  const submit = () => {
    if (busy || !body.trim()) {
      return;
    }
    setBusy(true);
    setError(null);
    onSubmit(body.trim())
      .then(() => {
        reset();
        onOpenChange(false);
      })
      .catch((err: unknown) => {
        setBusy(false);
        setError(
          err instanceof Error
            ? err.message
            : "The note could not be saved. Please try again.",
        );
      });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          close();
        } else {
          onOpenChange(true);
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Records an internal, operational note on this investigation. Notes
            are visible only within the authorized portal and never describe a
            citizen.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <Label htmlFor="investigation-note-body">Note</Label>
          <textarea
            id="investigation-note-body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={4}
            maxLength={1000}
            placeholder="Add an internal operational note…"
            className="w-full min-w-0 resize-y rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          {error ? (
            <p className="text-xs text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <DialogClose
            render={<Button variant="outline" disabled={busy} />}
          >
            Cancel
          </DialogClose>
          <Button onClick={submit} disabled={busy || !body.trim()}>
            {busy ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <StickyNote aria-hidden="true" />
            )}
            {busy ? "Saving…" : "Add note"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}