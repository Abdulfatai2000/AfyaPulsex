// OfficerProfile — 1:1 with a User (role: officer); capabilities drive RBAC
// (e.g. `signals:read`, `warnings:read`, `explorer:read`).
import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from "mongoose";

const OfficerProfileSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    badgeNumber: { type: String, trim: true },
    title: { type: String, trim: true },
    organization: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      index: true,
    },
    jurisdiction: {
      type: Schema.Types.ObjectId,
      ref: "Jurisdiction",
      index: true,
    },
    department: { type: String, trim: true },
    organizationName: { type: String, trim: true },
    governmentLevel: { type: String, enum: ["federal", "state", "local"] },
    setupRequired: { type: Boolean, default: false },
    setupCompletedAt: Date,
    capabilities: [{ type: String, trim: true }],
    // Approval authority — backend source of truth for who may approve
    // another officer's access request. Granted explicitly and stored here;
    // never inferred from designation (DSO/DSNO/etc.), organisation, or
    // government level. Ordinary approved officers keep
    // canApproveOfficerAccess: false. Initial approver categories:
    // Federal/National Authorized Approver (approvalScope: "federal") and
    // State Authorized Approver (approvalScope: "state", bound to their
    // authorized state via `jurisdiction`).
    approvalAuthority: {
      canApproveOfficerAccess: { type: Boolean, default: false },
      approvalScope: {
        type: String,
        enum: ["federal", "state"],
      },
    },
    status: {
      type: String,
      enum: ["pending", "approved", "suspended"],
      default: "pending",
    },
    approvedAt: { type: Date },
    simulation: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export type OfficerProfile = InferSchemaType<typeof OfficerProfileSchema>;

export const OfficerProfile =
  (models.OfficerProfile as Model<OfficerProfile> | undefined) ||
  model<OfficerProfile>("OfficerProfile", OfficerProfileSchema);
