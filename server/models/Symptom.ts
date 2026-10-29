// Symptom — a catalogued symptom report; HealthEvent bundles several per episode.
import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from "mongoose";

const SymptomSchema = new Schema(
  {
    citizen: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    category: { type: String, trim: true },
    onsetDate: { type: Date },
    severity: { type: Number, min: 1, max: 10 },
    status: {
      type: String,
      enum: ["reported", "active", "resolved", "chronic"],
      default: "reported",
    },
    reportedVia: {
      type: String,
      enum: ["app", "sms", "ussd", "agent"],
      default: "app",
    },
    simulation: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export type Symptom = InferSchemaType<typeof SymptomSchema>;

export const Symptom =
  (models.Symptom as Model<Symptom> | undefined) ||
  model<Symptom>("Symptom", SymptomSchema);
