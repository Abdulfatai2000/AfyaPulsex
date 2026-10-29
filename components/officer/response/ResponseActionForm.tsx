"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  StickyNote,
  Users,
} from "lucide-react";
import { cn } from "@/server/lib/utils";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { ResponseDetail } from "@/lib/services/officer/response";
import {
  RESPONSE_OFFICERS,
  RESPONSE_STAGES,
  nextResponseStage,
} from "@/lib/services/officer/response";

type ActionKind = "advance" | "reassign" | "note";

type Message = { tone: "success" | "error"; text: string } | null;

interface Props {
  detail: ResponseDetail;
  /** Advance the response to the next workflow stage. */
  onAdvance: () => Promise<unknown>;
  /** Reassign the response to another operational officer. */
  onReassign: (officer: string) => Promise<unknown>;
  /** Append an internal, operational note. */
  onAddNote: (body: string) => Promise<unknown>;
}

/**
 * Response Action form. Every action goes through the response service —
 * nothing decorative. Forward transitions only: advancing moves to the next
 * workflow stage, escalations and resolutions confirm first, and the resulting
 * stage change is reflected through the refreshed detail and timeline.
 */
export function ResponseActionForm({
  detail,
  onAdvance,
  onReassign,
  onAddNote,
}: Props) {
  const [running, setRunning] = useState<ActionKind | null>(null);
  const [message, setMessage] = useState<Message>(null);
  const [officer, setOfficer] = useState<string>(detail.assignedTo);
  const [noteBody, setNoteBody] = useState("");
  const [escalateOpen, setEscalateOpen] = useState(false);
  const [resolveOpen, setResolveOpen] = useState(false);

  const currentLabel = RESPONSE_STAGES.find((s) => s.value === detail.status)?.label;
  const next = nextResponseStage(detail.status);
  const nextLabel = next
    ? RESPONSE_STAGES.find((s) => s.value === next)?.label
    : null;
  const isResolved = detail.status === "resolved";

  const run = async (
    kind: ActionKind,
    task: () => Promise<unknown>,
    successText: string,
  ) => {
    setRunning(kind);
    setMessage(null);
    try {
      await task();
      setMessage({ tone: "success", text: successText });
    } catch (err) {
      setMessage({
        tone: "error",
        text:
          err instanceof Error
            ? err.message
            : "The action could not be completed.",
      });
    } finally {
      setRunning(null);
    }
  };

  const busy = running !== null;

  const handleAdvance = () => {
    if (!next || busy) {
      return;
    }
    if (next === "escalated") {
      setEscalateOpen(true);
      return;
    }
    if (next === "resolved") {
      setResolveOpen(true);
      return;
    }
    void run("advance", onAdvance, `Response moved to ${nextLabel}.`);
  };

  const confirmEscalate = async () => {
    setEscalateOpen(false);
    await run(
      "advance",
      onAdvance,
      "Response escalated to the state coordination queue.",
    );
  };

  const confirmResolve = async () => {
    setResolveOpen(false);
    await run("advance", onAdvance, "Response resolved and verified.");
  };

  const handleReassign = () => {
    if (busy || officer === detail.assignedTo) {
      return;
    }
    void run(
      "reassign",
      () => onReassign(officer),
      `Response reassigned to ${officer}.`,
    );
  };

  const handleAddNote = () => {
    const trimmed = noteBody.trim();
    if (busy || !trimmed) {
      return;
    }
    void run("note", () => onAddNote(trimmed), "Note added to this response.");
  };

  return (
    <section
      className="min-w-0 rounded-xl border border-border bg-white shadow-sm"
      aria-label="Response officer actions"
    >
      <header className="border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-deep-navy">
          <ShieldCheck
            className="h-4 w-4 shrink-0 text-primary-blue"
            aria-hidden="true"
          />
          Officer Actions
        </div>
        <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
          Actions update the response through the response service.
        </p>
      </header>

      <div className="flex flex-col gap-4 p-4">
        {/* Workflow advance */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-sm font-medium text-deep-navy">
            <ArrowRight className="h-4 w-4 shrink-0 text-primary-blue" aria-hidden="true" />
            Workflow
          </div>
          <p className="text-[11px] leading-snug text-muted-foreground">
            {isResolved
              ? "This response is resolved — no further workflow stages remain."
              : `Currently ${currentLabel}. Advance moves the response forward through the workflow.`}
          </p>
          <Button
            variant="outline"
            className="w-fit"
            onClick={handleAdvance}
            disabled={busy || !next}
            type="button"
          >
            {running === "advance" ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : null}
            {next ? `Advance to ${nextLabel}` : "Response resolved"}
          </Button>
        </div>

        <div className="border-t border-gray-100" />

        {/* Reassignment */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-sm font-medium text-deep-navy">
            <Users className="h-4 w-4 shrink-0 text-primary-blue" aria-hidden="true" />
            Assigned officer
          </div>
          <div className="flex w-full flex-wrap items-end gap-2">
            <div className="flex min-w-[180px] flex-col gap-1.5">
              <Label htmlFor="response-officer">Officer</Label>
              <Select value={officer} onValueChange={(value) => {
                if (typeof value === "string") {
                  setOfficer(value);
                }
              }}>
                <SelectTrigger id="response-officer" className="w-full">
                  <SelectValue placeholder="Choose an officer" />
                </SelectTrigger>
                <SelectContent>
                  {RESPONSE_OFFICERS.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] leading-relaxed text-muted-foreground">
                Officers are operational portal users — never citizens.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleReassign}
              disabled={busy || officer === detail.assignedTo}
              type="button"
            >
              {running === "reassign" ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : null}
              Reassign
            </Button>
          </div>
        </div>

        <div className="border-t border-gray-100" />

        {/* Internal note */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-sm font-medium text-deep-navy">
            <StickyNote className="h-4 w-4 shrink-0 text-primary-blue" aria-hidden="true" />
            Add internal note
          </div>
          <Label htmlFor="response-note-body" className="sr-only">
            Note
          </Label>
          <textarea
            id="response-note-body"
            value={noteBody}
            onChange={(event) => setNoteBody(event.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="Record an internal, operational note…"
            className="w-full min-w-0 resize-y rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          <Button
            variant="outline"
            className="w-fit"
            onClick={handleAddNote}
            disabled={busy || !noteBody.trim()}
            type="button"
          >
            {running === "note" ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : null}
            Add note
          </Button>
        </div>

        {message ? (
          <p
            role="status"
            aria-live="polite"
            className={cn(
              "rounded-lg px-3 py-2 text-[11px] leading-snug",
              message.tone === "error"
                ? "bg-danger-red/10 text-danger-red"
                : "bg-teal/10 text-teal",
            )}
          >
            {message.text}
          </p>
        ) : null}
      </div>

      <Dialog open={escalateOpen} onOpenChange={setEscalateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Advance to Escalated</DialogTitle>
            <DialogDescription>
              Escalation raises this response to the state coordination queue
              and moves it to the Escalated stage. This is recorded through the
              response service and reflected on the list and timeline.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose
              render={<Button variant="outline" disabled={running === "advance"} />}
            >
              Cancel
            </DialogClose>
            <Button
              variant="destructive"
              onClick={() => void confirmEscalate()}
              disabled={running === "advance"}
            >
              {running === "advance" ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <AlertTriangle aria-hidden="true" />
              )}
              Escalate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={resolveOpen} onOpenChange={setResolveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve response</DialogTitle>
            <DialogDescription>
              Resolving completes this response and moves it to the Resolved
              stage. This is recorded through the response service and reflected
              on the list and timeline.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose
              render={<Button variant="outline" disabled={running === "advance"} />}
            >
              Cancel
            </DialogClose>
            <Button
              variant="destructive"
              onClick={() => void confirmResolve()}
              disabled={running === "advance"}
            >
              {running === "advance" ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <CheckCircle2 aria-hidden="true" />
              )}
              Resolve response
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}