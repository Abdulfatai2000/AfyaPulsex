/** Presentation contracts only; shared domain enums remain in types/index.ts. */
export interface NavigationItem {
  readonly href: string;
  readonly label: string;
}
export type PageStateKind =
  | "loading"
  | "empty"
  | "error"
  | "success"
  | "unauthorized"
  | "forbidden"
  | "privacy-suppressed"
  | "pending-verification"
  | "session-expired";
