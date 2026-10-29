// Organization — facilities, ministries, NGOs and response teams.
import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from "mongoose";

const OrganizationSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["facility", "ministry", "ngo", "response_team"],
      required: true,
    },
    jurisdiction: {
      type: Schema.Types.ObjectId,
      ref: "Jurisdiction",
      index: true,
    },
    contact: {
      email: { type: String, trim: true },
      phone: { type: String, trim: true },
      address: { type: String, trim: true },
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true },
);

export type Organization = InferSchemaType<typeof OrganizationSchema>;

export const Organization =
  (models.Organization as Model<Organization> | undefined) ||
  model<Organization>("Organization", OrganizationSchema);
