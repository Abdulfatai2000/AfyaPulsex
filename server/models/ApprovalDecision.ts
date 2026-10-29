// ApprovalDecision — the audit outcome of an AccessRequest.
import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from "mongoose";

const ApprovalDecisionSchema = new Schema(
  {
    accessRequest: {
      type: Schema.Types.ObjectId,
      ref: "AccessRequest",
      required: true,
      index: true,
    },
    decidedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    decision: {
      type: String,
      enum: ["approved", "denied"],
      required: true,
    },
    reason: { type: String, trim: true },
    decidedAt: { type: Date, default: Date.now },
    validUntil: { type: Date },
    simulation: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export type ApprovalDecision = InferSchemaType<typeof ApprovalDecisionSchema>;

export const ApprovalDecision =
  (models.ApprovalDecision as Model<ApprovalDecision> | undefined) ||
  model<ApprovalDecision>("ApprovalDecision", ApprovalDecisionSchema);
