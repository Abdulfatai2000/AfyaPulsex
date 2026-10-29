"use client";

import { useState } from "react";
import { StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { InvestigationDetail } from "@/lib/services/officer/investigations";
import { formatInvestigationDate } from "@/lib/services/officer/investigations";
import { InvestigationAddNoteDialog } from "./InvestigationAddNoteDialog";

/**
 * Notes tab — internal, operational notes attached to an investigation.
 * Notes are authored by authorized portal officers and never describe a
 * citizen. Newest note first.
 */
export function InvestigationNotes({
  detail,
  onAddNote,
}: {
  detail: InvestigationDetail;
  onAddNote: (body: string) => Promise<unknown>;
}) {
  const [noteOpen, setNoteOpen] = useState(false);
  const notes = detail.notes
    .slice()
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return (
    <section className="min-w-0 rounded-xl border border-border bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-deep-navy">
            Internal notes
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Operational notes visible only inside the authorized portal.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          type="button"
          onClick={() => setNoteOpen(true)}
        >
          <StickyNote aria-hidden="true" />
          Add note
        </Button>
      </div>

      {notes.length === 0 ? (
        <div className="mt-3 rounded-lg border border-dashed border-gray-200 p-4 text-center">
          <p className="text-sm text-muted-foreground">
            No internal notes yet. Use &quot;Add note&quot; when your team has
            an operational update to record.
          </p>
        </div>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {notes.map((note) => (
            <li
              key={note.id}
              className="rounded-lg border border-gray-100 bg-gray-50/50 p-3"
            >
              <p className="text-sm leading-relaxed text-foreground/90">
                {note.body}
              </p>
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                {note.author} ·{" "}
                <time dateTime={note.createdAt}>
                  {formatInvestigationDate(note.createdAt)}
                </time>
              </p>
            </li>
          ))}
        </ul>
      )}

      <InvestigationAddNoteDialog
        open={noteOpen}
        onOpenChange={setNoteOpen}
        onSubmit={onAddNote}
      />
    </section>
  );
}