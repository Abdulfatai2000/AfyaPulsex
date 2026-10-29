// AccessRequest — officer asks for scoped access to a jurisdiction/individual.
import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from "mongoose";

const AccessRequestSchema = new Schema(
  {
    officer: {
      type: Schema.Types.ObjectId,
      ref: "OfficerProfile",
      required: true,
      index: true,
    },
    citizen: { type: Schema.Types.ObjectId, ref: "User", default: null },
    jurisdiction: {
      type: Schema.Types.ObjectId,
      ref: "Jurisdiction",
      index: true,
    },
    scopes: [{ type: String, trim: true }],
    applicant: {
      fullName: String, email: String, phone: String, position: String,
      organization: String, governmentLevel: { type: String, enum: ["federal", "state", "local"] },
      stateId: String, lgaId: String,
    },
    statusTokenHash: { type: String, select: false },
    statusTokenExpiresAt: Date,
    statusSessionHash: { type: String, select: false },
    statusSessionExpiresAt: Date,
    setupCompletedAt: Date,
    justification: { type: String, trim: true },
    // Submitted evidence (Official ID / Letter). Stored on the request
    // itself — no separate storage system. Only the evidence types the
    // access-request form accepts (JPEG/PNG/PDF, bounded size; see
    // server/auth/access-request-evidence) are persisted. Absent for
    // requests submitted without a file.
    evidence: {
      fileName: { type: String, trim: true },
      mimeType: { type: String, trim: true },
      size: { type: Number },
      data: { type: Buffer },
    },
    status: {
      type: String,
      enum: ["pending", "approved", "denied", "expired"],
      default: "pending",
    },
    requestedAt: { type: Date, default: Date.now },
    decidedAt: { type: Date },
    expiresAt: { type: Date },
    simulation: { type: Boolean, default: false },
  },
  { timestamps: true },
);

AccessRequestSchema.index({ status: 1, simulation: 1, requestedAt: -1 });

export type AccessRequest = InferSchemaType<typeof AccessRequestSchema>;

export const AccessRequest =
  (models.AccessRequest as Model<AccessRequest> | undefined) ||
  model<AccessRequest>("AccessRequest", AccessRequestSchema);
