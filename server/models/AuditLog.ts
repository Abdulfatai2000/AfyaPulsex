// AuditLog — immutable trail for sensitive actions; Dev 4's audit service writes.
import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from "mongoose";

const AuditLogSchema = new Schema(
  {
    actor: { type: Schema.Types.ObjectId, ref: "User", index: true },
    actorRole: {
      type: String,
      enum: ["citizen", "officer", "admin", "system"],
      default: "system",
    },
    action: { type: String, required: true, trim: true },
    targetEmail: { type: String, trim: true },
    targetRole: { type: String, trim: true },
    resourceType: { type: String, trim: true },
    resourceId: { type: String, trim: true },
    jurisdiction: {
      type: Schema.Types.ObjectId,
      ref: "Jurisdiction",
      default: null,
    },
    ip: { type: String, trim: true },
    userAgent: { type: String, trim: true },
    metadata: { type: Schema.Types.Mixed },
    reason: { type: String, trim: true },
    simulation: { type: Boolean, default: false },
  },
  { timestamps: true },
);

AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ actor: 1, createdAt: -1 });

export type AuditLog = InferSchemaType<typeof AuditLogSchema>;

export const AuditLog =
  (models.AuditLog as Model<AuditLog> | undefined) ||
  model<AuditLog>("AuditLog", AuditLogSchema);
