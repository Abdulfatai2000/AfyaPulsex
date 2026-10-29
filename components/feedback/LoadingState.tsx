import { PageState, type PageStateProps } from "./PageState";
export function LoadingState({
  title = "Loading…",
  ...props
}: Partial<PageStateProps>) {
  return <PageState kind="loading" title={title} {...props} />;
}
