import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { PageState, type PageStateProps } from "./PageState";

export function UnauthorizedState({
  title = "Sign-in required",
  description = "Please sign in to continue to AfyaPulse.",
  action,
  ...props
}: Partial<PageStateProps>) {
  return (
    <PageState
      kind="unauthorized"
      title={title}
      description={description}
      action={
        action ?? (
          <Link href="/auth" className={buttonVariants()}>
            Sign In
          </Link>
        )
      }
      {...props}
    />
  );
}
