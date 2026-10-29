"use client";
import { useState } from "react";
import { Eye, EyeOff, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";

export function AuthField({
  id,
  label,
  type = "text",
  autoComplete,
  placeholder,
  onChange,
  error,
  shakeTrigger = 0,
}: {
  id: string;
  label: string;
  type?: "text" | "email" | "password";
  autoComplete: string;
  placeholder?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string | null;
  shakeTrigger?: number;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className={`ap-form-field ${error ? "ap-form-field--error" : ""} ${shakeTrigger > 0 && error ? "shake" : ""}`} data-shake={shakeTrigger}>
      <label htmlFor={id}>{label}</label>
      <div className="relative">
        <Input
          id={id}
          name={id}
          type={type === "password" && visible ? "text" : type}
          autoComplete={autoComplete}
          placeholder={placeholder}
          required
          className={
            type === "password" ? "ap-form-input pr-12" : "ap-form-input"
          }
          onChange={onChange}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        {type === "password" && (
          <button
            type="button"
            className="ap-password-toggle"
            aria-label={visible ? "Hide password" : "Show password"}
            aria-pressed={visible}
            onClick={() => setVisible(!visible)}
          >
            {visible ? (
              <EyeOff aria-hidden="true" className="size-5" />
            ) : (
              <Eye aria-hidden="true" className="size-5" />
            )}
          </button>
        )}
        {error && (
          <div id={`${id}-error`} className="ap-field-error" role="alert">
            <AlertCircle className="size-3.5" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}