// Notification — in-app/system message targeted at a user.
import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from "mongoose";

const NotificationSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["alert", "warning", "approval", "system", "message"],
      default: "system",
    },
    title: { type: String, required: true, trim: true },
    body: { type: String, trim: true },
    channel: {
      type: String,
      enum: ["in_app", "sms", "email", "push"],
      default: "in_app",
    },
    readAt: { type: Date },
    sentAt: { type: Date, default: Date.now },
    metadata: { type: Schema.Types.Mixed },
    simulation: { type: Boolean, default: false },
  },
  { timestamps: true },
);

NotificationSchema.index({ user: 1, readAt: 1, sentAt: -1, simulation: 1 });

export type Notification = InferSchemaType<typeof NotificationSchema>;

export const Notification =
  (models.Notification as Model<Notification> | undefined) ||
  model<Notification>("Notification", NotificationSchema);
