// ResponseAction — coordinated public-health action tied to a warning/investigation.
import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from "mongoose";

const ResponseActionSchema = new Schema(
  {
    investigation: {
      type: Schema.Types.ObjectId,
      ref: "Investigation",
      default: null,
    },
    warning: {
      type: Schema.Types.ObjectId,
      ref: "EarlyWarning",
      default: null,
    },
    type: {
      type: String,
      enum: [
        "community_outreach",
        "testing_drive",
        "vaccination_drive",
        "supply_delivery",
        "comms_campaign",
        "other",
      ],
      required: true,
    },
    status: {
      type: String,
      enum: ["planned", "in_progress", "completed", "cancelled"],
      default: "planned",
    },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User", default: null },
    startedAt: { type: Date },
    completedAt: { type: Date },
    notes: { type: String, trim: true },
    simulation: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export type ResponseAction = InferSchemaType<typeof ResponseActionSchema>;

export const ResponseAction =
  (models.ResponseAction as Model<ResponseAction> | undefined) ||
  model<ResponseAction>("ResponseAction", ResponseActionSchema);
