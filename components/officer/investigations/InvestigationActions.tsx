"use client";

import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Loader2,
  ShieldCheck,
  StickyNote,
  Users,
  type LucideIcon,
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
import type { InvestigationDetail } from "@/lib/services/officer/investigations";
import { ASSIGNMENT_TEAMS } from "@/lib/services/officer/investigations";
import { InvestigationAddNoteDialog } from "./InvestigationAddNoteDialog";

type ActionKind = "add-note" | "assign" | "escalate" | "monitor" | "close";

interface ActionConfig {
  kind: ActionKind;
  label: string;
  description: string;
  icon: LucideIcon;
  tone: string;
}

const ACTIONS: ActionConfig[] = [
  {
    kind: "add-note",
    label: "Add Note",
    description: "Record an internal operational note.",
    icon: StickyNote,
    tone: "bg-primary-blue/10 text-primary-blue",
  },
  {
    kind: "assign",
    label: "Assign to Team",
    description: "Assign or reassign the investigation.",
    icon: Users,
    tone: "bg-primary-blue/10 text-primary-blue",
  },
  {
    kind: "escalate",
    label: "Escalate",
    description: "Raise for state-level coordination.",
    icon: AlertTriangle,
    tone: "bg-warning-amber/10 text-warning-amber",
  },
  {
    kind: "monitor",
    label: "Mark as Monitoring",
    description: "Track passively, no active response.",
    icon: Activity,
    tone: "bg-teal/10 text-teal",
  },
  {
    kind: "close",
    label: "Close Investigation",
    description: "Complete and close this investigation.",
    icon: CheckCircle2,
    tone: "bg-gray-100 text-gray-600",
  },
];

type Message = { tone: "success" | "error"; text: string } | null;

interface Props {
  detail: InvestigationDetail;
  onAddNote: (body: string) => Promise<unknown>;
  onAssign: (team: string) => Promise<unknown>;
  onEscalate: () => Promise<unknown>;
  onMonitor: () => Promise<unknown>;
  onClose: () => Promise<unknown>;
}

/**
 * Officer Action panel. Every action goes through the investigations service —
 * nothing decorative. Consequential actions (escalate, close) confirm first,
 * and the resulting status change is reflected through the refreshed detail.
 */
export function InvestigationActions({
  detail,
  onAddNote,
  onAssign,
  onEscalate,
  onMonitor,
  onClose,
}: Props) {
  const [running, setRunning] = useState<ActionKind | null>(null);
  const [message, setMessage] = useState<Message>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignValue, setAssignValue] = useState<string>(
    ASSIGNMENT_TEAMS[0],
  );
  const [escalateOpen, setEscalateOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);

  const isClosed = detail.status === "closed";
  const isEscalated = detail.status === "escalated";
  const isMonitoring = detail.status === "monitoring";

  const run = async (
    kind: ActionKind,
    task: () => Promise<unknown>,
    successMessage: string,
  ) => {
    setRunning(kind);
    setMessage(null);
    try {
      await task();
      setMessage({ tone: "success", text: successMessage });
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

  const isDisabled = (kind: ActionKind): boolean => {
    if (running !== null) {
      return true;
    }
    switch (kind) {
      case "add-note":
        return false;
      case "assign":
        return isClosed;
      case "escalate":
        return isClosed || isEscalated;
      case "monitor":
        return isClosed || isMonitoring;
      case "close":
        return isClosed;
    }
  };

  const disabledHint = (kind: ActionKind): string | undefined => {
    if (isClosed) {
      return "This investigation is closed.";
    }
    if (kind === "escalate" && isEscalated) {
      return "Already escalated.";
    }
    if (kind === "monitor" && isMonitoring) {
      return "Already monitoring.";
    }
    if (kind === "close" && isClosed) {
      return "Already closed.";
    }
    return undefined;
  };

  const openAction = (kind: ActionKind) => {
    switch (kind) {
      case "add-note":
        setNoteOpen(true);
        break;
      case "assign":
        setAssignOpen(true);
        break;
      case "escalate":
        setEscalateOpen(true);
        break;
      case "monitor":
        void run("monitor", onMonitor, "Investigation marked as monitoring.");
        break;
      case "close":
        setCloseOpen(true);
        break;
    }
  };

  const confirmEscalate = async () => {
    await run(
      "escalate",
      onEscalate,
      "Investigation escalated to the state coordination queue.",
    );
    setEscalateOpen(false);
  };

  const confirmClose = async () => {
    await run("close", onClose, "Investigation closed.");
    setCloseOpen(false);
  };

  const confirmAssign = async () => {
    setAssignOpen(false);
    await run("assign", () => onAssign(assignValue), `Assigned to ${assignValue}.`);
  };

  const handleNoteSubmit = (body: string) => {
    setMessage({ tone: "success", text: "Note added to this investigation." });
    return onAddNote(body);
  };

  return (
    <section
      className="min-w-0 rounded-xl border border-border bg-white shadow-sm"
      aria-label="Officer actions"
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
          Actions update the investigation through the investigations service.
        </p>
      </header>

      <div className="flex flex-col gap-2 p-4">
        {ACTIONS.map((action) => {
          const disabled = isDisabled(action.kind);
          const Icon = action.icon;
          return (
            <button
              key={action.kind}
              type="button"
              onClick={() => openAction(action.kind)}
              disabled={disabled}
              title={disabled ? disabledHint(action.kind) : undefined}
              className="group/action flex w-full items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-left outline-none transition-colors hover:border-primary-blue/40 hover:bg-gray-50/60 focus-visible:ring-2 focus-visible:ring-primary-blue/60 disabled:pointer-events-none disabled:opacity-45"
            >
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                  action.tone,
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-deep-navy">
                  {action.label}
                </span>
                <span className="block text-[11px] leading-snug text-muted-foreground">
                  {action.description}
                </span>
              </span>
              {running === action.kind ? (
                <Loader2
                  className="h-4 w-4 shrink-0 animate-spin text-primary-blue"
                  aria-hidden="true"
                />
              ) : (
                <ChevronRight
                  className="h-4 w-4 shrink-0 text-gray-400 transition-colors group-hover/action:text-primary-blue"
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}

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

      <InvestigationAddNoteDialog
        open={noteOpen}
        onOpenChange={setNoteOpen}
        onSubmit={handleNoteSubmit}
      />

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign to team</DialogTitle>
            <DialogDescription>
              Move ownership of this investigation to an operational team.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Team</span>
            <Select
              value={assignValue}
              onValueChange={(next) => {
                if (typeof next === "string") {
                  setAssignValue(next);
                }
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a team" />
              </SelectTrigger>
              <SelectContent>
                {ASSIGNMENT_TEAMS.map((team) => (
                  <SelectItem key={team} value={team}>
                    {team}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Teams are operational portal entities — never citizens.
            </p>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button onClick={confirmAssign} disabled={!assignValue}>
              {running === "assign" ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : null}
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={escalateOpen} onOpenChange={setEscalateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Escalate investigation</DialogTitle>
            <DialogDescription>
              Escalation raises this investigation to the state oversight
              queue and marks its status as escalated. This is recorded
              through the investigations service and shown on the list.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose
              render={<Button variant="outline" disabled={running === "escalate"} />}
            >
              Cancel
            </DialogClose>
            <Button
              variant="destructive"
              onClick={() => void confirmEscalate()}
              disabled={running === "escalate"}
            >
              {running === "escalate" ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <AlertTriangle aria-hidden="true" />
              )}
              Escalate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={closeOpen} onOpenChange={setCloseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close investigation</DialogTitle>
            <DialogDescription>
              Closing finishes this investigation and removes it from the
              active queue. You can reopen it later from the list.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose
              render={<Button variant="outline" disabled={running === "close"} />}
            >
              Cancel
            </DialogClose>
            <Button
              variant="destructive"
              onClick={() => void confirmClose()}
              disabled={running === "close"}
            >
              {running === "close" ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <CheckCircle2 aria-hidden="true" />
              )}
              Close investigation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}