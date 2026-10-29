// EmailVerification — stores OTP hashes for email verification.
import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from "mongoose";

const EmailVerificationSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    otpHash: {
      type: String,
      required: true,
      select: false,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    maxAttempts: {
      type: Number,
      default: 5,
    },
    lastResentAt: { type: Date },
    resendCount: { type: Number, default: 0 },
    purpose: {
      type: String,
      enum: ["email_verification", "password_reset"],
      default: "email_verification",
    },
    consumedAt: { type: Date },
  },
  { timestamps: true },
);

EmailVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type EmailVerification = InferSchemaType<typeof EmailVerificationSchema>;

export const EmailVerification =
  (models.EmailVerification as Model<EmailVerification> | undefined) ||
  model<EmailVerification>("EmailVerification", EmailVerificationSchema);