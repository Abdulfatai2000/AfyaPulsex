// Idempotent Nigeria demo seed for AfyaPulse.
//
// `npm run seed` wipes existing simulation rows (real/non-sim data is kept) and
// re-inserts the Nigeria reference dataset from ./seed-data. Dev 3 owns this.
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import bcrypt from "bcrypt";

import { connectDB, closeDB } from "../server/db/connection";
import {
  AccessRequest,
  AggregatedSignal,
  ApprovalDecision,
  CitizenProfile,
  ConsentRecord,
  EarlyWarning,
  HealthEvent,
  HealthProfile,
  Investigation,
  Jurisdiction,
  Notification,
  OfficerProfile,
  Organization,
  PublicAlert,
  ResponseAction,
  Symptom,
  User,
  VitalReading,
} from "../server/models";
import {
  accessRequest,
  citizenProfiles,
  consents,
  daysAgo,
  healthEvents,
  healthProfiles,
  investigation,
  jurisdictions,
  notifications,
  officerProfiles,
  organization,
  publicAlerts,
  responseAction,
  signals,
  users,
  vitalReadings,
  warning,
  DEMO_PASSWORD,
} from "./seed-data";

async function main(): Promise<void> {
  await connectDB();
  const counts: Record<string, number> = {};

  const SIMULATED = { simulation: true };
  interface WipeTarget {
    modelName: string;
    deleteMany(
      filter: Record<string, unknown>,
    ): Promise<{ deletedCount?: number }>;
  }
  // Reference data (Jurisdiction/Organization) has no `simulation` flag, so it's
  // re-created wholesale; everything else only removes its simulation rows.
  const wipeSpecs = [
    [AccessRequest, SIMULATED],
    [AggregatedSignal, SIMULATED],
    [ApprovalDecision, SIMULATED],
    [CitizenProfile, SIMULATED],
    [ConsentRecord, SIMULATED],
    [EarlyWarning, SIMULATED],
    [HealthEvent, SIMULATED],
    [HealthProfile, SIMULATED],
    [Investigation, SIMULATED],
    [Jurisdiction, {}],
    [Notification, SIMULATED],
    [OfficerProfile, SIMULATED],
    [Organization, {}],
    [PublicAlert, SIMULATED],
    [ResponseAction, SIMULATED],
    [Symptom, SIMULATED],
    [User, SIMULATED],
    [VitalReading, SIMULATED],
  ] as unknown as Array<[WipeTarget, Record<string, unknown>]>;
  for (const [model, filter] of wipeSpecs) {
    const { deletedCount } = await model.deleteMany(filter);
    if (deletedCount) counts[model.modelName] = deletedCount;
  }

  const jurisdictionIdByCode = new Map<string, string>();
  for (const j of jurisdictions) {
    const parent = j.parentCode ? jurisdictionIdByCode.get(j.parentCode) : null;
    const doc = await Jurisdiction.create({
      name: j.name,
      code: j.code,
      level: j.level,
      parent: parent ?? null,
      centroid: { type: "Point", coordinates: j.centroid },
      population: j.population,
    });
    jurisdictionIdByCode.set(j.code, doc._id.toString());
  }
  counts.Jurisdiction = (counts.Jurisdiction ?? 0) + jurisdictions.length;

  const ngId = jurisdictionIdByCode.get("NG")!;
  const org = await Organization.create({
    name: organization.name,
    type: organization.type,
    jurisdiction: ngId,
    contact: {
      email: organization.email,
      phone: organization.phone,
      address: organization.address,
    },
    status: organization.status,
  });
  counts.Organization = 1;

  const demoPasswordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const insertedUsers = await User.insertMany(
    users.map((u) => ({
      email: u.email,
      name: u.name,
      role: u.role,
      passwordHash: demoPasswordHash,
      emailVerified: daysAgo(30),
      simulation: true,
    })),
  );
  const userByEmail = new Map(
    insertedUsers.map((u) => [u.email, u._id.toString()]),
  );
  counts.User = insertedUsers.length;

  const insertedCitizenProfiles = await CitizenProfile.insertMany(
    citizenProfiles.map((p) => ({
      user: userByEmail.get(p.email)!,
      dateOfBirth: new Date(p.dateOfBirth),
      gender: p.gender,
      phone: p.phone,
      address: {
        street: p.address.street,
        state: p.address.state,
        district: p.address.district,
        community: p.address.community,
        country: p.address.country,
      },
      jurisdiction: jurisdictionIdByCode.get(p.jurisdictionCode)!,
      bloodType: p.bloodType,
      simulation: true,
    })),
  );
  const citizenProfileByEmail = new Map(
    insertedCitizenProfiles.map((p) => [p.user.toString(), p._id.toString()]),
  );
  counts.CitizenProfile = insertedCitizenProfiles.length;

  const insertedOfficerProfiles = await OfficerProfile.insertMany(
    officerProfiles.map((o) => ({
      user: userByEmail.get(o.email)!,
      badgeNumber: o.badgeNumber,
      title: o.title,
      organization: org._id,
      jurisdiction: jurisdictionIdByCode.get(o.jurisdictionCode)!,
      department: o.department,
      capabilities: o.capabilities,
      status: "approved",
      approvedAt: daysAgo(4),
      simulation: true,
    })),
  );
  const officerByEmail = new Map(
    insertedOfficerProfiles.map((o) => [o.user.toString(), o._id.toString()]),
  );
  counts.OfficerProfile = insertedOfficerProfiles.length;

  const insertedHealthProfiles = await HealthProfile.insertMany(
    healthProfiles.map((p) => {
      const userId = userByEmail.get(p.email)!;
      return {
        citizenProfile: citizenProfileByEmail.get(userId)!,
        heightCm: p.heightCm,
        weightKg: p.weightKg,
        bloodType: p.bloodType,
        allergies: p.allergies ?? [],
        chronicConditions: p.chronicConditions ?? [],
        pregnancyStatus: p.pregnancyStatus,
        simulation: true,
      };
    }),
  );
  counts.HealthProfile = insertedHealthProfiles.length;

  const insertedEvents = await HealthEvent.insertMany(
    healthEvents.map((e) => {
      const severity = Math.max(...e.symptoms.map((s) => s.severity));
      const jur = jurisdictions.find((x) => x.code === e.jurisdictionCode);
      return {
        citizen: userByEmail.get(e.email)!,
        jurisdiction: jurisdictionIdByCode.get(e.jurisdictionCode)!,
        symptoms: e.symptoms,
        maxSeverity: severity,
        onsetAt: daysAgo(e.onsetDaysAgo),
        reportedAt: daysAgo(e.onsetDaysAgo),
        status: "reported",
        notes: e.notes,
        location: jur
          ? {
              type: "Point",
              coordinates: [jur.centroid[0] + 0.01, jur.centroid[1] + 0.005],
            }
          : undefined,
        simulation: true,
      };
    }),
  );
  counts.HealthEvent = insertedEvents.length;

  const insertedSymptoms = await Symptom.insertMany([
    {
      citizen: userByEmail.get("ada.obi@afyapulse.ng")!,
      name: "fever",
      category: "general",
      severity: 8,
      status: "active",
      simulation: true,
    },
    {
      citizen: userByEmail.get("ada.obi@afyapulse.ng")!,
      name: "headache",
      category: "general",
      severity: 6,
      status: "reported",
      simulation: true,
    },
    {
      citizen: userByEmail.get("chidi.eze@afyapulse.ng")!,
      name: "cough",
      category: "respiratory",
      severity: 3,
      status: "resolved",
      simulation: true,
    },
  ]);
  counts.Symptom = insertedSymptoms.length;

  const insertedVitals = await VitalReading.insertMany(
    vitalReadings.map((v) => ({
      citizen: userByEmail.get(v.email)!,
      type: v.type,
      value: v.value,
      unit: v.unit,
      takenAt: daysAgo(v.daysAgo),
      source: "manual",
      simulation: true,
    })),
  );
  counts.VitalReading = insertedVitals.length;

  const insertedSignals = await AggregatedSignal.insertMany(
    signals.map((s) => ({
      jurisdiction: jurisdictionIdByCode.get(s.jurisdictionCode)!,
      periodStart: daysAgo(s.periodStartDaysAgo),
      periodEnd: daysAgo(s.periodEndDaysAgo),
      metric: s.metric,
      count: s.count,
      normalizedScore: s.normalizedScore,
      threshold: s.threshold,
      isAnomaly: s.isAnomaly,
      computedAt: new Date(),
      simulation: true,
    })),
  );
  counts.AggregatedSignal = insertedSignals.length;

  const hotspotSignal = insertedSignals.find(
    (s) =>
      s.metric === warning.signalMetric &&
      s.jurisdiction.toString() === jurisdictionIdByCode.get("LA-ETIOSA"),
  )!;
  const aminaUserId = userByEmail.get("amina.yusuf@afyapulse.ng")!;
  const warningDoc = await EarlyWarning.create({
    jurisdiction: jurisdictionIdByCode.get("LA-ETIOSA")!,
    signal: hotspotSignal?._id ?? null,
    level: warning.level,
    title: warning.title,
    message: warning.message,
    indicators: warning.indicators,
    status: warning.status,
    issuedAt: daysAgo(warning.issuedDaysAgo),
    expiresAt: daysAgo(warning.expiresDaysAgo),
    createdBy: aminaUserId,
    simulation: true,
  });
  counts.EarlyWarning = 1;

  const investigationDoc = await Investigation.create({
    warning: warningDoc._id,
    jurisdiction: jurisdictionIdByCode.get(investigation.jurisdictionCode)!,
    openedBy: userByEmail.get(investigation.officerEmail)!,
    status: investigation.status,
    findings: investigation.findings,
    evidence: investigation.evidence,
    openedAt: daysAgo(investigation.openedDaysAgo),
    simulation: true,
  });
  counts.Investigation = 1;

  await ResponseAction.create({
    investigation: investigationDoc._id,
    warning: warningDoc._id,
    type: responseAction.type,
    status: responseAction.status,
    assignedTo: userByEmail.get(responseAction.officerEmail)!,
    startedAt: daysAgo(1),
    notes: responseAction.notes,
    simulation: true,
  });
  counts.ResponseAction = 1;

  for (const alert of publicAlerts) {
    await PublicAlert.create({
      warning: warningDoc._id,
      jurisdiction: jurisdictionIdByCode.get(alert.jurisdictionCode)!,
      level: alert.level,
      title: alert.title,
      body: alert.body,
      channels: [...alert.channels],
      status: alert.status,
      publishedAt: daysAgo(alert.publishedDaysAgo),
      simulation: alert.simulation ?? false,
      issuedBy: "Federal Ministry of Health",
    });
  }
  counts.PublicAlert = publicAlerts.length;

  const insertedNotifications = await Notification.insertMany(
    notifications.map((n) => ({
      user: userByEmail.get(n.email)!,
      type: n.type,
      title: n.title,
      body: n.body,
      channel: n.channel,
      sentAt: daysAgo(1),
      simulation: true,
    })),
  );
  counts.Notification = insertedNotifications.length;

  const insertedConsents = await ConsentRecord.insertMany(
    consents.map((c) => ({
      citizen: userByEmail.get(c.email)!,
      purpose: c.purpose,
      version: c.version,
      granted: c.granted,
      effectiveAt: daysAgo(10),
      source: "app",
      simulation: true,
    })),
  );
  counts.ConsentRecord = insertedConsents.length;

  const accessRequestDoc = await AccessRequest.create({
    officer: officerByEmail.get(userByEmail.get(accessRequest.officerEmail)!)!,
    jurisdiction: jurisdictionIdByCode.get(accessRequest.jurisdictionCode)!,
    scopes: accessRequest.scopes,
    justification: accessRequest.justification,
    status: accessRequest.status,
    requestedAt: daysAgo(accessRequest.requestedDaysAgo),
    decidedAt: daysAgo(accessRequest.decidedDaysAgo),
    expiresAt: daysAgo(accessRequest.expiresDaysAgo),
    simulation: true,
  });
  counts.AccessRequest = 1;

  await ApprovalDecision.create({
    accessRequest: accessRequestDoc._id,
    decidedBy: userByEmail.get(accessRequest.adminEmail)!,
    decision: "approved",
    reason: "Approved for Eti-Osa district surveillance response.",
    decidedAt: daysAgo(accessRequest.decidedDaysAgo),
    validUntil: daysAgo(accessRequest.expiresDaysAgo),
    simulation: true,
  });
  counts.ApprovalDecision = 1;

  const summary = Object.entries(counts)
    .map(([k, v]) => `${k}=${v}`)
    .join(", ");
  console.log(`[seed] Done. Simulation data (wiped + re-seeded): ${summary}`);
  console.log(
    `[seed] Login: any seeded user with password "${DEMO_PASSWORD}" (e.g. fatima.mohammed@afyapulse.ng).`,
  );
}

main()
  .then(() => closeDB())
  .catch((err) => {
    console.error("[seed] Failed:", err);
    process.exit(1);
  });
