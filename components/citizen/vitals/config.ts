import { Thermometer, HeartPulse, Heart, Droplet, Scale } from "lucide-react";
export const vitalConfigs = {
  temperature: {
    label: "Temperature",
    description: "Body temperature (°C / °F)",
    Icon: Thermometer,
    units: ["°C", "°F"],
  },
  blood_pressure: {
    label: "Blood Pressure",
    description: "Systolic / Diastolic (mmHg)",
    Icon: HeartPulse,
    units: ["mmHg"],
  },
  heart_rate: {
    label: "Heart Rate",
    description: "Beats per minute (BPM)",
    Icon: Heart,
    units: ["BPM"],
  },
  spo2: {
    label: "Blood Oxygen (SpO₂)",
    description: "Oxygen saturation (%)",
    Icon: Droplet,
    units: ["%"],
  },
  weight: {
    label: "Weight",
    description: "Body weight (kg / lb)",
    Icon: Scale,
    units: ["kg", "lb"],
  },
} as const;
