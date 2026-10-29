"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, TriangleAlert } from "lucide-react";
import {
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  CreatePublicAlertInput,
  PublicAlertChannel,
  PublicAlertLevel,
  PublicAlertDetail,
} from "@/lib/services/officer/public-alerts";
import {
  CHANNEL_OPTIONS,
  LEVEL_LABELS,
  getAlertJurisdiction,
} from "@/lib/services/officer/public-alerts";
import { useDataMode } from "@/components/officer/data-mode/DataModeProvider";
import { getAlertJurisdictionAction } from "@/server/actions/officer/public-alerts";
import { PublicAlertPreview } from "./PublicAlertPreview";

interface Props {
  initial?: PublicAlertDetail;
  /** Author the new draft alert. Resolves the created alert when accepted. */
  onSubmit: (input: CreatePublicAlertInput) => Promise<unknown>;
  onCancel: () => void;
}

const LEVEL_OPTIONS: ReadonlyArray<{ value: PublicAlertLevel; label: string }> =
  Object.keys(LEVEL_LABELS).map((value) => ({
    value: value as PublicAlertLevel,
    label: LEVEL_LABELS[value as PublicAlertLevel],
  }));

const WHOLE_STATE = "__state__";

/**
 * Create-alert flow (surfaces where "+ Create New Alert" leads). Authors a new
 * alert as a Draft through the alert service. The Area field options come from
 * the shared State → LGA geography service — no separate geography list lives
 * here. The live preview shows exactly what residents would receive
 * (aggregate, public-health messaging only).
 */
export function PublicAlertForm({ onSubmit, onCancel, initial }: Props) {
  const { mode } = useDataMode();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [level, setLevel] = useState<PublicAlertLevel>(
    initial?.level ?? "info",
  );
  const [area, setArea] = useState<string>(WHOLE_STATE);
  const [channels, setChannels] = useState<PublicAlertChannel[]>(
    initial?.channels ?? ["web"],
  );
  const [audience, setAudience] = useState(initial?.audience ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [jurisdiction, setJurisdiction] = useState<{
    stateName: string;
    lgas: ReadonlyArray<{ id: string; name: string }>;
  } | null>(null);
  const [jurisdictionError, setJurisdictionError] = useState<string | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    (initial
      ? Promise.resolve({
          stateName: initial.lgaName ?? initial.stateName,
          lgas: [],
        })
      : mode === "live"
        ? getAlertJurisdictionAction()
        : getAlertJurisdiction()
    )
      .then((scope) => {
        if (!cancelled) {
          setJurisdiction({
            stateName: scope.stateName,
            lgas: scope.lgas,
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setJurisdictionError(
            "The authorized jurisdiction could not be loaded. Please try again.",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [mode, initial]);

  const areaLabel = jurisdiction
    ? area === WHOLE_STATE
      ? jurisdiction.stateName
      : (jurisdiction.lgas.find((lga) => lga.id === area)?.name ??
        jurisdiction.stateName)
    : "Loading area...";

  const toggleChannel = (channel: PublicAlertChannel) => {
    setChannels((current) =>
      current.includes(channel)
        ? current.filter((value) => value !== channel)
        : [...current, channel],
    );
  };

  const submit = () => {
    if (busy || !title.trim()) {
      return;
    }
    setBusy(true);
    setError(null);
    onSubmit({
      title: title.trim(),
      level,
      lgaId: area === WHOLE_STATE ? null : area,
      channels,
      audience: audience.trim(),
      body: body.trim(),
    })
      .then(onCancel)
      .catch((err: unknown) => {
        setBusy(false);
        setError(
          err instanceof Error
            ? err.message
            : "The alert could not be created. Please try again.",
        );
      });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {initial ? "Review public alert draft" : "Create new alert"}
        </DialogTitle>
        <DialogDescription>
          Author a new public-health alert. It is saved as a Draft and remains
          unpublished until reviewed. Areas come from the shared State → LGA
          geography.
        </DialogDescription>
      </DialogHeader>

      <div className="flex max-h-[58vh] min-w-0 flex-col gap-5 overflow-y-auto px-px pb-1">
        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="min-w-0 sm:col-span-2">
            <Label htmlFor="alert-title">Title</Label>
            <Input
              id="alert-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={120}
              placeholder="e.g. Cholera Prevention Tips"
              autoFocus
            />
          </div>

          <div className="min-w-0">
            <Label id="alert-level-label">Level</Label>
            <Select
              value={level}
              onValueChange={(next) => {
                if (next) {
                  setLevel(next as PublicAlertLevel);
                }
              }}
            >
              <SelectTrigger
                className="min-w-0 w-full"
                aria-labelledby="alert-level-label"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="start">
                {LEVEL_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-0">
            <Label id="alert-area-label">Area</Label>
            {jurisdictionError ? (
              <div className="flex min-h-8 items-center gap-2 rounded-lg border border-danger-red/30 bg-danger-red/10 px-2.5 text-xs text-danger-red">
                <TriangleAlert
                  className="h-3.5 w-3.5 shrink-0"
                  aria-hidden="true"
                />
                {jurisdictionError}
              </div>
            ) : (
              <Select
                value={area}
                onValueChange={(next) => {
                  if (next) {
                    setArea(next);
                  }
                }}
                disabled={!jurisdiction || Boolean(initial)}
              >
                <SelectTrigger
                  className="min-w-0 w-full"
                  aria-labelledby="alert-area-label"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="start">
                  <SelectItem value={WHOLE_STATE}>
                    {jurisdiction
                      ? `${jurisdiction.stateName} - entire assigned area`
                      : "Loading geography…"}
                  </SelectItem>
                  {jurisdiction
                    ? jurisdiction.lgas.map((lga) => (
                        <SelectItem key={lga.id} value={lga.id}>
                          {lga.name}
                        </SelectItem>
                      ))
                    : null}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="min-w-0 sm:col-span-2">
            <Label htmlFor="alert-audience">Audience</Label>
            <Input
              id="alert-audience"
              value={audience}
              onChange={(event) => setAudience(event.target.value)}
              maxLength={120}
              placeholder="e.g. All Osun residents / Ife Central residents"
            />
          </div>

          <div className="min-w-0">
            <Label id="alert-channels-label">Channels</Label>
            <div
              role="group"
              aria-labelledby="alert-channels-label"
              className="flex flex-wrap gap-x-4 gap-y-2 rounded-lg border border-input px-2.5 py-2"
            >
              {CHANNEL_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-center gap-1.5 text-sm text-foreground"
                >
                  <input
                    type="checkbox"
                    className="size-4 shrink-0 rounded border-input accent-primary-blue"
                    checked={channels.includes(option.value)}
                    onChange={() => toggleChannel(option.value)}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>

          <div className="min-w-0">
            <Label htmlFor="alert-body">Message</Label>
            <textarea
              id="alert-body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={4}
              maxLength={1000}
              placeholder="Write the public-health message residents will receive…"
              className="w-full min-w-0 resize-y rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>
        </div>

        <PublicAlertPreview
          title={title}
          areaLabel={areaLabel}
          level={level}
          body={body}
          channels={channels}
        />

        {error ? (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      <DialogFooter className="mt-2">
        <DialogClose
          render={<Button variant="outline" disabled={busy} />}
          onClick={onCancel}
        >
          Cancel
        </DialogClose>
        <Button
          onClick={submit}
          disabled={busy || !title.trim() || Boolean(jurisdictionError)}
        >
          {busy ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <Plus aria-hidden="true" />
          )}
          {busy
            ? "Saving..."
            : initial
              ? "Save reviewed draft"
              : "Create draft"}
        </Button>
      </DialogFooter>
    </>
  );
}
