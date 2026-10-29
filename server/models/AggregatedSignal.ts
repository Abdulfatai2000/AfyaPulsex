// AggregatedSignal — per-jurisdiction/period metric that feeds Dev 4's detection.
import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from "mongoose";

const AggregatedSignalSchema = new Schema(
  {
    jurisdiction: {
      type: Schema.Types.ObjectId,
      ref: "Jurisdiction",
      required: true,
      index: true,
    },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    metric: {
      type: String,
      enum: [
        "symptom_volume",
        "symptom_rate",
        "event_rate",
        "event_severity",
        "vital_anomaly_rate",
        "custom",
      ],
      required: true,
    },
    count: { type: Number, required: true, min: 0 },
    normalizedScore: { type: Number, min: 0 },
    threshold: { type: Number, min: 0 },
    isAnomaly: { type: Boolean, default: false },
    computedAt: { type: Date, default: Date.now },
    sourceCount: { type: Number, min: 0 },
    metadata: { type: Schema.Types.Mixed },
    simulation: { type: Boolean, default: false },
  },
  { timestamps: true },
);

AggregatedSignalSchema.index({ jurisdiction: 1, periodStart: -1 });
AggregatedSignalSchema.index({
  jurisdiction: 1,
  metric: 1,
  simulation: 1,
  periodStart: -1,
  periodEnd: 1,
});

export type AggregatedSignal = InferSchemaType<typeof AggregatedSignalSchema>;

export const AggregatedSignal =
  (models.AggregatedSignal as Model<AggregatedSignal> | undefined) ||
  model<AggregatedSignal>("AggregatedSignal", AggregatedSignalSchema);
