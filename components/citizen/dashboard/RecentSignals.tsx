"use client";

import { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  ChevronRight,
  Clock3,
  HeartPulse,
  X,
} from "lucide-react";
import Link from "next/link";
import type { DashboardData, DashboardSignal } from "./demo-data";

function getSignalStyle(title: string) {
  const lower = title.toLowerCase();
  if (lower.includes("headache") || lower.includes("fever") || lower.includes("pain")) {
    return { bg: "#fef2f2", color: "#c63c3c" };
  }
  if (lower.includes("cough") || lower.includes("symptom")) {
    return { bg: "#eff6ff", color: "#1267e8" };
  }
  return { bg: "#ecfdf5", color: "#087f8d" };
}

function splitDateTime(value: string) {
  const [date, time] = value.split("·").map((part) => part.trim());
  return { date: date ?? value, time: time ?? "" };
}

export function RecentSignals({ data }: { data: DashboardData }) {
  const [active, setActive] = useState<DashboardSignal | null>(null);
  return (
    <section className="db-card db-recent" aria-labelledby="recent-title">
      <h2 id="recent-title">Recent Health Signals</h2>
      {data.signals.length ? (
        <>
          <p className="db-muted">Your recently recorded symptoms</p>
          <ul>
            {data.signals.map((signal) => {
              const style = getSignalStyle(signal.title);
              return (
                <li key={signal.id}>
                  <button
                    type="button"
                    className="db-signal-row"
                    onClick={() => setActive(signal)}
                    aria-label={`View ${signal.title} details`}
                  >
                    <span
                      className="db-signal-icon"
                      style={{ background: style.bg, color: style.color }}
                    >
                      <HeartPulse aria-hidden="true" size={18} />
                    </span>
                    <span className="db-signal-body">
                      <span className="db-signal-title">{signal.title}</span>
                      <span className="db-signal-date">{signal.date}</span>
                      <span className="db-signal-status">{signal.status}</span>
                    </span>
                    <span className="db-chevron" aria-hidden="true">
                      <ChevronRight size={16} />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <div className="db-empty">
          <HeartPulse aria-hidden="true" size={32} />
          <h3>Your health story starts here</h3>
          <p>
            Record a symptom or how you feel. Your recent health signals will
            appear here.
          </p>
          <Link href="/report" className="db-report">
            Report Health Signal
          </Link>
        </div>
      )}
      {active && (
        <SignalDetailsModal signal={active} onClose={() => setActive(null)} />
      )}
    </section>
  );
}

function SignalDetailsModal({
  signal,
  onClose,
}: {
  signal: DashboardSignal;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const { date, time } = splitDateTime(signal.date);
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
  return (
    <dialog
      ref={dialog}
      className="db-modal"
      aria-labelledby="db-modal-title"
      aria-describedby="db-modal-desc"
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
        onClose();
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
            onClose();
        }
      }}
    >
      <button
        type="button"
        className="db-modal-close"
        onClick={onClose}
        aria-label="Close health signal details"
      >
        <X aria-hidden="true" size={20} />
      </button>
      <p className="db-modal-kicker">Health Signal Details</p>
      <h2 id="db-modal-title" ref={title} tabIndex={-1}>
        {signal.title}
      </h2>
      <span className="db-signal-status db-modal-status">{signal.status}</span>
      <dl className="db-modal-details">
        <div>
          <dt>
            <CalendarDays aria-hidden="true" size={16} />
            Date
          </dt>
          <dd>{date}</dd>
        </div>
        <div>
          <dt>
            <Clock3 aria-hidden="true" size={16} />
            Time
          </dt>
          <dd>{time || "Not recorded"}</dd>
        </div>
      </dl>
      <p id="db-modal-desc" className="db-modal-note">
        This is a record of information you previously reported.
      </p>
    </dialog>
  );
}