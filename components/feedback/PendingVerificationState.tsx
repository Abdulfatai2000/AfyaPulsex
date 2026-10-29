import { PageState, type PageStateProps } from "./PageState";
export function PendingVerificationState({
  title = "Verification pending",
  ...props
}: Partial<PageStateProps>) {
  return <PageState kind="pending-verification" title={title} {...props} />;
}
