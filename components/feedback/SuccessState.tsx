import { PageState, type PageStateProps } from "./PageState";
export function SuccessState({
  title = "Complete",
  ...props
}: Partial<PageStateProps>) {
  return <PageState kind="success" title={title} {...props} />;
}
