// User — account record for all roles; passwordHash stays nullable until
// Dev 4's Auth.js credential flow defines the hash scheme.
import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from "mongoose";

const UserSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ["citizen", "officer", "admin"],
      default: "citizen",
    },
    passwordHash: {
      type: String,
      select: false,
    },
    emailVerified: { type: Date },
    // Single-use server-issued proof for Auth.js immediately after signup OTP.
    verificationSignInTokenHash: { type: String, select: false },
    verificationSignInExpiresAt: { type: Date, select: false },
    // Authoritative first-run progress; absent fields on older accounts mean incomplete.
    onboardingStep: { type: Number, min: 0, max: 3, default: 0 },
    onboardingDraft: { type: Schema.Types.Mixed, select: false },
    onboardingCompletedAt: { type: Date },
    image: {
      type: String,
      default: null,
    },
    simulation: {
      type: Boolean,
      default: false,
    },
    isDemo: { type: Boolean, default: false, immutable: true },
    // Set only by the local provisioning command. Never accepted from signup.
    demoSlot: { type: String, enum: ["citizen", "officer"], immutable: true },
    accountStatus: {
      type: String,
      enum: ["active", "suspended", "deactivated"],
      default: "active",
    },
    suspendedUntil: { type: Date },
    suspensionReason: { type: String, trim: true },
  },
  { timestamps: true },
);

UserSchema.index({ demoSlot: 1 }, { unique: true, sparse: true });

export type User = InferSchemaType<typeof UserSchema>;

export const User =
  (models.User as Model<User> | undefined) || model<User>("User", UserSchema);
