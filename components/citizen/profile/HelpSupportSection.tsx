"use client";
import { useState, type FormEvent } from "react";
import {
  ChevronRight,
  FileText,
  Flag,
  HelpCircle,
  MailQuestion,
  ShieldCheck,
} from "lucide-react";
import { Field, PreviewNote, SettingsCard } from "./profile-ui";
import { TermsPrivacyModal } from "@/components/shared/TermsPrivacyModal";


const supportItems = [
  {
    id: "faq",
    title: "Help / FAQ",
    description:
      "Answers to common questions about the citizen app and your data.",
    Icon: HelpCircle,
  },
  {
    id: "report-issue",
    title: "Report an issue",
    description: "Tell us about a problem you ran into while using AfyaPulse.",
    Icon: Flag,
  },
  {
    id: "contact",
    title: "Contact support",
    description: "Reach the AfyaPulse support team for personal help.",
    Icon: MailQuestion,
  },
  {
    id: "privacy",
    title: "Privacy information",
    description: "Learn about privacy and your choices.",
    Icon: ShieldCheck,
  },
  {
    id: "terms",
    title: "Terms",
    description: "Information about using AfyaPulse.",
    Icon: FileText,
  },
] as const;

type SupportId = (typeof supportItems)[number]["id"];

export function HelpSupportSection() {
  const [selected, setSelected] = useState<SupportId | null>(null);

  return (
    <SettingsCard
      title="Help & Support"
      description="Get help with your citizen account and AfyaPulse."
    >
      {supportItems.map(({ id, title, description, Icon }) => (
        <div key={id} className="pf-help-item">
          <button
            type="button"
            id={`help-${id}`}
            className="pf-help-row"
            aria-expanded={selected === id}
            aria-controls={`help-panel-${id}`}
            onClick={() => setSelected((prev) => (prev === id ? null : id))}
          >
            <span className="pf-menu-icon" aria-hidden="true">
              <Icon />
            </span>
            <span className="pf-menu-body">
              <strong>{title}</strong>
              <span>{description}</span>
            </span>
            <ChevronRight aria-hidden="true" className="pf-menu-chevron" />
          </button>
          <div
            id={`help-panel-${id}`}
            role="region"
            aria-labelledby={`help-${id}`}
            hidden={selected !== id}
            className="pf-help-panel"
          >
            {id === "faq" && (
              <div className="pf-faq">
                {faqs.map(([question, answer]) => (
                  <details key={question}>
                    <summary>{question}</summary>
                    <p>{answer}</p>
                  </details>
                ))}
              </div>
            )}
            {id === "report-issue" && <IssueForm />}
            {id === "contact" && (
              <>
                <h4>Contacting support</h4>
                <p>Support contact details are currently unavailable.</p>
                <p>
                  Include the page, what you expected, what happened, and your
                  browser or device. The issue form here can help you prepare
                  these details. Do not include passwords or sensitive health
                  information.
                </p>
                <p>This is not an emergency or clinical advice service.</p>
              </>
            )}
            {id === "privacy" && (
              <>
                <h4>Privacy &amp; Terms of Use</h4>
                <p>
                  Review the AfyaPulse Terms of Use and Privacy Notice to learn
                  about how your information is collected, used and protected.
                </p>
                <TermsPrivacyModal
                  trigger={(openModal) => (
                    <button
                      type="button"
                      className="ap-terms-link"
                      onClick={openModal}
                    >
                      View Terms of Use &amp; Privacy Notice
                    </button>
                  )}
                />
                <p>
                  Review the Privacy &amp; Consent tab for your recorded
                  community contribution choices.
                </p>
                <p>Share only the health information you choose to record.</p>
              </>
            )}
            {id === "terms" && (
              <>
                <h4>Terms of Use</h4>
                <p>
                  The AfyaPulse Terms of Use explain your rights and
                  responsibilities when using the platform.
                </p>
                <TermsPrivacyModal
                  trigger={(openModal) => (
                    <button
                      type="button"
                      className="ap-terms-link"
                      onClick={openModal}
                    >
                      View Terms of Use &amp; Privacy Notice
                    </button>
                  )}
                />
                <p>
                  AfyaPulse does not replace professional diagnosis, treatment
                  or emergency assistance.
                </p>
              </>
            )}
          </div>
        </div>
      ))}
    </SettingsCard>
  );
}

const faqs = [
  [
    "How do I report a health signal?",
    "Open Report, select your symptoms, choose a body area when prompted, add timing and severity, then review your entries.",
  ],
  [
    "How do I record vitals?",
    "Open Record Vitals, select a measurement type, enter the reading and its date and time, then review and submit. Use the units displayed beside each field.",
  ],
  [
    "Where can I see my health history?",
    "Open My Health to browse loaded records and recorded trends. Use the period and category filters to narrow what you see. Only available records are displayed.",
  ],
  [
    "How do public health alerts work?",
    "Open Alerts to read available notices, their affected area, source and publication date. Alerts provide general public-health information, not personalized medical advice.",
  ],
  [
    "Is AfyaPulse a replacement for a doctor?",
    "No. AfyaPulse helps you record and review information. It does not diagnose conditions or replace professional care. For urgent concerns, seek appropriate local medical help.",
  ],
  [
    "How is my health information used?",
    "Health records support your personal history and trends. Review Privacy & Consent for community contribution options.",
  ],
];

function IssueForm() {
  const [submitted, setSubmitted] = useState(false);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitted) return;
    setSubmitted(true);
  }
  return (
    <form onSubmit={submit} onChange={() => setSubmitted(false)}>
      <PreviewNote>
        Prepare the details of your issue here. Do not include passwords or
        sensitive health details.
      </PreviewNote>
      <div className="pf-grid">
        <Field label="Category" id="issue-category">
          <select required defaultValue="">
            <option value="" disabled>
              Select a category
            </option>
            <option>Report a health signal</option>
            <option>My Health / Vitals</option>
            <option>Profile</option>
            <option>Other</option>
          </select>
        </Field>
        <Field label="Subject" id="issue-subject">
          <input required maxLength={120} />
        </Field>
        <Field
          label="Description"
          id="issue-description"
          className="pf-field-full"
          hint="Describe what happened and the steps to reproduce it."
        >
          <textarea required rows={4} maxLength={2000} />
        </Field>
        <Field
          label="Contact email"
          id="issue-email"
          optional
          className="pf-field-full"
        >
          <input type="email" autoComplete="email" />
        </Field>
      </div>
      <div className="pf-actions">
        <button
          type="submit"
          className="pf-btn pf-btn-primary"
          disabled={submitted}
        >
          Prepare issue details
        </button>
      </div>
      {submitted && (
        <p className="pf-status pf-status-info" role="status">
          Your issue has not been sent. Copy these details to share with support
          when a contact is available.
        </p>
      )}
    </form>
  );
}
