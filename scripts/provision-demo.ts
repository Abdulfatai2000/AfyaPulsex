import { emitKeypressEvents } from "node:readline";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { config } from "dotenv";
import { prompt } from "./provision-admin";
import { connectDB, closeDB } from "../server/db/connection";
import { User, CitizenProfile, HealthProfile, HealthEvent, VitalReading, OfficerProfile, Jurisdiction, PublicAlert, Notification } from "../server/models";
import hashPassword from "../server/lib/hashpassword";
import { emailSchema, passwordSchema } from "../lib/validation/validators";
import { resolveJurisdiction } from "../server/services/jurisdiction-resolution";
import { OFFICER_PORTAL_CAPABILITIES } from "../server/auth/officer-capabilities";
import { safeErrorCategory } from "../server/lib/safe-error";

type Credentials = { email: string; password: string };
export function validateDemoCredentials(citizen: Credentials, officer: Credentials) {
  const validated = [citizen, officer].map(input => {
    const email = emailSchema.parse(input.email);
    passwordSchema.parse(input.password);
    if (Buffer.byteLength(input.password, "utf8") > 72) throw new Error("Password exceeds 72 UTF-8 bytes.");
    return { email, password: input.password };
  });
  if (validated[0].email === validated[1].email) throw new Error("Use different emails for the two demo accounts.");
  return validated;
}

/** Re-runs refresh only these demo accounts' synthetic records; passwords never change. */
export async function provisionDemo(citizenInput: Credentials, officerInput: Credentials) {
  const [citizenCredentials, officerCredentials] = validateDemoCredentials(citizenInput, officerInput);
  await connectDB();
  await User.init();
  const credentials = { citizen: citizenCredentials, officer: officerCredentials };
  // Preflight before creating reference geography. Repeat inside the transaction.
  for (const role of ["citizen", "officer"] as const) {
    const existing = await User.findOne({ $or: [{ email: credentials[role].email }, { demoSlot: role }] }).lean();
    if (existing && (existing.email !== credentials[role].email || existing.isDemo !== true || existing.simulation !== true || existing.role !== role || existing.demoSlot !== role)) {
      throw new Error("Email or demo slot already belongs to another account. Nothing was overwritten.");
    }
  }
  const area = await resolveJurisdiction("osun", "ife-central", true);
  const country = await Jurisdiction.findOne({ level: "country", code: "NG" }).lean();
  if (!area || !country) throw new Error("Demo reference jurisdiction unavailable.");
  const hashes = {
    citizen: await hashPassword(citizenCredentials.password),
    officer: await hashPassword(officerCredentials.password),
  };
  const now = new Date();
  const ago = (days: number) => new Date(+now - days * 86400000);
  await User.db.transaction(async session => {
    async function account(role: "citizen" | "officer") {
      const existing = await User.findOne({ $or: [{ email: credentials[role].email }, { demoSlot: role }] }).session(session);
      if (existing) {
        if (existing.email !== credentials[role].email || !existing.isDemo || !existing.simulation || existing.demoSlot !== role || existing.role !== role)
          throw new Error("Existing account conflict; transaction cancelled.");
        // Do not reactivate a demo disabled by an administrator or overwrite its credentials.
        if (existing.accountStatus !== "active") throw new Error("Demo account is inactive. Administrator review required.");
        return existing;
      }
      const [created] = await User.create([{
        email: credentials[role].email, passwordHash: hashes[role], role,
        name: role === "citizen" ? "Demo Citizen" : "Demo Surveillance Officer",
        isDemo: true, demoSlot: role, simulation: true, accountStatus: "active",
        emailVerified: now,
        ...(role === "citizen" ? { onboardingStep: 3, onboardingCompletedAt: now } : {}),
      }], { session });
      return created;
    }
    const citizen = await account("citizen");
    const officer = await account("officer");
    const profile = await CitizenProfile.findOneAndUpdate(
      { user: citizen._id, simulation: true },
      { $set: { dateOfBirth: new Date("1994-06-15"), gender: "undisclosed", jurisdiction: area.jurisdiction._id,
        address: { state: "Osun", district: "Ife Central", country: "NG" }, bloodType: "unknown" } },
      { upsert: true, new: true, session, runValidators: true },
    );
    await HealthProfile.findOneAndUpdate(
      { citizenProfile: profile._id, simulation: true },
      { $set: { heightCm: 170, weightKg: 68, bloodType: "unknown", allergies: [], chronicConditions: [], medications: [] } },
      { upsert: true, session, runValidators: true },
    );
    await OfficerProfile.findOneAndUpdate(
      { user: officer._id, simulation: true },
      { $set: { title: "Disease Surveillance and Notification Officer (DSNO)", organizationName: "AfyaPulse Demonstration Surveillance Unit",
        governmentLevel: "federal", jurisdiction: country._id, status: "approved", approvedAt: now,
        setupRequired: false, setupCompletedAt: now, capabilities: [...OFFICER_PORTAL_CAPABILITIES],
        approvalAuthority: { canApproveOfficerAccess: false } } },
      { upsert: true, session, runValidators: true },
    );
    // Every replacement is scoped to both the dedicated account and simulation flag.
    await HealthEvent.deleteMany({ citizen: citizen._id, simulation: true }).session(session);
    await VitalReading.deleteMany({ citizen: citizen._id, simulation: true }).session(session);
    const episodes = [
      { days: 12, symptoms: ["Headache", "Fatigue"], severity: 4 },
      { days: 9, symptoms: ["Fatigue"], severity: 2 },
      { days: 5, symptoms: ["Cough", "Sore throat"], severity: 4 },
      { days: 3, symptoms: ["Cough"], severity: 3 },
      { days: 1, symptoms: ["Cough"], severity: 2 },
    ];
    await HealthEvent.create(episodes.map(episode => ({ citizen: citizen._id, jurisdiction: area.jurisdiction._id,
      symptoms: episode.symptoms.map(name => ({ name, severity: episode.severity, startedAt: ago(episode.days + 1), durationHours: 24 })),
      maxSeverity: episode.severity, onsetAt: ago(episode.days + 1), reportedAt: ago(episode.days), duration: "1-3d",
      status: episode.days > 5 ? "closed" : "monitoring", notes: "Synthetic demonstration record.", simulation: true,
    })), { session, ordered: true });
    const readings = [12, 9, 5, 3, 1].flatMap((days, i) => [
      { type: "temperature" as const, value: { numeric: [37.2, 36.8, 37.5, 37.1, 36.8][i] }, unit: "°C" },
      { type: "heart_rate" as const, value: { numeric: [82, 76, 86, 80, 74][i] }, unit: "bpm" },
      { type: "blood_pressure" as const, value: { systolic: [122, 120, 124, 121, 118][i], diastolic: [80, 78, 81, 79, 77][i] }, unit: "mmHg" },
      { type: "spo2" as const, value: { numeric: 98 }, unit: "%" },
    ].map(reading => ({ ...reading, citizen: citizen._id, takenAt: ago(days), source: "manual" as const, simulation: true })));
    await VitalReading.create(readings, { session, ordered: true });
    await PublicAlert.deleteMany({ createdBy: officer._id, simulation: true }).session(session);
    await PublicAlert.create([
      { title: "Demo: safe water and hand hygiene", body: "Use safe drinking water and wash hands with soap. Seek care promptly for persistent symptoms or signs of dehydration. This is a synthetic demonstration advisory.", level: "watch" as const },
      { title: "Demo: keep a personal symptom record", body: "Record when symptoms start and how they change. Contact a qualified health professional if symptoms persist or worsen. This is a synthetic demonstration notice.", level: "info" as const },
    ].map(alert => ({ ...alert, jurisdiction: country._id, channels: ["web"], status: "published", publishedAt: ago(1),
      issuedBy: "AfyaPulse Demo Surveillance Unit", createdBy: officer._id, publishedBy: officer._id, simulation: true })), { session, ordered: true });
    
    // Seed demo notifications for Demo Officer
    await Notification.deleteMany({ user: officer._id, simulation: true }).session(session);
    await Notification.create([
      { user: officer._id, type: "alert", title: "Demo: Fever signal above baseline", body: "Fever reporting is above the 7-day baseline across Osun State.", channel: "in_app", sentAt: ago(1), simulation: true },
      { user: officer._id, type: "warning", title: "Demo: Cough activity above recent baseline", body: "Cough reporting is elevated in Ife Central and surrounding LGAs.", channel: "in_app", sentAt: ago(2), simulation: true },
      { user: officer._id, type: "approval", title: "Demo: Access request awaiting approval", body: "A pending officer access request needs your review.", channel: "in_app", sentAt: ago(3), simulation: true },
      { user: officer._id, type: "system", title: "Demo: Investigation moved to Escalated", body: "Investigation INV-104 progressed to the Escalated stage.", channel: "in_app", sentAt: ago(4), simulation: true },
    ], { session, ordered: true });
    
    // Seed demo notifications for Demo Citizen
    await Notification.deleteMany({ user: citizen._id, simulation: true }).session(session);
    await Notification.create([
      { user: citizen._id, type: "message", title: "Demo: Health insight available", body: "Your weekly health summary is ready.", channel: "in_app", sentAt: ago(1), simulation: true },
      { user: citizen._id, type: "message", title: "Demo: New public health alert in your area", body: "A public health alert has been published for Osun State.", channel: "in_app", sentAt: ago(3), simulation: true },
    ], { session, ordered: true });
  });
}

async function main() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Error("Run provision:demo in an interactive terminal; piped credentials are not accepted.");
  config({ path: resolve(process.cwd(), ".env.local"), quiet: true });
  emitKeypressEvents(process.stdin);
  const citizen = { email: "", password: "" };
  const officer = { email: "", password: "" };
  try {
    for (const [label, input] of [["Citizen", citizen], ["Officer", officer]] as const) {
      input.email = emailSchema.parse(await prompt(`Demo ${label} email: `));
      input.password = await prompt(`Demo ${label} password (hidden): `, true);
      if (input.password !== await prompt("Confirm password (hidden): ", true)) throw new Error("Passwords do not match.");
    }
    await provisionDemo(citizen, officer);
    console.log("Demo accounts provisioned. Existing passwords were preserved; synthetic Citizen records refreshed.");
    console.log("Officer pages use the isolated synthetic surveillance fixtures and jurisdiction-scoped aggregate maps.");
    console.log("Use Try Citizen Demo at /auth or Try Officer Demo at /auth?entry=officer. Shared demos cannot write live data.");
  } finally {
    citizen.password = "";
    officer.password = "";
    await closeDB();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  void main().catch(error => {
    // Never print driver errors, input values, hashes or credentials.
    console.error("Demo provisioning did not finish:", safeErrorCategory(error));
    console.error("Check distinct unused emails, matching passwords (8+ characters, at most 72 UTF-8 bytes), demo slot ownership and database connectivity.");
    process.exitCode = 1;
  });
}
