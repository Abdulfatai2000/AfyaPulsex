import "server-only";
import { connectDB } from "@/server/db/connection";
import { AggregatedSignal, EarlyWarning, Jurisdiction } from "@/server/models";
import { currentPattern } from "./signals";

export async function evaluateSignals(signalIds: string[]) {
  await connectDB();
  const signals = await AggregatedSignal.find({
    _id: { $in: signalIds },
    metric: "symptom_volume",
    isAnomaly: true,
    simulation: { $ne: true },
  }).lean();
  const warnings = [];
  for (const signal of signals) {
    const pattern = await currentPattern(
      String(signal.jurisdiction),
      signal.periodStart,
      signal.periodEnd,
    );
    if (!pattern) continue;
    const area = await Jurisdiction.findById(signal.jurisdiction).lean();
    if (!area || !["state", "lga"].includes(area.level)) continue;
    const warning = await EarlyWarning.findOneAndUpdate(
      { signal: signal._id },
      {
        $setOnInsert: {
          jurisdiction: signal.jurisdiction,
          level: "watch",
          title: `Increase in health reports - ${area.name}`,
          message:
            "Reported activity is above the preceding equal-length window. This pattern requires Officer review; it is not a diagnosis or an outbreak declaration.",
          indicators: [],
          status: "draft",
          issuedAt: new Date(),
          simulation: false,
        },
      },
      { upsert: true, returnDocument: "after" },
    ).lean();
    if (warning) warnings.push(warning);
  }
  return warnings;
}

export async function getActiveWarnings(jurisdictionId: string) {
  await connectDB();
  return EarlyWarning.find({
    jurisdiction: jurisdictionId,
    simulation: { $ne: true },
    status: { $in: ["draft", "active"] },
  })
    .sort({ issuedAt: -1 })
    .limit(50)
    .lean();
}
