"use client";

import { useRef, useState } from "react";
import {
  Camera,
  CheckCircle2,
  Loader2,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { resolveOfficerData } from "@/lib/services/officer/data-mode";
import { useDataMode } from "@/components/officer/data-mode/DataModeProvider";
import {
  PROFILE_PHOTO_ACCEPT,
  PROFILE_PHOTO_MAX_BYTES,
  removeOfficerProfilePhoto,
  uploadOfficerProfilePhoto,
  validateProfilePhotoFile,
  type OfficerProfile,
} from "@/lib/services/officer/profile";
import {
  removeOfficerProfilePhotoLive,
  uploadOfficerProfilePhotoLive,
} from "@/lib/services/officer/live-adapters";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

interface Props {
  /** Officer's display name (initials fallback + photo alt text). */
  name: string;
  /** Current photo URL; empty/undefined renders the initials fallback. */
  avatarUrl?: string;
  /** Receives the updated profile after a successful change/remove. */
  onProfileChange: (profile: OfficerProfile) => void;
}

/**
 * Profile Photo section — preview, Change Photo and Remove Photo controls.
 * Reads/writes exclusively through the profile service boundary in the
 * active Data Mode (demo mock or live backend). Removing the photo clears
 * the photo URL so every avatar returns to the initials fallback.
 */
export function ProfilePhotoSection({ name, avatarUrl, onProfileChange }: Props) {
  const { mode } = useDataMode();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"upload" | "remove" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const hasPhoto = Boolean(avatarUrl);
  const maxMb = Math.round(PROFILE_PHOTO_MAX_BYTES / (1024 * 1024));

  const resetInput = () => {
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const handleFile = (file: File | undefined) => {
    if (!file || busy) {
      return;
    }
    // Instant client-side validation before any service call.
    const invalid = validateProfilePhotoFile(file);
    if (invalid) {
      setError(invalid);
      setNotice(null);
      resetInput();
      return;
    }
    setBusy("upload");
    setError(null);
    setNotice(null);
    // Centralized Data Mode: demo mock or the live backend endpoint.
    void resolveOfficerData(mode, {
      demo: () => uploadOfficerProfilePhoto(file),
      live: () => uploadOfficerProfilePhotoLive(),
    })
      .then((updated) => {
        setBusy(null);
        setNotice("Profile photo updated.");
        onProfileChange(updated);
        resetInput();
      })
      .catch((err: unknown) => {
        setBusy(null);
        setError(
          err instanceof Error
            ? err.message
            : "Your photo could not be uploaded. Please try again.",
        );
        resetInput();
      });
  };

  const handleRemove = () => {
    if (!hasPhoto || busy) {
      return;
    }
    setBusy("remove");
    setError(null);
    setNotice(null);
    void resolveOfficerData(mode, {
      demo: () => removeOfficerProfilePhoto(),
      live: () => removeOfficerProfilePhotoLive(),
    })
      .then((updated) => {
        setBusy(null);
        setNotice("Profile photo removed. Showing initials.");
        onProfileChange(updated);
      })
      .catch((err: unknown) => {
        setBusy(null);
        setError(
          err instanceof Error
            ? err.message
            : "Your photo could not be removed. Please try again.",
        );
      });
  };

  return (
    <section
      aria-labelledby="profile-photo-heading"
      className="min-w-0 rounded-xl border border-gray-200 bg-white p-5 sm:p-6"
    >
      <h2
        id="profile-photo-heading"
        className="text-sm font-semibold text-deep-navy"
      >
        Profile Photo
      </h2>
      <p className="mt-0.5 max-w-prose text-xs leading-relaxed text-muted-foreground">
        Your photo appears in the portal header and on your profile instead of
        your initials. JPG, PNG or WebP, up to {maxMb} MB.
      </p>

      <div className="mt-4 flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
        <Avatar
          size="lg"
          className="size-20 flex-none border border-border"
          aria-label={
            hasPhoto ? `${name}'s profile photo` : `${name}'s initials avatar`
          }
        >
          {avatarUrl ? (
            <AvatarImage src={avatarUrl} alt={`${name}'s profile photo`} />
          ) : null}
          <AvatarFallback className="bg-primary-blue text-xl text-white">
            {initials(name)}
          </AvatarFallback>
        </Avatar>

        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={inputRef}
              id="profile-photo-input"
              type="file"
              accept={PROFILE_PHOTO_ACCEPT}
              className="sr-only"
              aria-label="Choose a profile photo (JPG, PNG or WebP)"
              disabled={busy !== null}
              onChange={(event) => {
                handleFile(event.target.files?.[0]);
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy !== null}
              onClick={() => inputRef.current?.click()}
              className="min-h-9 gap-1.5"
            >
              {busy === "upload" ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Camera className="size-4" aria-hidden="true" />
              )}
              {busy === "upload"
                ? "Uploading…"
                : hasPhoto
                  ? "Change Photo"
                  : "Upload Photo"}
            </Button>
            {hasPhoto ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy !== null}
                onClick={handleRemove}
                aria-label={`Remove profile photo for ${name}`}
                className="min-h-9 gap-1.5"
              >
                {busy === "remove" ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Trash2 className="size-4" aria-hidden="true" />
                )}
                {busy === "remove" ? "Removing…" : "Remove Photo"}
              </Button>
            ) : null}
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {hasPhoto
              ? "Showing your uploaded photo. Remove it to return to initials."
              : "No photo yet — showing your initials."}
          </p>
        </div>
      </div>

      <div aria-live="polite">
        {notice ? (
          <p
            role="status"
            className="mt-3 flex items-start gap-1.5 rounded-lg border border-success-green/30 bg-success-green/10 px-3 py-2 text-xs font-medium text-success-green"
          >
            <CheckCircle2 className="mt-0.5 size-3.5 flex-none" aria-hidden="true" />
            {notice}
          </p>
        ) : null}
        {error ? (
          <p
            role="alert"
            className="mt-3 flex items-start gap-1.5 rounded-lg border border-danger-red/30 bg-danger-red/10 px-3 py-2 text-xs font-medium text-danger-red"
          >
            <TriangleAlert className="mt-0.5 size-3.5 flex-none" aria-hidden="true" />
            {error}
          </p>
        ) : null}
      </div>
    </section>
  );
}
