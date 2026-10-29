"use client";

import * as React from "react";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import { Check, CheckCircle2, Send, ArrowLeft, ArrowRight, ShieldCheck, UploadCloud, MapPin, LoaderCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectGroup,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { geographyService } from "@/lib/services/officer/geography";
import { surveillanceAuthorities } from "@/lib/services/officer/organizations/surveillance-authorities";
import type { GeographyState, GeographyLga } from "@/lib/services/officer/geography";
import { validateField, normalizePhone, DESIGNATION_OPTION_VALUES } from "@/lib/validation/validators";
import type { GovernmentLevel } from "@/lib/validation/validators";

import styles from "./AccessRequest.module.css";

const STEP_LABELS = ["Identity", "Level & State", "Jurisdiction & Authority", "Evidence & Review", "Submit"];

const STEP_DESCRIPTIONS = [
  "Introduce yourself using your professional contact details. No password is needed at this stage.",
  "Connect your professional role to the authority you represent.",
  "Select your LGA and the surveillance authority you represent.",
  "Attach your official evidence and check your application details.",
  "Your application is ready for review by the appropriate authority.",
];

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

interface AccessRequestFormData {
  fullName: string;
  email: string;
  phone: string;
  position: string;
  customPosition: string;
  governmentLevel: GovernmentLevel | "";
  stateId: string;
  stateName: string;
  organizationId: string;
  isOtherOrg: boolean;
  customOrgName: string;
  lgaId: string;
  evidenceFile: File | null;
}

const GOVERNMENT_LEVEL_LABELS: Record<GovernmentLevel, string> = {
  federal: "Federal Government",
  state: "State Government",
  local: "Local Government",
};

type FieldErrors = Partial<Record<keyof AccessRequestFormData, string>>;

export function AccessRequestForm() {
  const [step, setStep] = useState(0);
  const [states, setStates] = useState<readonly GeographyState[]>([]);
  const [statesLoading, setStatesLoading] = useState(true);
  const [lgas, setLgas] = useState<readonly GeographyLga[]>([]);
  const [lgasLoading, setLgasLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [touchedFields, setTouchedFields] = useState<Set<keyof AccessRequestFormData>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [emailUnavailable, setEmailUnavailable] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [confirmationOpen, setConfirmationOpen] = useState(false);

  const firstErrorFieldRef = useRef<keyof AccessRequestFormData | null>(null);

  const [data, setData] = useState<AccessRequestFormData>({
    fullName: "",
    email: "",
    phone: "",
    position: "",
    customPosition: "",
    governmentLevel: "",
    stateId: "",
    stateName: "",
    organizationId: "",
    isOtherOrg: false,
    customOrgName: "",
    lgaId: "",
    evidenceFile: null,
  });

  useEffect(() => {
    async function loadStates() {
      try {
        const result = await geographyService.getStates();
        setStates(result);
      } catch {
        // States will be empty; UI shows appropriate message
      } finally {
        setStatesLoading(false);
      }
    }
    loadStates();
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadLgas() {
      if (!data.stateId) {
        if (!cancelled) {
          setLgas([]);
          setLgasLoading(false);
        }
        return;
      }
      setLgasLoading(true);
      try {
        const result = await geographyService.getLgasByState(data.stateId);
        if (!cancelled) {
          setLgas(result);
        }
      } catch {
        if (!cancelled) {
          setLgas([]);
        }
      } finally {
        if (!cancelled) {
          setLgasLoading(false);
        }
      }
    }
    loadLgas();
    return () => { cancelled = true; };
  }, [data.stateId]);

  const organizations = useMemo(() => surveillanceAuthorities(data.governmentLevel, data.stateId, data.lgaId), [data.governmentLevel, data.stateId, data.lgaId]);
  const authorityReady = !!data.governmentLevel && !!data.stateId && (data.governmentLevel !== "local" || organizations.length > 0);

  function updateField(updates: Partial<AccessRequestFormData>) {
    if ("governmentLevel" in updates || "lgaId" in updates) {
      updates = { ...updates, organizationId: "", isOtherOrg: false, customOrgName: "" };
    }
    setData((prev) => ({ ...prev, ...updates }));
    // Clear field errors when user starts typing
    const keys = Object.keys(updates) as (keyof AccessRequestFormData)[];
    setFieldErrors((prev) => {
      const next = { ...prev };
      for (const key of keys) {
        delete next[key];
      }
      return next;
    });
  }

  function handleStateChange(stateId: string | null) {
    if (stateId) {
      const state = states.find((s) => s.id === stateId);
      updateField({
        stateId,
        stateName: state?.name ?? "",
        organizationId: "",
        isOtherOrg: false,
        customOrgName: "",
        lgaId: "",
      });
    } else {
      updateField({
        stateId: "",
        stateName: "",
        organizationId: "",
        isOtherOrg: false,
        customOrgName: "",
        lgaId: "",
      });
    }
  }

  function handleOrganizationSelect(value: string | null) {
    if (!value) return;
    if (value === "__other__") {
      updateField({ organizationId: "", isOtherOrg: true, customOrgName: "" });
    } else {
      updateField({ organizationId: value, isOtherOrg: false, customOrgName: "" });
    }
  }

  function handleCustomOrgNameChange(value: string) {
    updateField({ customOrgName: value });
  }

  function handlePositionSelect(value: string | null) {
    if (!value) return;
    if (value === "Other") {
      updateField({ position: value });
    } else {
      updateField({ position: value, customPosition: "" });
      // A stale custom-designation error must not survive the switch away
      // from "Other".
      setFieldErrors((prev) => {
        if (!prev.customPosition) return prev;
        const next = { ...prev };
        delete next.customPosition;
        return next;
      });
    }
  }

  function handleFileChange(file: File | null) {
    updateField({ evidenceFile: file });
  }

  function validateCurrentStep(): boolean {
    const errors: FieldErrors = {};
    let firstErrorField: (keyof AccessRequestFormData) | null = null;

    if (step === 0) {
      const fullNameErr = validateField("fullName", data.fullName);
      if (fullNameErr) { errors.fullName = fullNameErr; if (!firstErrorField) firstErrorField = "fullName"; }
      const emailErr = validateField("email", data.email);
      if (emailErr) { errors.email = emailErr; if (!firstErrorField) firstErrorField = "email"; }
      const phoneErr = validateField("phone", data.phone);
      if (phoneErr) { errors.phone = phoneErr; if (!firstErrorField) firstErrorField = "phone"; }
    } else if (step === 1) {
      if (!data.stateId) { errors.stateId = "Select your state."; if (!firstErrorField) firstErrorField = "stateId"; }
      const positionErr = validateField("position", data.position);
      if (positionErr) { errors.position = positionErr; if (!firstErrorField) firstErrorField = "position"; }
      if (data.position === "Other") {
        const customPositionErr = validateField("customPosition", data.customPosition);
        if (customPositionErr) { errors.customPosition = customPositionErr; if (!firstErrorField) firstErrorField = "customPosition"; }
      }
      const governmentLevelErr = validateField("governmentLevel", data.governmentLevel);
      if (governmentLevelErr) { errors.governmentLevel = governmentLevelErr; if (!firstErrorField) firstErrorField = "governmentLevel"; }
    } else if (step === 2) {
      if (!data.stateId) { errors.stateId = "Select your state."; if (!firstErrorField) firstErrorField = "stateId"; }
      if (!data.lgaId) { errors.lgaId = "Select your LGA."; if (!firstErrorField) firstErrorField = "lgaId"; }
      if (!data.isOtherOrg && !organizations.some(org => org.id === data.organizationId)) { errors.organizationId = "Select a surveillance authority for your jurisdiction."; if (!firstErrorField) firstErrorField = "organizationId"; }
      if (data.isOtherOrg && !data.customOrgName.trim()) { errors.customOrgName = "Enter your organisation name."; if (!firstErrorField) firstErrorField = "customOrgName"; }
    } else if (step === 3) {
      if (!data.evidenceFile) { errors.evidenceFile = "Evidence file is required."; if (!firstErrorField) firstErrorField = "evidenceFile"; }
    }

    setFieldErrors(errors);
    if (firstErrorField) {
      firstErrorFieldRef.current = firstErrorField;
      setTouchedFields(new Set(Object.keys(errors) as (keyof AccessRequestFormData)[]));
      return false;
    }
    firstErrorFieldRef.current = null;
    return true;
  }

  function handleNext() {
    if (!validateCurrentStep()) {
      requestAnimationFrame(() => {
        const field = firstErrorFieldRef.current;
        if (field) {
          const selector = `[data-field="${field}"]`;
          const el = document.querySelector(selector) as HTMLElement;
          el?.focus();
        }
      });
      return;
    }
    setStep((s) => s + 1);
  }

  async function handleSubmit() {
    if (!validateCurrentStep()) {
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);
    setRequestId(null);
    setConfirmationOpen(false);

    const orgId = data.isOtherOrg ? data.customOrgName : organizations.find(org => org.id === data.organizationId)?.name ?? "";
    const normalizedPhone = normalizePhone(data.phone);
    // Designation (what the applicant does) resolves to the selected option,
    // or to the free-text designation when "Other" is selected. It travels in
    // the existing `position` field of the backend contract.
    const resolvedPosition = data.position === "Other" ? data.customPosition.trim() : data.position;

    try {
      // Multipart submit: the evidence file bytes travel with the request so
      // an authorized approver can review them before deciding. Server-side
      // validation (type/size) remains authoritative.
      const form = new FormData();
      form.append("fullName", data.fullName);
      form.append("email", data.email);
      form.append("phone", normalizedPhone);
      form.append("position", resolvedPosition);
      form.append("governmentLevel", data.governmentLevel);
      form.append("stateId", data.stateId);
      if (data.stateName) {
        form.append("stateName", data.stateName);
      }
      form.append("organization", orgId);
      form.append("isOtherOrg", data.isOtherOrg ? "true" : "false");
      form.append("lgaId", data.lgaId);
      if (data.evidenceFile) {
        form.append("evidenceFile", data.evidenceFile);
      }
      const response = await fetch("/api/officer/access-request", {
        method: "POST",
        // Frontend contract: governmentLevel is a dedicated field.
        // Backend dependency: the POST endpoint must persist it as its own
        // field and must NOT encode it into justification.
        body: form,
      });

      const result = await response.json();
      if (response.status === 202) { setSubmitError(result.message); return; }

      if (!response.ok) {
        if (result.code === "ALREADY_APPROVED") {
          setSubmitError("This account is already an approved officer. Please sign in instead.");
        } else if (result.code === "DUPLICATE_PENDING") {
          setSubmitError("You already have a pending access request. Please check your verification status.");
        } else {
          setSubmitError(result.error || "An error occurred while submitting your request.");
        }
        return;
      }

      setRequestId(typeof result.requestId === "string" ? result.requestId : null);
      setEmailUnavailable(result.emailSent === false);
      setSubmitSuccess(true);
      // No auto-redirect, no auto-login: the applicant reads the confirmation
      // dialog and navigates explicitly via "Check Approval Status".
      setConfirmationOpen(true);
    } catch {
      setSubmitError("An error occurred while submitting your request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleFieldBlur(field: keyof AccessRequestFormData) {
    const validFields = ["fullName","email","phone","position","customPosition","governmentLevel","stateId","organizationId","customOrgName","lgaId","evidenceFile"];
    if (!validFields.includes(field)) return;
    setTouchedFields((prev) => new Set(prev).add(field));
    const error = validateField(field as string, (data[field] as string) ?? "");
    setFieldErrors((prev) => {
      const next = { ...prev };
      if (error) {
        next[field] = error;
      } else {
        delete next[field];
      }
      return next;
    });
  }

  const completedSteps = step;

  const hasFieldError = useCallback(
    (field: keyof AccessRequestFormData) =>
      touchedFields.has(field) && fieldErrors[field] ? true : false,
    [touchedFields, fieldErrors],
  );

  const getFieldError = useCallback(
    (field: keyof AccessRequestFormData): string | undefined => {
      if (touchedFields.has(field)) return fieldErrors[field];
      return undefined;
    },
    [touchedFields, fieldErrors],
  );

  const reviewOrgValue = useMemo(() => {
    if (data.isOtherOrg) return data.customOrgName || "—";
    const org = organizations.find((o) => o.id === data.organizationId);
    return org?.name ?? "—";
  }, [data.isOtherOrg, data.customOrgName, data.organizationId, organizations]);

  const reviewGovernmentLevel = data.governmentLevel
    ? GOVERNMENT_LEVEL_LABELS[data.governmentLevel]
    : "—";

  const reviewPosition =
    data.position === "Other"
      ? data.customPosition.trim() || "—"
      : data.position || "—";

  const reviewItems = [
    { label: "Full Name", value: data.fullName || "—" },
    { label: "Email", value: data.email || "—" },
    { label: "Phone", value: data.phone || "—" },
    { label: "Position", value: reviewPosition },
    { label: "Government Level", value: reviewGovernmentLevel },
    { label: "LGA", value: lgas.find(lga => lga.id === data.lgaId)?.name || "Not selected" },
    { label: "State", value: data.stateName || "—" },
    { label: "Public Health Organisation / Surveillance Authority", value: reviewOrgValue },
    { label: "Evidence", value: data.evidenceFile?.name || "—" },
  ];

  if (submitSuccess) {
    return (
      <div className={styles.form}>
        <Dialog open={confirmationOpen} onOpenChange={setConfirmationOpen}>
          <DialogContent className={styles.confirmation} showCloseButton>
            <DialogHeader className="items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-blue/10">
                <CheckCircle2 className="size-7 text-primary-blue" />
              </div>
              <DialogTitle className="text-xl font-bold text-deep-navy">
                Access request submitted successfully
              </DialogTitle>
              <DialogDescription className="text-center text-sm">
                Your request has been received and is awaiting approval.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2 text-center">
              <p className="text-sm text-muted-foreground">
                Once your request is approved, a notification/email will be sent to
                the email address you provided. Use Check Approval Status to complete
                account setup before signing in to the Officer Portal.
              </p>
              {emailUnavailable && <p role="status" className="text-sm text-amber-800">Your request is saved. Confirmation email is currently unavailable. Use Check Approval Status to follow your request.</p>}
              {requestId && (
                <p className="text-sm text-muted-foreground">
                  Request ID: <span className="font-semibold text-deep-navy">{requestId}</span>
                </p>
              )}
            </div>
            <DialogFooter className="sm:justify-center">
              <Link href="/officer/access-request/status" className="w-full sm:w-auto">
                <Button className="w-full">Check Approval Status</Button>
              </Link>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Card className={styles.card}>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-blue/10">
              <CheckCircle2 className="size-6 text-primary-blue" />
            </div>
            <h3 className="text-lg font-semibold text-deep-navy">
              Access request submitted successfully
            </h3>
            <p className="max-w-md text-sm font-medium text-deep-navy">
              Your request has been received and is awaiting approval.
            </p>
            <p className="max-w-md text-sm text-muted-foreground">
              Once your request is approved, a notification/email will be sent to the
              email address you provided. Use Check Approval Status to complete account setup before signing in to the Officer Portal.
            </p>
            {emailUnavailable && <p role="status" className="text-sm text-amber-800">Your request is saved. Confirmation email is currently unavailable.</p>}
            {requestId && (
              <p className="text-sm text-muted-foreground">
                Request ID: <span className="font-medium text-deep-navy">{requestId}</span>
              </p>
            )}
            <div className="mt-2 flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <Button variant="outline" onClick={() => setConfirmationOpen(true)}>
                View confirmation
              </Button>
              <Link href="/officer/access-request/status">
                <Button className="w-full">Check Approval Status</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={styles.form}>
      <nav aria-label="Application progress" className={styles.progress}>
        <div className={styles.progressCaption}><span>YOUR APPLICATION</span><span>Step {step + 1} of 5</span></div>
        <ol className={styles.steps}>
          {STEP_LABELS.map((label, i) => (
            <li key={label} data-state={i < completedSteps ? "complete" : i === step ? "active" : "upcoming"} aria-current={i === step ? "step" : undefined}>
              <span className={styles.stepNumber}>{i < completedSteps ? <Check size={17} aria-hidden="true" /> : i + 1}</span>
              <span>{label}</span>
            </li>
          ))}
        </ol>
      </nav>

      <Card className={styles.card}>
        <header className={styles.formHeader}>
          <span className={styles.eyebrow}>OFFICER ACCESS APPLICATION / 0{step + 1}</span>
          <h2 tabIndex={-1}>{STEP_LABELS[step]}</h2>
          <p>{STEP_DESCRIPTIONS[step]}</p>
        </header>
        <CardContent className={styles.fields} data-step={step}>
          {step === 2 && <div className={styles.context}><MapPin size={20} aria-hidden="true" /><div><strong>{data.stateName}</strong><p>Your selected state. Use Back to change your government level or state.</p></div></div>}
          {step === 0 && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  data-field="fullName"
                  placeholder="Full name as on official ID"
                  value={data.fullName}
                  onChange={(e) => updateField({ fullName: e.target.value })}
                  onBlur={() => handleFieldBlur("fullName")}
                  aria-invalid={hasFieldError("fullName") || undefined}
                  aria-describedby={getFieldError("fullName") ? "fullName-error" : undefined}
                />
                {getFieldError("fullName") && (
                  <p id="fullName-error" className="text-xs text-danger-red" role="alert">
                    {getFieldError("fullName")}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Official Email</Label>
                <Input
                  id="email"
                  type="email"
                  data-field="email"
                  placeholder="name@health.gov.ng"
                  value={data.email}
                  onChange={(e) => updateField({ email: e.target.value })}
                  onBlur={() => handleFieldBlur("email")}
                  aria-invalid={hasFieldError("email") || undefined}
                  aria-describedby={getFieldError("email") ? "email-error" : undefined}
                />
                {getFieldError("email") && (
                  <p id="email-error" className="text-xs text-danger-red" role="alert">
                    {getFieldError("email")}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  inputMode="tel"
                  data-field="phone"
                  placeholder="+2348012345678 or 08012345678"
                  value={data.phone}
                  onChange={(e) => updateField({ phone: e.target.value })}
                  onBlur={() => handleFieldBlur("phone")}
                  aria-invalid={hasFieldError("phone") || undefined}
                  aria-describedby={getFieldError("phone") ? "phone-error" : undefined}
                />
                {getFieldError("phone") && (
                  <p id="phone-error" className="text-xs text-danger-red" role="alert">
                    {getFieldError("phone")}
                  </p>
                )}
              </div>
              <div className={styles.alreadyApplied}>
                <div className={styles.alreadyAppliedCard}>
                  <div className={styles.alreadyAppliedIcon}>
                    <ShieldCheck size={20} aria-hidden="true" />
                  </div>
                  <div className={styles.alreadyAppliedContent}>
                    <h3>Already applied?</h3>
                    <p>Check the status of your Officer access request.</p>
                  </div>
                  <Link href="/officer/access-request/status" className={styles.alreadyAppliedCta}>
                    <Button variant="outline" className="w-full justify-center gap-2">
                      Check Approval Status
                      <ArrowRight size={16} aria-hidden="true" />
                    </Button>
                  </Link>
                  <p className={styles.alreadyAppliedNote}>You will create your password only after your request is approved.</p>
                </div>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="government-level-select">Government Level</Label>
                <p className="text-xs text-muted-foreground">
                  Select the level of government you work for.
                </p>
                <Select
                  value={data.governmentLevel}
                  onValueChange={(value) => {
                    if (value === "federal" || value === "state" || value === "local") {
                      updateField({ governmentLevel: value });
                    }
                  }}
                >
                  <SelectTrigger id="government-level-select"
                    data-field="governmentLevel"
                    className="w-full"
                    aria-invalid={hasFieldError("governmentLevel") || undefined}
                    aria-describedby={getFieldError("governmentLevel") ? "governmentLevel-error" : undefined}
                  >
                    <SelectValue placeholder="Select government level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="federal">Federal Government</SelectItem>
                      <SelectItem value="state">State Government</SelectItem>
                      <SelectItem value="local">Local Government</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {getFieldError("governmentLevel") && (
                  <p id="governmentLevel-error" className="text-xs text-danger-red" role="alert">
                    {getFieldError("governmentLevel")}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="state-select">State</Label>
                <Select
                  value={data.stateId}
                  onValueChange={(value) => handleStateChange(value || null)}
                  disabled={statesLoading}
                >
                  <SelectTrigger id="state-select"
                    data-field="stateId"
                    className="w-full"
                    aria-invalid={hasFieldError("stateId") || undefined}
                    aria-describedby={getFieldError("stateId") ? "stateId-error" : undefined}
                  >
                    <SelectValue placeholder="Select State" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {statesLoading ? (
                        <SelectItem disabled>Loading states…</SelectItem>
                      ) : states.length === 0 ? (
                        <SelectItem disabled>No states available</SelectItem>
                      ) : (
                        states.map((state) => (
                          <SelectItem key={state.id} value={state.id}>
                            {state.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {getFieldError("stateId") && (
                  <p id="stateId-error" className="text-xs text-danger-red" role="alert">
                    {getFieldError("stateId")}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="position-select">Position / Designation</Label>
                <p className="text-xs text-muted-foreground">
                  Choose your professional designation, such as Disease Surveillance and Notification Officer (DSNO), or another authorised role.
                </p>
                <Select
                  value={data.position}
                  onValueChange={handlePositionSelect}
                >
                  <SelectTrigger id="position-select"
                    data-field="position"
                    className="w-full"
                    aria-invalid={hasFieldError("position") || undefined}
                    aria-describedby={getFieldError("position") ? "position-error" : undefined}
                  >
                    <SelectValue placeholder="Select designation" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {DESIGNATION_OPTION_VALUES.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {getFieldError("position") && (
                  <p id="position-error" className="text-xs text-danger-red" role="alert">
                    {getFieldError("position")}
                  </p>
                )}
              </div>

              {data.position === "Other" && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="custom-position">Please specify your designation</Label>
                  <Input
                    id="custom-position"
                    data-field="customPosition"
                    placeholder="Enter your designation"
                    value={data.customPosition}
                    onChange={(e) => updateField({ customPosition: e.target.value })}
                    onBlur={() => handleFieldBlur("customPosition")}
                    aria-invalid={hasFieldError("customPosition") || undefined}
                    aria-describedby={getFieldError("customPosition") ? "customPosition-error" : undefined}
                  />
                  {getFieldError("customPosition") && (
                    <p id="customPosition-error" className="text-xs text-danger-red" role="alert">
                      {getFieldError("customPosition")}
                    </p>
                  )}
                </div>
              )}

            </>
          )}

          {step === 2 && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="lga-select">LGA</Label>
                <Select
                  value={data.lgaId}
                  onValueChange={(value) => {
                    if (value) updateField({ lgaId: value });
                    else updateField({ lgaId: "" });
                  }}
                  disabled={!data.stateId}
                >
                  <SelectTrigger id="lga-select"
                    data-field="lgaId"
                    className="w-full"
                    aria-invalid={hasFieldError("lgaId") || undefined}
                    aria-describedby={getFieldError("lgaId") ? "lgaId-error" : undefined}
                  >
                    <SelectValue
                      placeholder={data.stateId ? "Select LGA" : "Select state first"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {data.stateId ? (
                      lgasLoading ? (
                        <SelectItem disabled>Loading LGAs…</SelectItem>
                      ) : lgas.length === 0 ? (
                        <SelectItem disabled>No LGAs available</SelectItem>
                      ) : (
                        <SelectGroup>
                          {lgas.map((lga) => (
                            <SelectItem key={lga.id} value={lga.id}>
                              {lga.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      )
                    ) : null}
                  </SelectContent>
                </Select>
                {getFieldError("lgaId") && (
                  <p id="lgaId-error" className="text-xs text-danger-red" role="alert">
                    {getFieldError("lgaId")}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="org-select">Public Health Organisation / Surveillance Authority</Label>
                <Select
                  value={data.isOtherOrg ? "__other__" : data.organizationId}
                  onValueChange={handleOrganizationSelect}
                  disabled={!authorityReady}
                >
                  <SelectTrigger id="org-select"
                    data-field="organizationId"
                    className="w-full"
                    aria-invalid={hasFieldError("organizationId") || undefined}
                    aria-describedby={getFieldError("organizationId") ? "organizationId-error" : undefined}
                  >
                    <SelectValue
                      placeholder={authorityReady ? "Select surveillance authority" : "Select level, state and required LGA first"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {organizations.map(org => <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>)}
                      <SelectItem value="__other__">Other authorised public-health organisation</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Options follow your government level and jurisdiction. Select Other to specify an organisation not covered by these authority types.</p>
                {getFieldError("organizationId") && (
                  <p id="organizationId-error" className="text-xs text-danger-red" role="alert">
                    {getFieldError("organizationId")}
                  </p>
                )}
              </div>

              {data.isOtherOrg && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="custom-org">Your organisation name</Label>
                  <Input
                    id="custom-org"
                    data-field="customOrgName"
                    placeholder="Enter your organisation name"
                    value={data.customOrgName}
                    onChange={(e) => handleCustomOrgNameChange(e.target.value)}
                    onBlur={() => handleFieldBlur("customOrgName")}
                    aria-invalid={hasFieldError("customOrgName") || undefined}
                    aria-describedby={getFieldError("customOrgName") ? "customOrgName-error" : undefined}
                  />
                  {getFieldError("customOrgName") && (
                    <p id="customOrgName-error" className="text-xs text-danger-red" role="alert">
                      {getFieldError("customOrgName")}
                    </p>
                  )}
                </div>
              )}

            </>
          )}

          {step === 3 && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="evidence">Upload Official ID / Letter</Label>
                <FileUploadField
                  file={data.evidenceFile}
                  error={getFieldError("evidenceFile")}
                  onFileChange={handleFileChange}
                />
                <p className="text-xs text-muted-foreground">JPG, JPEG, PNG or PDF. Maximum file size: 5MB.</p>
              </div>
              <div className={styles.review}><h3>Application summary</h3>
                {reviewItems.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between border-b py-2 min-w-0"
                  >
                    <span className="text-sm text-muted-foreground truncate mr-2">
                      {item.label}
                    </span>
                    <span className="text-sm font-medium text-deep-navy text-right truncate">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          {step === 4 && (
            <div className={styles.submitPanel}>
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-blue/10">
                <Send className="size-6 text-primary-blue" />
              </div>
              <h3 className="text-lg font-semibold text-deep-navy">
                Ready for authority review?
              </h3>
              <p>Your details and supporting evidence will be sent to the appropriate reviewing authority. Access is granted only after approval.</p>
              <div className={styles.context}><ShieldCheck size={22} aria-hidden="true" /><span>Check your email for an update after your request is reviewed.</span></div>
              {submitError && (
                <p className="text-sm text-danger-red" role="alert">{submitError}</p>
              )}
            </div>
          )}
        </CardContent>

        <CardFooter className={styles.actions}>
          {step === 0 ? (
            <Button
              variant="outline"
              onClick={() => {/* no-op on first step */}}
              disabled
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
          ) : (
            <Button
              variant="outline"
              disabled={step === 0}
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              className="w-full sm:w-auto"
            >
              <ArrowLeft size={16} aria-hidden="true" /> Back
            </Button>
          )}
          {step < 4 ? (
            <Button
              onClick={handleNext}
              className="w-full sm:w-auto"
            >
              Continue <ArrowRight size={16} aria-hidden="true" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} className="w-full sm:w-auto" disabled={isSubmitting} aria-busy={isSubmitting}>
              {isSubmitting && <LoaderCircle className={styles.spinner} size={17} aria-hidden="true" />}
              {isSubmitting ? "Submitting…" : "Submit Request"}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}

function FileUploadField({
  file,
  error,
  onFileChange,
}: {
  file: File | null;
  error?: string;
  onFileChange: (file: File | null) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [typeError, setTypeError] = useState<string | null>(null);
  const [sizeError, setSizeError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    if (!f) {
      onFileChange(null);
      setTypeError(null);
      setSizeError(null);
      return;
    }
    const typeErr = !ALLOWED_TYPES.includes(f.type)
      ? "Invalid file type. Allowed: JPG, PNG, PDF."
      : null;
    const sizeErr = f.size > MAX_FILE_SIZE
      ? "File exceeds 5MB limit."
      : null;
    onFileChange(f);
    setTypeError(typeErr);
    setSizeError(sizeErr);
  }

  const displayError = error ?? typeError ?? sizeError;

  return (
    <div className="flex flex-col gap-2">
      <div
        className={styles.upload}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          id="evidence"
          data-field="evidenceFile"
          aria-label="Upload official ID or letter"
          aria-invalid={!!displayError}
          aria-describedby={displayError ? "evidence-error" : undefined}
          type="file"
          accept=".jpg,.jpeg,.png,.pdf"
          className="sr-only"
          onChange={handleFileChange}
        />
        <UploadCloud size={28} aria-hidden="true" />
        <span className="text-sm font-medium text-foreground">
          {file ? file.name : "No file chosen"}
        </span>
        <span className="text-xs text-muted-foreground underline underline-offset-2">
          Choose file
        </span>
      </div>
      {displayError ? (
        <p id="evidence-error" className="text-xs text-danger-red" role="alert">{displayError}</p>
      ) : null}
    </div>
  );
}
