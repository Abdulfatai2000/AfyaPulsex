// Investigation — follows an EarlyWarning to establish findings.
import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from "mongoose";

const InvestigationSchema = new Schema(
  {
    key: { type: String, trim: true },
    signal: {
      type: Schema.Types.ObjectId,
      ref: "AggregatedSignal",
      default: null,
    },
    warning: {
      type: Schema.Types.ObjectId,
      ref: "EarlyWarning",
      default: null,
    },
    jurisdiction: {
      type: Schema.Types.ObjectId,
      ref: "Jurisdiction",
      index: true,
    },
    openedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, trim: true },
    status: {
      type: String,
      enum: [
        "open",
        "in_progress",
        "closed",
        "new",
        "reviewing",
        "investigating",
        "monitoring",
        "escalated",
      ],
      default: "open",
      description:
        "open/in_progress/closed are the pipeline values; the granular portal statuses partition the officer tabs",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
    assignedTo: {
      type: String,
      trim: true,
      description: "Operational assignment team/label, e.g. 'Rapid Response'",
    },
    timeWindow: {
      start: { type: Date },
      end: { type: Date },
    },
    totalReports: { type: Number, min: 0 },
    changeFromBaselinePercent: { type: Number },
    confidence: { type: Number, min: 0, max: 100 },
    findings: { type: String, trim: true },
    evidence: [{ type: String, trim: true }],
    notes: [
      {
        author: { type: Schema.Types.ObjectId, ref: "User" },
        authorName: { type: String, trim: true },
        body: { type: String, required: true, trim: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    openedAt: { type: Date, default: Date.now },
    closedAt: { type: Date },
    simulation: { type: Boolean, default: false },
  },
  { timestamps: true },
);

InvestigationSchema.index({ jurisdiction: 1, status: 1, openedAt: -1, simulation: 1 });
InvestigationSchema.index({ simulation: 1, openedAt: -1 });

export type Investigation = InferSchemaType<typeof InvestigationSchema>;

export const Investigation =
  (models.Investigation as Model<Investigation> | undefined) ||
  model<Investigation>("Investigation", InvestigationSchema);
