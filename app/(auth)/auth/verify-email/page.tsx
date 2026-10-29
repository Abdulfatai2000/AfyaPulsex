import { OTPVerification } from "@/components/public/auth/OTPVerification";
import { redirect } from "next/navigation";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ pendingId?: string; email?: string; purpose?: string }>;
}) {
  const params = await searchParams;
  const { pendingId, email, purpose = "email_verification" } = params;

  if (!pendingId || !email) {
    redirect("/auth");
  }

  return <OTPVerification pendingId={pendingId} email={email} purpose={purpose as "email_verification" | "password_reset"} />;
}