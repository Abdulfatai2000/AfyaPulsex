// HealthProfile — optional clinical background attached to a CitizenProfile.
import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from "mongoose";

const HealthProfileSchema = new Schema(
  {
    citizenProfile: {
      type: Schema.Types.ObjectId,
      ref: "CitizenProfile",
      required: true,
      index: true,
    },
    heightCm: { type: Number, min: 0 },
    weightKg: { type: Number, min: 0 },
    bloodType: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "unknown"],
      default: "unknown",
    },
    allergies: [{ type: String, trim: true }],
    chronicConditions: [{ type: String, trim: true }],
    medications: [
      {
        name: { type: String, trim: true },
        dosage: { type: String, trim: true },
        frequency: { type: String, trim: true },
      },
    ],
    disabilities: [{ type: String, trim: true }],
    pregnancyStatus: {
      type: String,
      enum: ["not_applicable", "not_pregnant", "pregnant", "unknown"],
      default: "unknown",
    },
    simulation: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export type HealthProfile = InferSchemaType<typeof HealthProfileSchema>;

export const HealthProfile =
  (models.HealthProfile as Model<HealthProfile> | undefined) ||
  model<HealthProfile>("HealthProfile", HealthProfileSchema);
