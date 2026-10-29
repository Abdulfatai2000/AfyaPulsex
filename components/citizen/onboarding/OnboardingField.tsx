import type { ComponentProps } from "react";

type FieldProps = ComponentProps<"input"> & {
  id: string;
  label: string;
  hint?: string;
  error?: string;
};
export function OnboardingField({
  id,
  label,
  hint,
  error,
  ...props
}: FieldProps) {
  return (
    <div className="ob-field">
      <label htmlFor={id}>{label}</label>
      <input
        {...props}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={
          [hint && id + "-hint", error && id + "-error"]
            .filter(Boolean)
            .join(" ") || undefined
        }
      />
      {hint && (
        <p id={id + "-hint"} className="ob-hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={id + "-error"} className="ob-error">
          {error}
        </p>
      )}
    </div>
  );
}
type SelectProps = ComponentProps<"select"> & {
  id: string;
  label: string;
  options: readonly { value: string; label: string }[];
  error?: string;
};
export function OnboardingSelect({
  id,
  label,
  options,
  error,
  ...props
}: SelectProps) {
  return (
    <div className="ob-field">
      <label htmlFor={id}>{label}</label>
      <select {...props} id={id} aria-invalid={error ? true : undefined}>
        {options.map((option) => (
          <option value={option.value} key={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p id={id + "-error"} className="ob-error">
          {error}
        </p>
      )}
    </div>
  );
}
