"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import type { SaveVital, VitalReading, VitalType } from "@/types/vitals";
import { vitalConfigs } from "./config";
import { VitalTypeSelector } from "./VitalTypeSelector";
import { VitalEntryForm } from "./VitalEntryForm";

export function RecordVitalModal({
  initialType,
  onClose,
  saveVital,
  onSaved,
}: {
  initialType?: VitalType;
  onClose: () => void;
  saveVital?: SaveVital;
  onSaved: (readings: VitalReading[]) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const [type, setType] = useState<VitalType | null>(initialType ?? null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const element = dialog.current!;
    const opener = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    element.showModal();
    title.current?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      element.close();
      document.body.style.overflow = overflow;
      opener?.focus();
    };
  }, []);
  function close() {
    if (!busy) onClose();
  }
  return (
    <dialog
      ref={dialog}
      className="vt-modal"
      aria-labelledby="vt-modal-title"
      aria-describedby="vt-modal-description"
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const controls = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>(
            'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]',
          ),
        ).filter((element) => element.getClientRects().length > 0);
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (!first) {
          event.preventDefault();
          title.current?.focus();
        } else if (
          event.shiftKey &&
          (document.activeElement === first ||
            !controls.includes(document.activeElement as HTMLElement))
        ) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          const rect = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom
          )
            close();
        }
      }}
    >
      <button
        className="vt-close"
        onClick={close}
        disabled={busy}
        aria-label="Close Record a Vital"
      >
        <X aria-hidden="true" size={20} />
      </button>
      <h2 id="vt-modal-title" ref={title} tabIndex={-1}>
        {type ? vitalConfigs[type].label : "Record a Vital"}
      </h2>
      <p id="vt-modal-description">
        {type
          ? "Record a Vital · Manual entry"
          : "What would you like to record?"}
      </p>
      {type ? (
        <VitalEntryForm
          key={type}
          type={type}
          saveVital={saveVital}
          onBusy={setBusy}
          onSaved={onSaved}
          onBack={() => {
            setType(null);
            requestAnimationFrame(() => title.current?.focus());
          }}
          onClose={close}
        />
      ) : (
        <VitalTypeSelector onSelect={setType} />
      )}
    </dialog>
  );
}
