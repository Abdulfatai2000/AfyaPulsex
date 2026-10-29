// Jurisdiction — admin hierarchy for the dashboard and RBAC scoping.
// Nigeria-aligned levels: country -> state -> lga -> ward -> facility.
import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from "mongoose";

const JurisdictionSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    level: {
      type: String,
      enum: ["country", "state", "lga", "ward", "facility"],
      required: true,
    },
    parent: { type: Schema.Types.ObjectId, ref: "Jurisdiction", default: null },
    centroid: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: {
        type: [Number],
        default: undefined,
        description: "longitude, latitude",
      },
    },
    population: { type: Number, min: 0 },
    contact: {
      email: { type: String, trim: true },
      phone: { type: String, trim: true },
    },
  },
  { timestamps: true },
);

JurisdictionSchema.index({ centroid: "2dsphere" });
JurisdictionSchema.index({ parent: 1 });
JurisdictionSchema.index({ level: 1, parent: 1 });

export type Jurisdiction = InferSchemaType<typeof JurisdictionSchema>;

export const Jurisdiction =
  (models.Jurisdiction as Model<Jurisdiction> | undefined) ||
  model<Jurisdiction>("Jurisdiction", JurisdictionSchema);
