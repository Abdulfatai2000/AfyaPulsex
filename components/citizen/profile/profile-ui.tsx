import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { Info, ShieldAlert } from "lucide-react";
import { cn } from "@/server/lib/utils";

/** White settings card with an optional title/description and header action. */
export function SettingsCard({
  title,
  description,
  action,
  children,
  className,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("pf-card", className)}>
      {title ? (
        <header className="pf-card-head">
          <div>
            <h3>{title}</h3>
            {description ? <p>{description}</p> : null}
          </div>
          {action}
        </header>
      ) : null}
      {children}
    </section>
  );
}

/** Labeled settings row: title/description on the left, control on the right. */
export function SettingsRow({
  title,
  description,
  control,
}: {
  title: string;
  description?: string;
  control?: ReactNode;
}) {
  return (
    <div className="pf-row">
      <div className="pf-row-body" style={{ minWidth: 0 }}>
        <strong>{title}</strong>
        {description ? <span>{description}</span> : null}
      </div>
      {control}
    </div>
  );
}

/** Accessible switch control (button role="switch"). */
export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="pf-switch"
    />
  );
}

/**
 * Form field wrapper: real label + control + hint/error. The control is cloned
 * to receive the field id, aria-invalid and aria-describedby wiring.
 */
export function Field({
  label,
  id,
  hint,
  error,
  optional,
  children,
  className,
}: {
  label: string;
  id: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const describedBy = [error ? `${id}-error` : null, hint ? `${id}-hint` : null]
    .filter(Boolean)
    .join(" ");
  const control = isValidElement(children)
    ? cloneElement(children as ReactElement<Record<string, unknown>>, {
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy || undefined,
      })
    : children;
  return (
    <div className={cn("pf-field", className)}>
      <label htmlFor={id}>
        {label}
        {optional ? <span className="pf-field-optional">Optional</span> : null}
      </label>
      {control}
      {error ? (
        <p id={`${id}-error`} className="pf-error" role="alert">
          {error}
        </p>
      ) : null}
      {!error && hint ? (
        <p id={`${id}-hint`} className="pf-hint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function PreviewNote({ children }: { children: ReactNode }) {
  return (
    <div className="pf-status pf-status-info">
      <Info aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}

export function WarningNote({ children }: { children: ReactNode }) {
  return (
    <div className="pf-status pf-status-warn">
      <ShieldAlert aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}