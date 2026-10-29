// PendingRegistration — temporary registration state before email verification.
// Stores only necessary data; never plaintext passwords or OTPs.
import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from "mongoose";

const PendingRegistrationSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
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
    termsAccepted: {
      type: Boolean,
      default: false,
    },
    consumedAt: { type: Date },
  },
  { timestamps: true },
);

PendingRegistrationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type PendingRegistration = InferSchemaType<typeof PendingRegistrationSchema>;

export const PendingRegistration =
  (models.PendingRegistration as Model<PendingRegistration> | undefined) ||
  model<PendingRegistration>("PendingRegistration", PendingRegistrationSchema);