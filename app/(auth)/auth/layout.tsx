import { AuthFrame } from "@/components/public/auth/AuthFrame";
export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <AuthFrame>{children}</AuthFrame>;
}
