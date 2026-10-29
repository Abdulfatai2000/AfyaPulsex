// HealthEvent — an illness episode carrying MULTIPLE symptom entries, a
// 1-10 maxSeverity, timing fields, an optional geo point (2dsphere) and a
// simulation flag for demo/seed rows. bodyArea + duration mirror the citizen
// report form (ReportDraft) so the server boundary can persist every input.
import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from "mongoose";

const HealthEventSchema = new Schema(
  {
    citizen: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    jurisdiction: {
      type: Schema.Types.ObjectId,
      ref: "Jurisdiction",
      default: null,
      index: true,
      description:
        "jurisdiction the event belongs to (drives officer Explorer scoping)",
    },
    symptoms: [
      {
        name: { type: String, required: true, trim: true },
        severity: { type: Number, required: true, min: 1, max: 10 },
        startedAt: { type: Date },
        durationHours: { type: Number, min: 0 },
        notes: { type: String, trim: true },
      },
    ],
    maxSeverity: { type: Number, min: 1, max: 10 },
    onsetAt: { type: Date },
    duration: {
      type: String,
      enum: ["<1h", "1-6h", "6-24h", "1-3d", "4-7d", "1w+"],
      description: "Reported symptom duration bucket from the citizen form",
    },
    bodyArea: [
      {
        type: String,
        trim: true,
        description: "Body region ids selected on the report body map",
      },
    ],
    reportedAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ["reported", "under_review", "monitoring", "closed"],
      default: "reported",
    },
    location: {
      type: { type: String, enum: ["Point"], description: "GeoJSON type" },
      coordinates: {
        type: [Number],
        description:
          "longitude, latitude; only set when the citizen shares a location",
      },
    },
    notes: { type: String, trim: true },
    simulation: { type: Boolean, default: false },
  },
  { timestamps: true },
);

HealthEventSchema.index({ location: "2dsphere" });

export type HealthEvent = InferSchemaType<typeof HealthEventSchema>;

export const HealthEvent =
  (models.HealthEvent as Model<HealthEvent> | undefined) ||
  model<HealthEvent>("HealthEvent", HealthEventSchema);
