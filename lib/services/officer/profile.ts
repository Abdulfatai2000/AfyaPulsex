import { getOfficerProfileAction, getOfficerDataAccessAction, requireDemoSettingsAction } from "@/server/actions/officer/profile";
/**
 * Officer profile & settings — typed frontend adapter (single service boundary).
 *
 * This module is the ONLY way the Profile & Settings UI reads/writes account
 * information. All mock data lives here — never inside React components. The
 * backend developer can replace the mock bodies without rebuilding the UI.
 *
 * PRIVACY CONTRACT (DEV4):
 * - Contains only account/operational metadata (name, role, organization,
 *   jurisdiction, preferences). No citizen records, no patient records, no
 *   individual health information, no authentication secrets/tokens/passwords.
 * - Authorization (role, verification status, approval rights, jurisdiction
 *   scope) is backend-controlled and read-only from the UI.
 *
 * TODO(DEV3): replace mock implementations with real backend API. Keep signatures.
 * TODO(DEV4): enforce authorization/server-side validation; never allow the UI
 *   to mutate authorization-controlled fields.
 */

export type OfficerVerificationStatus = "verified" | "pending";

export interface OfficerProfile {
  name: string;
  role: string;
  email?: string;
  phone?: string;
  organization?: string;
  jurisdiction?: string;
  avatarUrl?: string;
  verificationStatus?: OfficerVerificationStatus;
  /** Read-only: whether the account is considered active in the system. */
  active?: boolean;
}

export interface SignOutResult {
  /** Number of sessions sign-out would end (server decides). */
  sessionsEnded: number;
}

/** Fields that may be edited by the officer via the UI (non-authoritative). */
export type EditableOfficerProfile = Pick<
  OfficerProfile,
  "name" | "email" | "phone" | "organization" | "avatarUrl"
>;

/** Security settings — non-sensitive metadata only (no secrets). */
export interface OfficerSecuritySettings {
  /** Whether the officer can change their password via this portal. */
  canChangePassword: boolean;
  /** Approximate count of active sessions/devices (server-authoritative). */
  activeSessionsCount: number;
  /** Whether "sign out of other sessions" is supported by the auth system. */
  canSignOutOthers: boolean;
  /** Optional last sign-in timestamp (aggregate/metadata only). */
  lastSignInAt?: string;
}

/** Notification preference toggles (officer-facing operational prefs). */
export interface OfficerNotificationPreferences {
  healthSignalNotifications: boolean;
  investigationNotifications: boolean;
  accessRequestNotifications: boolean;
  systemNotifications: boolean;
}

/** Application/user preferences supported by the app. */
export interface OfficerUserPreferences {
  /** Default UI theme preference. */
  theme: "light" | "dark" | "system";
  /** Display preference for dates/times. */
  dateTimeFormat: "dd/mm/yyyy" | "mm/dd/yyyy" | "iso";
  /** Default landing/dashboard view. */
  defaultDashboard: "overview" | "map" | "explorer";
  /** Whether to show compact tables/lists by default. */
  compactMode: boolean;
}

/** Data access (read-only authorization scope) for display only. */
export interface OfficerDataAccess {
  role: string;
  jurisdiction?: string;
  organization?: string;
  /** Whether the officer has approval authority (informational). */
  canApprove: boolean;
  /** Whether the officer can run simulations (informational). */
  canRunSimulation: boolean;
  /** Optional high-level permission summary string. */
  scopeSummary?: string;
}

export type ProfileViewStatus =
  | "loading"
  | "ready"
  | "empty"
  | "error"
  | "session-expired"
  | "permission-denied";

export type ProfileServiceErrorCode = "unauthorized" | "network" | "invalid";

export class ProfileServiceError extends Error {
  constructor(
    public code: ProfileServiceErrorCode,
    message?: string,
  ) {
    super(message);
    this.name = "ProfileServiceError";
  }
}

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// Static dev profile — TODO(DEV4): replace with the authenticated session.
const MOCK_PROFILE: OfficerProfile = {
  name: "Demo Surveillance Officer",
  role: "Federal Surveillance Officer",
  
  
  organization: "AfyaPulse Demonstration Surveillance Unit",
  jurisdiction: "Nigeria",
  avatarUrl: "",
  verificationStatus: "verified",
  active: true,
};

// TODO(DEV4): wire to real auth/session boundary (read-only metadata).
const MOCK_SECURITY: OfficerSecuritySettings = {
  canChangePassword: true,
  activeSessionsCount: 1,
  canSignOutOthers: false,
  lastSignInAt: new Date().toISOString(),
};

// TODO(DEV3): persist via backend notification preferences endpoint.
const MOCK_NOTIFICATION_PREFS: OfficerNotificationPreferences = {
  healthSignalNotifications: true,
  investigationNotifications: true,
  accessRequestNotifications: true,
  systemNotifications: true,
};

// TODO(DEV3): persist via user preferences endpoint.
const MOCK_USER_PREFS: OfficerUserPreferences = {
  theme: "light",
  dateTimeFormat: "dd/mm/yyyy",
  defaultDashboard: "overview",
  compactMode: false,
};

// TODO(DEV4): derive from backend authorization/permissions (read-only).
const MOCK_DATA_ACCESS: OfficerDataAccess = {
  role: "Federal Surveillance Officer",
  jurisdiction: "Nigeria",
  organization: "AfyaPulse Demonstration Surveillance Unit",
  canApprove: false,
  canRunSimulation: true,
  scopeSummary:
    "Authorized to access surveillance information within Ife Central LGA.",
};

export async function getOfficerProfile(): Promise<OfficerProfile> {
  return getOfficerProfileAction();
}

export async function updateOfficerProfile(
  data: EditableOfficerProfile,
): Promise<OfficerProfile> {
  await requireDemoSettingsAction();
  await delay(280);
  // Non-authoritative update to the in-memory mock; backend will validate.
  Object.assign(MOCK_PROFILE, data);
  return { ...MOCK_PROFILE };
}

export async function getOfficerSecuritySettings(): Promise<OfficerSecuritySettings> {
  await requireDemoSettingsAction();
  await delay(120);
  return { ...MOCK_SECURITY };
}

export async function getOfficerNotificationPreferences(): Promise<OfficerNotificationPreferences> {
  await requireDemoSettingsAction();
  await delay(120);
  return { ...MOCK_NOTIFICATION_PREFS };
}

export async function updateOfficerNotificationPreferences(
  data: Partial<OfficerNotificationPreferences>,
): Promise<OfficerNotificationPreferences> {
  await requireDemoSettingsAction();
  await delay(200);
  Object.assign(MOCK_NOTIFICATION_PREFS, data);
  return { ...MOCK_NOTIFICATION_PREFS };
}

export async function getOfficerUserPreferences(): Promise<OfficerUserPreferences> {
  await requireDemoSettingsAction();
  await delay(120);
  return { ...MOCK_USER_PREFS };
}

export async function updateOfficerUserPreferences(
  data: Partial<OfficerUserPreferences>,
): Promise<OfficerUserPreferences> {
  await requireDemoSettingsAction();
  await delay(200);
  Object.assign(MOCK_USER_PREFS, data);
  return { ...MOCK_USER_PREFS };
}

export async function getOfficerDataAccess(): Promise<OfficerDataAccess> {
  return getOfficerDataAccessAction();
}

/**
 * UI integration point for sign-out. Delegates to the unified NextAuth
 * boundary so the session is actually terminated, then redirects to the
 * Officer Sign In page.
 */
export async function signOutOfficer(): Promise<SignOutResult> {
  const { signOut } = await import("next-auth/react");
  await signOut({ redirect: false });
  if (typeof window !== "undefined") {
    window.location.href = "/auth?entry=officer";
  }
  return { sessionsEnded: 1 };
}

/* ------------------------------------------------------------------ *
 * Profile photo — frontend/service boundary.
 *
 * Representation: the photo is the profile's `avatarUrl` (a URL string).
 * - Photo present   → avatar components render the photo (AvatarImage).
 * - Photo absent    → avatar components render the initials fallback.
 * Removing the photo clears `avatarUrl`, which restores initials everywhere
 * automatically (header menu, profile page, settings) because they all read
 * the same profile boundary.
 *
 * Validation: only common image formats (JPEG, PNG, WebP) and a reasonable
 * size limit are accepted. Arbitrary files are rejected before upload.
 *
 * Storage: the BACKEND owns permanent image storage and the canonical
 * photo URL. No backend upload endpoint exists yet (see live-adapters), so:
 * - Demo mode uses the isolated mock below: an in-memory session object URL
 *   (never localStorage, never permanent) so the UI can be tested.
 * - Live mode rejects until the backend ships an upload endpoint — it never
 *   falls back to demo data.
 * ------------------------------------------------------------------ */

/** Accepted image formats for profile photos. */
export const PROFILE_PHOTO_ACCEPT = "image/jpeg,image/png,image/webp" as const;

/** Accepted MIME types (mirrors PROFILE_PHOTO_ACCEPT). */
const PROFILE_PHOTO_MIME_TYPES: ReadonlyArray<string> = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

/** Accepted file extensions (checked alongside MIME type). */
const PROFILE_PHOTO_EXTENSIONS: ReadonlyArray<string> = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
];

/** Reasonable pre-upload size limit (2 MB). */
export const PROFILE_PHOTO_MAX_BYTES = 2 * 1024 * 1024;

export class ProfilePhotoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProfilePhotoError";
  }
}

/**
 * Validate a candidate profile-photo file. Returns a human-readable message
 * when invalid, or null when the file is acceptable. Extension + MIME type
 * are both checked so arbitrary files cannot be passed off as images.
 */
export function validateProfilePhotoFile(file: File): string | null {
  const extension = `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`;
  const typeOk =
    PROFILE_PHOTO_MIME_TYPES.includes(file.type) ||
    PROFILE_PHOTO_EXTENSIONS.includes(extension);
  if (!typeOk) {
    return "Please choose a JPG, JPEG, PNG, or WebP image.";
  }
  if (file.size <= 0) {
    return "The selected file appears to be empty. Please choose another image.";
  }
  if (file.size > PROFILE_PHOTO_MAX_BYTES) {
    const limitMb = Math.round(PROFILE_PHOTO_MAX_BYTES / (1024 * 1024));
    return `That image is too large. Please choose an image under ${limitMb} MB.`;
  }
  return null;
}

/**
 * Demo-only photo store: in-memory session object URLs. Revoked when
 * replaced/removed so nothing persists beyond the session (and nothing is
 * ever written to localStorage). Isolated from production data.
 */
let demoPhotoObjectUrl: string | null = null;

function revokeDemoPhoto(): void {
  if (demoPhotoObjectUrl) {
    URL.revokeObjectURL(demoPhotoObjectUrl);
    demoPhotoObjectUrl = null;
  }
}

/**
 * Demo-mode photo upload (mock). Validates the file, then stores a temporary
 * session object URL on the mock profile so the photo UI can be tested
 * without the real backend.
 *
 * TODO(DEV3): replace with the real upload pipeline (server-side storage +
 * authorization; the backend returns the canonical photo URL).
 */
export async function uploadOfficerProfilePhoto(
  file: File,
): Promise<OfficerProfile> {
  const invalid = validateProfilePhotoFile(file);
  if (invalid) {
    throw new ProfilePhotoError(invalid);
  }
  await requireDemoSettingsAction();
  await delay(450);
  revokeDemoPhoto();
  demoPhotoObjectUrl = URL.createObjectURL(file);
  MOCK_PROFILE.avatarUrl = demoPhotoObjectUrl;
  return { ...MOCK_PROFILE };
}

/**
 * Demo-mode photo removal (mock). Clears the photo so every avatar returns
 * to the initials fallback.
 */
export async function removeOfficerProfilePhoto(): Promise<OfficerProfile> {
  await requireDemoSettingsAction();
  await delay(250);
  revokeDemoPhoto();
  MOCK_PROFILE.avatarUrl = "";
  return { ...MOCK_PROFILE };
}