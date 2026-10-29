// CitizenProfile — 1:1 with a User (role: citizen); address mirrors the
// onboarding LocationDraft (state / district(LGA) / community(ward), NG default).
import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from "mongoose";

const CitizenProfileSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    dateOfBirth: { type: Date },
    gender: {
      type: String,
      enum: ["male", "female", "non_binary", "undisclosed"],
      default: "undisclosed",
    },
    phone: { type: String, trim: true },
    address: {
      street: { type: String, trim: true },
      state: { type: String, trim: true },
      district: { type: String, trim: true },
      community: { type: String, trim: true },
      country: { type: String, default: "NG", trim: true },
    },
    jurisdiction: {
      type: Schema.Types.ObjectId,
      ref: "Jurisdiction",
      index: true,
    },
    bloodType: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "unknown"],
      default: "unknown",
    },
    emergencyContact: {
      name: { type: String, trim: true },
      relationship: { type: String, trim: true },
      phone: { type: String, trim: true },
    },
    simulation: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export type CitizenProfile = InferSchemaType<typeof CitizenProfileSchema>;

export const CitizenProfile =
  (models.CitizenProfile as Model<CitizenProfile> | undefined) ||
  model<CitizenProfile>("CitizenProfile", CitizenProfileSchema);
