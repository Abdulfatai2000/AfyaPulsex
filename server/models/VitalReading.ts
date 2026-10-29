// VitalReading — single measurement; VitalsDraft on the client maps to types
// temperature/blood_pressure/heart_rate/spo2/weight (plus glucose, respiration).
import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from "mongoose";

const VitalReadingSchema = new Schema(
  {
    citizen: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        "blood_pressure",
        "heart_rate",
        "temperature",
        "spo2",
        "weight",
        "glucose",
        "respiration_rate",
      ],
      required: true,
    },
    value: {
      systolic: { type: Number, min: 0 },
      diastolic: { type: Number, min: 0 },
      numeric: { type: Number },
    },
    unit: { type: String, trim: true },
    takenAt: { type: Date, required: true, default: Date.now },
    source: {
      type: String,
      enum: ["manual", "device", "fhbs_record", "imported"],
      default: "manual",
    },
    notes: { type: String, trim: true },
    simulation: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export type VitalReading = InferSchemaType<typeof VitalReadingSchema>;

export const VitalReading =
  (models.VitalReading as Model<VitalReading> | undefined) ||
  model<VitalReading>("VitalReading", VitalReadingSchema);
