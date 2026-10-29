// EarlyWarning — a warning generated from one/more signals (or manually).
import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from "mongoose";

const EarlyWarningSchema = new Schema(
  {
    jurisdiction: {
      type: Schema.Types.ObjectId,
      ref: "Jurisdiction",
      required: true,
      index: true,
    },
    signal: {
      type: Schema.Types.ObjectId,
      ref: "AggregatedSignal",
      default: null,
    },
    level: {
      type: String,
      enum: ["info", "watch", "warning", "critical"],
      required: true,
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, trim: true },
    indicators: [{ type: String, trim: true }],
    status: {
      type: String,
      enum: ["draft", "active", "resolved", "archived"],
      default: "draft",
    },
    issuedAt: { type: Date },
    expiresAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    simulation: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export type EarlyWarning = InferSchemaType<typeof EarlyWarningSchema>;

export const EarlyWarning =
  (models.EarlyWarning as Model<EarlyWarning> | undefined) ||
  model<EarlyWarning>("EarlyWarning", EarlyWarningSchema);
