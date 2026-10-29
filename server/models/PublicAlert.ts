// PublicAlert — citizen-facing multi-channel alert derived from a warning.
import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from "mongoose";

const PublicAlertSchema = new Schema(
  {
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
    level: {
      type: String,
      enum: ["info", "watch", "warning", "critical"],
      required: true,
    },
    title: { type: String, required: true, trim: true },
    body: { type: String, trim: true },
    channels: [{ type: String, enum: ["sms", "push", "web", "ussd"] }],
    status: {
      type: String,
      enum: ["draft", "published", "withdrawn"],
      default: "draft",
    },
    publishedAt: { type: Date },
    issuedBy: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    publishedBy: { type: Schema.Types.ObjectId, ref: "User" },
    audience: { type: String, trim: true },
    simulation: { type: Boolean, default: false },
  },
  { timestamps: true },
);

PublicAlertSchema.index({ status: 1, simulation: 1, jurisdiction: 1, publishedAt: -1 });

export type PublicAlert = InferSchemaType<typeof PublicAlertSchema>;

export const PublicAlert =
  (models.PublicAlert as Model<PublicAlert> | undefined) ||
  model<PublicAlert>("PublicAlert", PublicAlertSchema);
