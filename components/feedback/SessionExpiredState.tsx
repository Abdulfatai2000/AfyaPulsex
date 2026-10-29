import { PageState, type PageStateProps } from "./PageState";
export function SessionExpiredState({
  title = "Your session has expired",
  ...props
}: Partial<PageStateProps>) {
  return <PageState kind="session-expired" title={title} {...props} />;
}
