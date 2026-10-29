import { forwardRef } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ExternalLink,
  Landmark,
  MapPin,
  ShieldCheck,
} from "lucide-react";

import type { CitizenPublicAlert } from "@/types/public-alerts";
import {
  AlertCategoryBadge,
  alertCategories,
} from "./AlertCategoryBadge";
import { alertDate, safePublicUrl } from "./data";

interface AlertDetailsProps {
  alert: CitizenPublicAlert;
  onBack: () => void;
  demo: boolean;
}

export const AlertDetails = forwardRef<
  HTMLHeadingElement,
  AlertDetailsProps
>(function AlertDetails({ alert, onBack, demo }, ref) {
  const Icon = alertCategories[alert.category].Icon;
  const url = safePublicUrl(alert.learnMoreUrl);

  return (
    <article className="al-detail-card">
      <button
        type="button"
        className="al-back"
        onClick={onBack}
      >
        <ArrowLeft aria-hidden="true" size={17} />
        Back to alerts
      </button>

      <header className="al-detail-header">
        <div className="al-detail-heading-row">
          <div className="al-detail-category">
            <span
              className={`al-icon al-detail-icon al-${alert.category}`}
            >
              <Icon aria-hidden="true" />
            </span>

            <AlertCategoryBadge category={alert.category} />
          </div>

          <span className="al-published">
            Published {alertDate(alert.publishedAt)}
          </span>
        </div>

        <h2 ref={ref} tabIndex={-1}>
          {alert.title}
        </h2>

        <p className="al-detail-summary">
          {alert.summary}
        </p>

        {demo && (
          <div className="al-demo-detail">
            Fictional UI example — not a current public-health
            notice.
          </div>
        )}
      </header>

      <dl className="al-metadata">
        <div className="al-meta-item">
          <MapPin aria-hidden="true" />

          <div>
            <dt>Affected Area</dt>
            <dd>{alert.affectedArea.label}</dd>
          </div>
        </div>

        <div className="al-meta-item">
          <CalendarDays aria-hidden="true" />

          <div>
            <dt>Date Published</dt>
            <dd>
              <time dateTime={alert.publishedAt}>
                {alertDate(alert.publishedAt)}
              </time>
            </dd>
          </div>
        </div>

        {alert.issuedBy && (
          <div className="al-meta-item">
            <Landmark aria-hidden="true" />

            <div>
              <dt>Issued By</dt>
              <dd>{alert.issuedBy}</dd>
            </div>
          </div>
        )}
      </dl>

      {alert.updatedAt && (
        <p className="al-updated">
          Last updated{" "}
          <time dateTime={alert.updatedAt}>
            {alertDate(alert.updatedAt)}
          </time>
        </p>
      )}

      <section className="al-detail-section">
        <h3>What You Need to Know</h3>
        <p>{alert.details}</p>
      </section>

      <section className="al-guidance-panel">
        <h3>What You Can Do</h3>

        {alert.guidance?.length ? (
          <ul className="al-guidance">
            {alert.guidance.map((item, index) => (
              <li key={`${alert.id}-guidance-${index}`}>
                <span className="al-check">
                  <Check aria-hidden="true" />
                </span>

                <span>{item}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p>
            No additional guidance is attached to this notice.
          </p>
        )}
      </section>

      {url && (
        <section className="al-learn-panel">
          <div>
            <h3>Learn More</h3>
            <p>
              View additional public information related to this
              notice.
            </p>
          </div>

          <a
            className="al-learn"
            href={url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Learn More
            <ExternalLink aria-hidden="true" />
            <span className="al-sr-only">
              {" "}
              about {alert.title} (opens in a new tab)
            </span>
          </a>
        </section>
      )}

      <section className="al-safety">
        <ShieldCheck aria-hidden="true" />

        <div>
          <h3>This is not a diagnosis</h3>

          <p>
            This alert provides general information and guidance
            for the public. It does not provide medical diagnosis
            or treatment advice.
          </p>
        </div>
      </section>
    </article>
  );
});