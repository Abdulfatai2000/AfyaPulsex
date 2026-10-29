"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { UserRound } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PendingButton } from "../feedback/CitizenLoading";
import { SettingsCard } from "./profile-ui";

const imageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxBytes = 5 * 1024 * 1024;

export function ProfilePhoto() {
  const [photo, setPhoto] = useState<string | null>(null);
  const [selection, setSelection] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false);
  const [notice, setNotice] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const urls = useRef(new Set<string>());
  const generation = useRef(0);
  const busy = useRef(false);

  function release(url: string | null) {
    if (url) {
      URL.revokeObjectURL(url);
      urls.current.delete(url);
    }
  }

  useEffect(() => {
    const owned = urls.current;
    return () => {
      generation.current += 1;
      for (const url of owned) URL.revokeObjectURL(url);
      owned.clear();
    };
  }, []);

  async function choose(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || busy.current) return;
    setError("");
    setNotice("");
    if (!imageTypes.has(file.type)) {
      setError("Choose a JPG, PNG or WebP image.");
      return;
    }
    if (file.size > maxBytes) {
      setError("This image is too large. Choose a file under 5 MB.");
      return;
    }
    busy.current = true;
    setReading(true);
    const token = ++generation.current;
    let url: string | null = null;
    try {
      url = URL.createObjectURL(file);
      urls.current.add(url);
      const image = new Image();
      image.src = url;
      await image.decode();
      if (token !== generation.current) {
        release(url);
        return;
      }
      release(selection);
      setSelection(url);
    } catch {
      release(url);
      if (token === generation.current)
        setError(
          "We could not open that image. Try another JPG, PNG or WebP file.",
        );
    } finally {
      busy.current = false;
      if (token === generation.current) setReading(false);
    }
  }

  return (
    <SettingsCard
      title="Profile photo"
      description="Choose a photo for your Citizen profile."
    >
      <div className="pf-photo-row">
        <Avatar className="pf-photo-avatar">
          {(selection || photo) && (
            <AvatarImage
              src={selection ?? photo ?? undefined}
              alt={selection ? "Selected profile photo" : "Profile photo"}
            />
          )}
          <AvatarFallback>
            <UserRound size={36} aria-label="Default profile avatar" />
          </AvatarFallback>
        </Avatar>
        <div className="pf-photo-controls">
          <p id="photo-hint" className="pf-hint">
            JPG, PNG or WebP, up to 5 MB. Photo changes last until you leave or
            refresh this page.
          </p>
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            tabIndex={-1}
            aria-label="Choose profile photo"
            aria-describedby="photo-hint"
            disabled={reading}
            onChange={choose}
          />
          <div className="pf-actions">
            <PendingButton
              type="button"
              className="pf-btn pf-btn-secondary"
              pending={reading}
              pendingLabel="Preparing photo..."
              onClick={() => input.current?.click()}
            >
              {selection || photo ? "Change photo" : "Add photo"}
            </PendingButton>
            {selection && (
              <>
                <button
                  type="button"
                  className="pf-btn pf-btn-primary"
                  disabled={reading}
                  onClick={() => {
                    release(photo);
                    setPhoto(selection);
                    setSelection(null);
                    setNotice("Photo displayed for this visit.");
                  }}
                >
                  Use photo
                </button>
                <button
                  type="button"
                  className="pf-btn pf-btn-secondary"
                  disabled={reading}
                  onClick={() => {
                    release(selection);
                    setSelection(null);
                    setError("");
                    setNotice("Selection cancelled.");
                  }}
                >
                  Cancel selection
                </button>
              </>
            )}
            {photo && !selection && (
              <button
                type="button"
                className="pf-btn pf-btn-secondary"
                disabled={reading}
                onClick={() => {
                  release(photo);
                  setPhoto(null);
                  setNotice("Photo removed from this page.");
                }}
              >
                Remove photo
              </button>
            )}
          </div>
        </div>
      </div>
      {error && (
        <p role="alert" className="pf-error">
          {error}
        </p>
      )}
      <p role="status" className="pf-hint">
        {reading ? "Preparing your photo..." : notice}
      </p>
    </SettingsCard>
  );
}
