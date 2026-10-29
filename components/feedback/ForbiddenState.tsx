import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { BackButton } from "./BackButton";
import { PageState, type PageStateProps } from "./PageState";

export function ForbiddenState({
  title = "Access restricted",
  description = "You don't have permission to access this page. If you believe you should have access, contact your administrator.",
  action,
  dashboardHref = "/officer/overview",
  ...props
}: Partial<PageStateProps> & { dashboardHref?: string }) {
  return (
    <PageState
      kind="forbidden"
      title={title}
      description={description}
      action={
        action ?? (
          <span className="inline-flex flex-wrap gap-2">
            <BackButton />
            <Link href={dashboardHref} className={buttonVariants()}>
              Go to Dashboard
            </Link>
          </span>
        )
      }
      {...props}
    />
  );
}
