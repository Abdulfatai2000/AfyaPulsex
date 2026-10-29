import NextAuth, { CredentialsSignin } from "next-auth";
import { authorizeDemoAccount } from "./demo-account";
import Credentials from "next-auth/providers/credentials";
import { User, OfficerProfile } from "../models";
import bcrypt from "bcrypt";
import { connectDB } from "../db/connection";
import { safeErrorCategory } from "../lib/safe-error";
import { createHash } from "node:crypto";

class AccountAccessUnavailable extends CredentialsSignin {
  code = "auth_unavailable";
}

declare module "next-auth" {
  interface User {
    id?: string;
    role?: string;
    simulation?: boolean;
    isDemo?: boolean;
    emailVerified?: Date | null;
  }

  interface Session {
    user: {
      id: string;
      role?: string;
      simulation?: boolean;
      isDemo?: boolean;
      emailVerified?: Date | null;
    } & import("next-auth").DefaultSession["user"];
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60,
  },
  pages: {
    signIn: "/auth",
  },
  providers: [
    Credentials({
      id: "demo-account",
      name: "Demo account",
      credentials: { role: {} },
      authorize: async (credentials, request) => {
        try { return await authorizeDemoAccount(credentials.role, request); }
        catch (error) {
          console.error("[auth.demo]", safeErrorCategory(error));
          throw new AccountAccessUnavailable();
        }
      },
    }),
    Credentials({
      id: "verified-signup",
      name: "Verified signup",
      credentials: { token: {} },
      authorize: async (credentials) => {
        if (typeof credentials.token !== "string" || !/^[a-f0-9]{64}$/.test(credentials.token)) return null;
        try {
          await connectDB();
          // Only the verification route mints this random grant after OTP succeeds.
          // Atomic consumption prevents replay; neither user IDs nor OTPs act as credentials here.
          const user = await User.findOneAndUpdate({
            verificationSignInTokenHash: createHash("sha256").update(credentials.token).digest("hex"),
            verificationSignInExpiresAt: { $gt: new Date() },
            role: "citizen", accountStatus: "active", emailVerified: { $ne: null },
          }, { $unset: { verificationSignInTokenHash: "", verificationSignInExpiresAt: "" } }, { returnDocument: "after" }).lean();
          if (!user) return null;
          return { id: user._id.toString(), name: user.name, email: user.email, role: user.role,
            image: user.image, simulation: user.simulation, isDemo: user.isDemo, emailVerified: user.emailVerified ?? null };
        } catch (error) {
          console.error("[auth.verified-signup]", safeErrorCategory(error));
          throw new AccountAccessUnavailable();
        }
      },
    }),
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      authorize: async (credentials) => {
        if (
          typeof credentials?.email !== "string" ||
          typeof credentials?.password !== "string"
        )
          return null;
        try {
          await connectDB();
          const { email, password } =
            (credentials as {
              email: string;
              password: string;
            }) || {};

          if (!email || !password) {
            return null;
          }

          const user = await User.findOne({
            email: email.trim().toLowerCase(),
          }).select("+passwordHash +emailVerified");

          if (!user || typeof user.passwordHash !== "string") {
            return null;
          }

          const comparePassword = await bcrypt.compare(
            password,
            user?.passwordHash,
          );

          if (!comparePassword) {
            return null;
          }
          // Pending or suspended Officers cannot acquire a session, including
          // legacy applicants that already have a password hash.
          if (user.role === "officer") {
            if (user.accountStatus !== "active") return null;
            const officer = await OfficerProfile.findOne({ user: user._id, simulation: user.isDemo ? true : { $ne: true } }).lean();
            if (!officer || officer.status !== "approved" || !officer.jurisdiction ||
              (officer.setupRequired && !officer.setupCompletedAt)) return null;
          }

          return {
            id: user?._id?.toString(),
            name: user?.name,
            email: user?.email,
            role: user?.role,
            image: user?.image,
            simulation: user?.simulation,
            isDemo: user?.isDemo,
            emailVerified: user?.emailVerified ?? null,
          };
        } catch (error) {
          console.error("[auth.credentials]", safeErrorCategory(error));
          throw new AccountAccessUnavailable();
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.role = user.role;
        token.image = user.image;
        token.simulation = user.simulation;
        token.isDemo = user.isDemo;
        token.emailVerified = user.emailVerified;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
        session.user.email = token.email as string;
        session.user.role = token.role as string;
        session.user.image = token.image as string;
        session.user.simulation = token.simulation as boolean;
        session.user.isDemo = token.isDemo === true;
        session.user.emailVerified = token.emailVerified as Date | null;
      }
      return session;
    },
  },
  secret: process.env.AUTH_SECRET,
  logger: {
    error(error) {
      console.error("[auth]", safeErrorCategory(error));
    },
  },
});
