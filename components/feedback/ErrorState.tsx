import { PageState, type PageStateProps } from "./PageState";
export function ErrorState({
  title = "Something went wrong",
  ...props
}: Partial<PageStateProps>) {
  return <PageState kind="error" title={title} {...props} />;
}
