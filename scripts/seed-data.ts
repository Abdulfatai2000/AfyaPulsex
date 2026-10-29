// Nigeria demo dataset for AfyaPulse — pure data + light helpers, no mongo.
// Dev 3 owns this. Imported by scripts/seed.ts only.

const DAY = 24 * 60 * 60 * 1000;

type BloodType =
  "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-" | "unknown";
type PregnancyStatus =
  "not_applicable" | "not_pregnant" | "pregnant" | "unknown";
type VitalType =
  | "blood_pressure"
  | "heart_rate"
  | "temperature"
  | "spo2"
  | "weight"
  | "glucose"
  | "respiration_rate";
type SignalMetric =
  | "symptom_volume"
  | "symptom_rate"
  | "event_rate"
  | "event_severity"
  | "vital_anomaly_rate"
  | "custom";
type WarningLevel = "info" | "watch" | "warning" | "critical";
type InvestigationStatus = "open" | "in_progress" | "closed";
type ResponseType =
  | "community_outreach"
  | "testing_drive"
  | "vaccination_drive"
  | "supply_delivery"
  | "comms_campaign"
  | "other";
type ResponseStatus = "planned" | "in_progress" | "completed" | "cancelled";
type AlertStatus = "draft" | "published" | "withdrawn";
type AccessStatus = "pending" | "approved" | "denied" | "expired";

export function daysAgo(days: number): Date {
  return new Date(Date.now() - days * DAY);
}

export function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

export interface JurisdictionSeed {
  name: string;
  code: string;
  level: "country" | "state" | "lga" | "ward" | "facility";
  parentCode?: string | null;
  centroid: [number, number];
  population?: number;
}

export const jurisdictions: JurisdictionSeed[] = [
  {
    name: "Nigeria",
    code: "NG",
    level: "country",
    centroid: [8.0, 9.0],
    population: 223800000,
  },
  {
    name: "Lagos",
    code: "LA",
    level: "state",
    parentCode: "NG",
    centroid: [3.38, 6.52],
    population: 15772960,
  },
  {
    name: "Kano",
    code: "KN",
    level: "state",
    parentCode: "NG",
    centroid: [8.52, 12.0],
    population: 13076421,
  },
  {
    name: "Rivers",
    code: "RV",
    level: "state",
    parentCode: "NG",
    centroid: [7.0, 4.8],
    population: 7858557,
  },
  {
    name: "Eti-Osa",
    code: "LA-ETIOSA",
    level: "lga",
    parentCode: "LA",
    centroid: [3.42, 6.55],
    population: 1537007,
  },
  {
    name: "Alimosho",
    code: "LA-ALIMO",
    level: "lga",
    parentCode: "LA",
    centroid: [3.28, 6.62],
    population: 2020279,
  },
  {
    name: "Mushin",
    code: "LA-MUSHIN",
    level: "lga",
    parentCode: "LA",
    centroid: [3.34, 6.53],
    population: 634084,
  },
  {
    name: "Nasarawa",
    code: "KN-NASARAWA",
    level: "lga",
    parentCode: "KN",
    centroid: [8.49, 11.98],
    population: 1539154,
  },
  {
    name: "Kano Municipal",
    code: "KN-MUNICIPAL",
    level: "lga",
    parentCode: "KN",
    centroid: [8.52, 12.0],
    population: 1715000,
  },
  {
    name: "Port Harcourt",
    code: "RV-PORT",
    level: "lga",
    parentCode: "RV",
    centroid: [7.0, 4.8],
    population: 1164663,
  },
  {
    name: "Obio-Akpor",
    code: "RV-OBIO",
    level: "lga",
    parentCode: "RV",
    centroid: [7.02, 4.82],
    population: 1224323,
  },
  {
    name: "Ikate",
    code: "LA-ETIOSA-IKATE",
    level: "ward",
    parentCode: "LA-ETIOSA",
    centroid: [3.44, 6.47],
  },
  {
    name: "Lekki",
    code: "LA-ETIOSA-LEKKI",
    level: "ward",
    parentCode: "LA-ETIOSA",
    centroid: [3.48, 6.44],
  },
  {
    name: "Maroko",
    code: "LA-ETIOSA-MAROKO",
    level: "ward",
    parentCode: "LA-ETIOSA",
    centroid: [3.42, 6.51],
  },
  {
    name: "Ipaja",
    code: "LA-ALIMO-IPAJA",
    level: "ward",
    parentCode: "LA-ALIMO",
    centroid: [3.28, 6.65],
  },
  {
    name: "Egbeda",
    code: "LA-ALIMO-EGBEDA",
    level: "ward",
    parentCode: "LA-ALIMO",
    centroid: [3.3, 6.6],
  },
  {
    name: "Choba",
    code: "RV-OBIO-CHOBA",
    level: "ward",
    parentCode: "RV-OBIO",
    centroid: [6.98, 4.92],
  },
  {
    name: "Lekki PHC",
    code: "LA-ETIOSA-LEKKI-PHC",
    level: "facility",
    parentCode: "LA-ETIOSA-LEKKI",
    centroid: [3.47, 6.45],
  },
];

export const DEMO_PASSWORD = "password123";

export interface UserSeed {
  name: string;
  email: string;
  role: "citizen" | "officer" | "admin";
}

export const users: UserSeed[] = [
  {
    name: "Fatima Mohammed",
    email: "fatima.mohammed@afyapulse.ng",
    role: "admin",
  },
  {
    name: "Dr. Amina Yusuf",
    email: "amina.yusuf@afyapulse.ng",
    role: "officer",
  },
  { name: "Musa Ibrahim", email: "musa.ibrahim@afyapulse.ng", role: "officer" },
  { name: "Ngozi Okoro", email: "ngozi.okoro@afyapulse.ng", role: "officer" },
  { name: "Ada Obi", email: "ada.obi@afyapulse.ng", role: "citizen" },
  {
    name: "Funke Adeyemi",
    email: "funke.adeyemi@afyapulse.ng",
    role: "citizen",
  },
  { name: "Chidi Eze", email: "chidi.eze@afyapulse.ng", role: "citizen" },
  { name: "Aisha Bello", email: "aisha.bello@afyapulse.ng", role: "citizen" },
];

export interface CitizenProfileSeed {
  email: string;
  dateOfBirth: string;
  gender: "male" | "female" | "non_binary" | "undisclosed";
  phone: string;
  address: {
    street: string;
    state: string;
    district: string;
    community: string;
    country: string;
  };
  jurisdictionCode: string;
  bloodType: BloodType;
}

export const citizenProfiles: CitizenProfileSeed[] = [
  {
    email: "ada.obi@afyapulse.ng",
    dateOfBirth: "1994-04-12",
    gender: "female",
    phone: "+2348012345001",
    address: {
      street: "7 Adeola Odeku St",
      state: "Lagos",
      district: "Eti-Osa",
      community: "Ikate",
      country: "NG",
    },
    jurisdictionCode: "LA-ETIOSA",
    bloodType: "A+",
  },
  {
    email: "funke.adeyemi@afyapulse.ng",
    dateOfBirth: "1988-11-02",
    gender: "female",
    phone: "+2348023455002",
    address: {
      street: "23 Ipaja Road",
      state: "Lagos",
      district: "Alimosho",
      community: "Ipaja",
      country: "NG",
    },
    jurisdictionCode: "LA-ALIMO",
    bloodType: "O+",
  },
  {
    email: "chidi.eze@afyapulse.ng",
    dateOfBirth: "1991-07-23",
    gender: "male",
    phone: "+2348034565003",
    address: {
      street: "9 Choba Street",
      state: "Rivers",
      district: "Obio-Akpor",
      community: "Choba",
      country: "NG",
    },
    jurisdictionCode: "RV-OBIO",
    bloodType: "O-",
  },
  {
    email: "aisha.bello@afyapulse.ng",
    dateOfBirth: "1997-02-14",
    gender: "female",
    phone: "+2348045675004",
    address: {
      street: "15 Kofar Mata",
      state: "Kano",
      district: "Nasarawa",
      community: "Nasarawa",
      country: "NG",
    },
    jurisdictionCode: "KN-NASARAWA",
    bloodType: "B+",
  },
];

export interface OfficerProfileSeed {
  email: string;
  badgeNumber: string;
  title: string;
  jurisdictionCode: string;
  department: string;
  capabilities: string[];
}

export const officerProfiles: OfficerProfileSeed[] = [
  {
    email: "amina.yusuf@afyapulse.ng",
    badgeNumber: "MOF-0001",
    title: "District Health Officer",
    jurisdictionCode: "LA-ETIOSA",
    department: "Surveillance",
    capabilities: ["signals:read", "warnings:read", "explorer:read"],
  },
  {
    email: "musa.ibrahim@afyapulse.ng",
    badgeNumber: "MOF-0002",
    title: "Field Officer",
    jurisdictionCode: "KN-NASARAWA",
    department: "Surveillance",
    capabilities: ["signals:read", "warnings:read", "explorer:read"],
  },
  {
    email: "ngozi.okoro@afyapulse.ng",
    badgeNumber: "MOF-0003",
    title: "Field Officer",
    jurisdictionCode: "RV-OBIO",
    department: "Surveillance",
    capabilities: ["signals:read", "warnings:read", "explorer:read"],
  },
];

export interface HealthProfileSeed {
  email: string;
  heightCm?: number;
  weightKg?: number;
  bloodType: BloodType;
  allergies?: string[];
  chronicConditions?: string[];
  pregnancyStatus: PregnancyStatus;
}

export const healthProfiles: HealthProfileSeed[] = [
  {
    email: "ada.obi@afyapulse.ng",
    heightCm: 165,
    weightKg: 60,
    bloodType: "A+",
    allergies: ["penicillin"],
    pregnancyStatus: "not_pregnant",
  },
  {
    email: "funke.adeyemi@afyapulse.ng",
    heightCm: 158,
    weightKg: 70,
    bloodType: "O+",
    chronicConditions: ["asthma"],
    pregnancyStatus: "not_pregnant",
  },
];

interface SymptomEntry {
  name: string;
  severity: number;
}

export interface HealthEventSeed {
  email: string;
  jurisdictionCode: string;
  symptoms: SymptomEntry[];
  onsetDaysAgo: number;
  notes?: string;
}

const heatWave: SymptomEntry[] = [
  { name: "fever", severity: 8 },
  { name: "headache", severity: 7 },
  { name: "body aches", severity: 6 },
];

export const healthEvents: HealthEventSeed[] = [
  {
    email: "ada.obi@afyapulse.ng",
    jurisdictionCode: "LA-ETIOSA",
    symptoms: heatWave,
    onsetDaysAgo: 7,
  },
  {
    email: "ada.obi@afyapulse.ng",
    jurisdictionCode: "LA-ETIOSA",
    symptoms: heatWave,
    onsetDaysAgo: 6,
  },
  {
    email: "ada.obi@afyapulse.ng",
    jurisdictionCode: "LA-ETIOSA",
    symptoms: [...heatWave, { name: "nausea", severity: 5 }],
    onsetDaysAgo: 5,
  },
  {
    email: "ada.obi@afyapulse.ng",
    jurisdictionCode: "LA-ETIOSA",
    symptoms: heatWave,
    onsetDaysAgo: 3,
  },
  {
    email: "ada.obi@afyapulse.ng",
    jurisdictionCode: "LA-ETIOSA",
    symptoms: [
      { name: "fever", severity: 9 },
      { name: "headache", severity: 8 },
      { name: "fatigue", severity: 7 },
    ],
    onsetDaysAgo: 1,
  },
  {
    email: "funke.adeyemi@afyapulse.ng",
    jurisdictionCode: "LA-ALIMO",
    symptoms: heatWave,
    onsetDaysAgo: 6,
  },
  {
    email: "funke.adeyemi@afyapulse.ng",
    jurisdictionCode: "LA-ALIMO",
    symptoms: heatWave,
    onsetDaysAgo: 4,
  },
  {
    email: "funke.adeyemi@afyapulse.ng",
    jurisdictionCode: "LA-ALIMO",
    symptoms: [...heatWave, { name: "chills", severity: 6 }],
    onsetDaysAgo: 2,
  },
  {
    email: "funke.adeyemi@afyapulse.ng",
    jurisdictionCode: "LA-ALIMO",
    symptoms: heatWave,
    onsetDaysAgo: 0,
  },
  {
    email: "chidi.eze@afyapulse.ng",
    jurisdictionCode: "RV-OBIO",
    symptoms: [
      { name: "cough", severity: 3 },
      { name: "sore throat", severity: 2 },
    ],
    onsetDaysAgo: 3,
  },
  {
    email: "aisha.bello@afyapulse.ng",
    jurisdictionCode: "KN-NASARAWA",
    symptoms: [
      { name: "headache", severity: 3 },
      { name: "fatigue", severity: 2 },
    ],
    onsetDaysAgo: 2,
  },
];

export interface VitalSeed {
  email: string;
  type: VitalType;
  value: { systolic?: number; diastolic?: number; numeric?: number };
  unit?: string;
  daysAgo: number;
  notes?: string;
}

export const vitalReadings: VitalSeed[] = [
  {
    email: "ada.obi@afyapulse.ng",
    type: "temperature",
    value: { numeric: 38.8 },
    unit: "°C",
    daysAgo: 2,
    notes: "feverish",
  },
  {
    email: "ada.obi@afyapulse.ng",
    type: "heart_rate",
    value: { numeric: 102 },
    unit: "bpm",
    daysAgo: 2,
  },
  {
    email: "ada.obi@afyapulse.ng",
    type: "spo2",
    value: { numeric: 95 },
    unit: "%",
    daysAgo: 2,
  },
  {
    email: "funke.adeyemi@afyapulse.ng",
    type: "temperature",
    value: { numeric: 39.0 },
    unit: "°C",
    daysAgo: 3,
  },
  {
    email: "funke.adeyemi@afyapulse.ng",
    type: "heart_rate",
    value: { numeric: 108 },
    unit: "bpm",
    daysAgo: 3,
  },
  {
    email: "chidi.eze@afyapulse.ng",
    type: "temperature",
    value: { numeric: 36.9 },
    unit: "°C",
    daysAgo: 4,
  },
  {
    email: "aisha.bello@afyapulse.ng",
    type: "spo2",
    value: { numeric: 98 },
    unit: "%",
    daysAgo: 5,
  },
  {
    email: "aisha.bello@afyapulse.ng",
    type: "blood_pressure",
    value: { systolic: 118, diastolic: 76 },
    unit: "mmHg",
    daysAgo: 5,
  },
];

export interface SignalSeed {
  jurisdictionCode: string;
  metric: SignalMetric;
  count: number;
  normalizedScore: number;
  threshold?: number;
  isAnomaly: boolean;
  periodStartDaysAgo: number;
  periodEndDaysAgo: number;
}

export const signals: SignalSeed[] = [
  {
    jurisdictionCode: "LA-ETIOSA",
    metric: "symptom_rate",
    count: 148,
    normalizedScore: 0.86,
    threshold: 120,
    isAnomaly: true,
    periodStartDaysAgo: 7,
    periodEndDaysAgo: 1,
  },
  {
    jurisdictionCode: "LA-ETIOSA",
    metric: "event_rate",
    count: 34,
    normalizedScore: 0.74,
    threshold: 20,
    isAnomaly: true,
    periodStartDaysAgo: 7,
    periodEndDaysAgo: 1,
  },
  {
    jurisdictionCode: "LA-ALIMO",
    metric: "symptom_rate",
    count: 96,
    normalizedScore: 0.58,
    threshold: 90,
    isAnomaly: true,
    periodStartDaysAgo: 7,
    periodEndDaysAgo: 1,
  },
  {
    jurisdictionCode: "LA-ALIMO",
    metric: "event_rate",
    count: 14,
    normalizedScore: 0.35,
    threshold: 20,
    isAnomaly: false,
    periodStartDaysAgo: 7,
    periodEndDaysAgo: 1,
  },
  {
    jurisdictionCode: "RV-OBIO",
    metric: "symptom_rate",
    count: 22,
    normalizedScore: 0.2,
    threshold: 30,
    isAnomaly: false,
    periodStartDaysAgo: 7,
    periodEndDaysAgo: 1,
  },
  {
    jurisdictionCode: "KN-NASARAWA",
    metric: "symptom_rate",
    count: 18,
    normalizedScore: 0.18,
    threshold: 30,
    isAnomaly: false,
    periodStartDaysAgo: 7,
    periodEndDaysAgo: 1,
  },
];

export interface WarningSeed {
  jurisdictionCode: string;
  level: WarningLevel;
  title: string;
  message: string;
  indicators: string[];
  status: "draft" | "active" | "resolved" | "archived";
  issuedDaysAgo: number;
  expiresDaysAgo: number;
  officerEmail: string;
  signalMetric: SignalMetric;
}

export const warning: WarningSeed = {
  jurisdictionCode: "LA-ETIOSA",
  level: "warning",
  title: "Malaria-like illness cluster in Eti-Osa LGA",
  message:
    "Elevated fever/headache reporting over the last 7 days; community screening recommended.",
  indicators: ["fever", "headache", "body aches", "cluster"],
  status: "active",
  issuedDaysAgo: 2,
  expiresDaysAgo: -5,
  officerEmail: "amina.yusuf@afyapulse.ng",
  signalMetric: "symptom_rate",
};

export interface InvestigationSeed {
  warningTitle: string;
  jurisdictionCode: string;
  officerEmail: string;
  status: InvestigationStatus;
  findings: string;
  evidence: string[];
  openedDaysAgo: number;
}

export const investigation: InvestigationSeed = {
  warningTitle: "Malaria-like illness cluster in Eti-Osa LGA",
  jurisdictionCode: "LA-ETIOSA",
  officerEmail: "amina.yusuf@afyapulse.ng",
  status: "in_progress",
  findings:
    "Case definition met by 12 of 40 screened individuals; lab-confirmed slides awaited.",
  evidence: ["RNMIS screening log 2026-048", "Eti-Osa ward registers"],
  openedDaysAgo: 1,
};

export interface ResponseActionSeed {
  type: ResponseType;
  status: ResponseStatus;
  jurisdictionCode: string;
  officerEmail: string;
  notes: string;
}

export const responseAction: ResponseActionSeed = {
  type: "community_outreach",
  status: "in_progress",
  jurisdictionCode: "LA-ETIOSA",
  officerEmail: "amina.yusuf@afyapulse.ng",
  notes:
    "Mobilise community health workers for home visits and vector control.",
};

export interface PublicAlertSeed {
  jurisdictionCode: string;
  level: WarningLevel;
  title: string;
  body: string;
  channels: readonly ("sms" | "push" | "web" | "ussd")[];
  status: AlertStatus;
  warningTitle: string;
  publishedDaysAgo: number;
  simulation?: boolean;
}

export const publicAlerts: PublicAlertSeed[] = [
  {
    jurisdictionCode: "LA-ETIOSA",
    level: "warning",
    title: "Increased malaria-like illnesses in Eti-Osa LGA",
    body: "Seek care early for persistent fever. Mosquito net distribution ongoing at Lekki PHC.",
    channels: ["sms", "push", "web"] as const,
    status: "published",
    warningTitle: "Malaria-like illness cluster in Eti-Osa LGA",
    publishedDaysAgo: 2,
    simulation: false,
  },
  {
    jurisdictionCode: "LA-ALIMO",
    level: "watch",
    title: "Elevated fever reports in Alimosho LGA",
    body: "Increased fever and headache reports over the past week. Residents advised to seek care if symptoms persist.",
    channels: ["web"] as const,
    status: "published",
    warningTitle: "Fever cluster in Alimosho",
    publishedDaysAgo: 5,
    simulation: false,
  },
  {
    jurisdictionCode: "RV-OBIO",
    level: "info",
    title: "Routine immunization drive in Obio-Akpor",
    body: "Free measles and polio vaccination for children 0-5 years at all primary health centres this week.",
    channels: ["web", "ussd"] as const,
    status: "published",
    warningTitle: "Immunization campaign",
    publishedDaysAgo: 10,
    simulation: false,
  },
];

export interface NotificationSeed {
  email: string;
  type: "alert" | "warning" | "approval" | "system" | "message";
  title: string;
  body: string;
  channel: "in_app" | "sms" | "email" | "push";
}

export const notifications: NotificationSeed[] = [
  {
    email: "ada.obi@afyapulse.ng",
    type: "alert",
    title: "Health advisory in your area",
    body: "Elevated fever reporting in Eti-Osa. Seek care for persistent fever.",
    channel: "in_app",
  },
  {
    email: "funke.adeyemi@afyapulse.ng",
    type: "alert",
    title: "Health advisory in your area",
    body: "Elevated fever reporting in Alimosho. Seek care for persistent fever.",
    channel: "in_app",
  },
  {
    email: "amina.yusuf@afyapulse.ng",
    type: "warning",
    title: "Early warning activated: Eti-Osa",
    body: "Malaria-like cluster warning is now active. Review investigation tasks.",
    channel: "in_app",
  },
];

export interface ConsentSeed {
  email: string;
  purpose: string;
  version: string;
  granted: boolean;
}

export const consents: ConsentSeed[] = [
  {
    email: "ada.obi@afyapulse.ng",
    purpose: "symptom_sharing",
    version: "2026-09-01",
    granted: true,
  },
  {
    email: "ada.obi@afyapulse.ng",
    purpose: "community_insights",
    version: "2026-09-01",
    granted: true,
  },
  {
    email: "funke.adeyemi@afyapulse.ng",
    purpose: "symptom_sharing",
    version: "2026-09-01",
    granted: true,
  },
  {
    email: "funke.adeyemi@afyapulse.ng",
    purpose: "community_insights",
    version: "2026-09-01",
    granted: true,
  },
  {
    email: "chidi.eze@afyapulse.ng",
    purpose: "community_insights",
    version: "2026-09-01",
    granted: true,
  },
  {
    email: "aisha.bello@afyapulse.ng",
    purpose: "community_insights",
    version: "2026-09-01",
    granted: true,
  },
];

export interface AccessRequestSeed {
  officerEmail: string;
  jurisdictionCode: string;
  scopes: string[];
  justification: string;
  status: AccessStatus;
  requestedDaysAgo: number;
  decidedDaysAgo: number;
  expiresDaysAgo: number;
  adminEmail: string;
}

export const accessRequest: AccessRequestSeed = {
  officerEmail: "amina.yusuf@afyapulse.ng",
  jurisdictionCode: "LA-ETIOSA",
  scopes: ["explorer:read", "signals:read", "warnings:read"],
  justification:
    "District surveillance response for elevated malaria-like cluster.",
  status: "approved",
  requestedDaysAgo: 5,
  decidedDaysAgo: 4,
  expiresDaysAgo: -25,
  adminEmail: "fatima.mohammed@afyapulse.ng",
};

export interface OrganizationSeed {
  name: string;
  type: "facility" | "ministry" | "ngo" | "response_team";
  jurisdictionCode: string;
  email: string;
  phone: string;
  address: string;
  status: "active" | "inactive";
}

export const organization: OrganizationSeed = {
  name: "Federal Ministry of Health",
  type: "ministry",
  jurisdictionCode: "NG",
  email: "info@health.gov.ng",
  phone: "+2348070001000",
  address: "New Federal Secretariat, Abuja, Nigeria",
  status: "active",
};
