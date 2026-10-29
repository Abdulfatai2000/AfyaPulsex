import { PageState, type PageStateProps } from "./PageState";
export function PrivacySuppressedState({
  title = "Data unavailable for privacy",
  ...props
}: Partial<PageStateProps>) {
  return <PageState kind="privacy-suppressed" title={title} {...props} />;
}
