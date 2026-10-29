"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/server/auth/config";
import { connectDB } from "@/server/db/connection";
import { User } from "@/server/models";
import { emailSchema } from "@/lib/validation/validators";

export async function adminLoginAction(_previous: { error: string }, form: FormData) {
  const email = emailSchema.safeParse(form.get("email"));
  const password = form.get("password");
  const denied = { error: "Unable to sign in. Use valid credentials for an active Admin account." };
  if (!email.success || typeof password !== "string" || !password) return denied;
  try {
    await connectDB();
    const user = await User.findOne({ email: email.data }).select("role accountStatus").lean();
    if (user?.role !== "admin" || user.accountStatus !== "active") return denied;
  } catch {
    return { error: "Admin sign-in is temporarily unavailable. Please try again." };
  }
  try {
    // Existing Auth.js provider verifies the bcrypt password and issues the session.
    await signIn("credentials", { email: email.data, password, redirectTo: "/admin/dashboard" });
  } catch (error) {
    if (error instanceof AuthError) return denied;
    throw error; // Preserve Next.js's successful redirect.
  }
  return denied;
}
