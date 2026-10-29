// ConsentRecord — versioned consent decisions (purpose/version/granted) core
// to privacy; Dev 4 owns the consent service that writes these.
import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from "mongoose";

const ConsentRecordSchema = new Schema(
  {
    citizen: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    purpose: { type: String, required: true, trim: true },
    version: { type: String, required: true, trim: true },
    granted: { type: Boolean, required: true, default: false },
    effectiveAt: { type: Date, required: true, default: Date.now },
    expiresAt: { type: Date },
    revokedAt: { type: Date },
    source: {
      type: String,
      enum: ["app", "sms", "ussd", "paper", "agent"],
      default: "app",
    },
    metadata: { type: Schema.Types.Mixed },
    simulation: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export type ConsentRecord = InferSchemaType<typeof ConsentRecordSchema>;

export const ConsentRecord =
  (models.ConsentRecord as Model<ConsentRecord> | undefined) ||
  model<ConsentRecord>("ConsentRecord", ConsentRecordSchema);
