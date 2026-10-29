// Dev 3 owns this file. Officer investigations boundary — the real pipeline
// behind the portal's aggregate investigation tabs. Mirrors the mock signatures
// in lib/services/officer/investigations.ts so Dev 2 can swap import paths
// without touching components.
"use server";
import { requireLiveOfficer as requireApprovedOfficer } from "@/server/auth/rbac";
import {
  addInvestigationNote,
  getInvestigationById,
  listInvestigations,
  updateInvestigation,
} from "@/server/services/investigations";
import { docIdString } from "@/server/lib/id-utils";
import type { Investigation as InvestigationDoc } from "@/server/models";
import type {
  Investigation,
  InvestigationDetail,
  InvestigationFilters,
  InvestigationNote,
  InvestigationStatus,
  InvestigationSummaryCounts,
} from "@/lib/services/officer/investigations";
import { statusMatchesTab } from "@/lib/services/officer/investigations";

type Status = InvestigationDoc["status"];

// Pipeline statuses are coarser than the portal's granular workflow. Map them
// into the portal tabs; granular values pass through unchanged.
const PIPELINE_TO_PORTAL: Partial<Record<Status, InvestigationStatus>> = {
  open: "reviewing",
  in_progress: "investigating",
  closed: "closed",
};

function portalStatus(status: Status): InvestigationStatus {
  return PIPELINE_TO_PORTAL[status] ?? (status as InvestigationStatus);
}

function signalTitle(doc: InvestigationDoc): string {
  if (doc.title) return doc.title;
  const signalLabel = (doc.signal?.toString() ?? "").trim();
  return (signalLabel || "Investigation") + " — under review";
}

function toListItem(doc: InvestigationDoc): Investigation {
  return {
    id: docIdString(doc),
    signal: signalTitle(doc),
    stateId: "",
    stateName: "",
    lgaId: "",
    lgaName: "",
    status: portalStatus(doc.status),
    assignedTo: doc.assignedTo ?? "Unassigned",
    lastUpdated: (doc.updatedAt ?? new Date()).toISOString(),
  };
}

function issueKey(doc: InvestigationDoc): string {
  if (doc.key) return doc.key;
  const sequence = docIdString(doc).slice(-4).toUpperCase();
  return `SIG-2026-${sequence}`;
}

function toPriority(doc: InvestigationDoc): InvestigationDetail["priority"] {
  const value = doc.priority;
  if (value === "critical") return "high";
  if (value === "low" || value === "medium" || value === "high") return value;
  return "medium";
}

function toConfidence(
  doc: InvestigationDoc,
): InvestigationDetail["confidence"] {
  const confidence = doc.confidence;
  if (confidence == null) return "medium";
  if (confidence >= 60) return "high";
  if (confidence >= 30) return "medium";
  return "low";
}

async function toDetail(doc: InvestigationDoc): Promise<InvestigationDetail | null> {
  const listed = toListItem(doc);
  const change = doc.changeFromBaselinePercent ?? 0;
  return {
    id: listed.id,
    key: issueKey(doc),
    title: signalTitle(doc),
    detectedOn: (doc.openedAt ?? new Date()).toISOString(),
    priority: toPriority(doc),
    status: listed.status,
    assignedTo: listed.assignedTo,
    lastUpdated: listed.lastUpdated,
    stateId: listed.stateId,
    stateName: listed.stateName,
    lgaId: listed.lgaId,
    lgaName: listed.lgaName,
    timeWindow: {
      start: (doc.timeWindow?.start ?? doc.openedAt ?? new Date()).toISOString(),
      end: (doc.timeWindow?.end ?? new Date()).toISOString(),
    },
    totalReports: doc.totalReports ?? 0,
    changeFromBaselinePercent: change,
    confidence: toConfidence(doc),
    trend: [], // No measured trend series is stored; never synthesize live history.
    notes: (doc.notes ?? []).map(toNote),
  };
}

function toNote(note: NonNullable<InvestigationDoc["notes"]>[number]): InvestigationNote {
  return {
    id: (note._id?.toString?.() ?? `${Date.now()}`) as string,
    author: note.authorName ?? note.author?.toString() ?? "Officer",
    createdAt: (note.createdAt ?? new Date()).toISOString(),
    body: note.body ?? "",
  };
}

export async function getInvestigationSummaryAction(
  stateId?: string,
): Promise<InvestigationSummaryCounts> {
  void stateId;
  const session = await requireApprovedOfficer();
  const docs = await listInvestigations(session.jurisdictionIds);
  const counted: InvestigationSummaryCounts = {
    all: 0,
    active: 0,
    pending: 0,
    escalated: 0,
    closed: 0,
  };
  for (const doc of docs) {
    const status = portalStatus(doc.status);
    counted.all += 1;
    if (statusMatchesTab(status, "active")) counted.active += 1;
    if (statusMatchesTab(status, "pending")) counted.pending += 1;
    if (statusMatchesTab(status, "escalated")) counted.escalated += 1;
    if (statusMatchesTab(status, "closed")) counted.closed += 1;
  }
  return counted;
}

export async function getInvestigationsAction(
  filters: InvestigationFilters,
): Promise<Investigation[]> {
  const session = await requireApprovedOfficer();
  const docs = await listInvestigations(session.jurisdictionIds);
  return docs
    .map(toListItem)
    .filter((item) => statusMatchesTab(item.status, filters.tab));
}

export async function getInvestigationByIdAction(
  id: string,
): Promise<InvestigationDetail | null> {
  const session = await requireApprovedOfficer();
  const doc = await getInvestigationById(id);
  return doc?.jurisdiction && session.jurisdictionIds.includes(String(doc.jurisdiction)) ? toDetail(doc) : null;
}

export async function setInvestigationStatusAction(
  id: string,
  status: InvestigationStatus,
): Promise<InvestigationDetail | null> {
  await requireInvestigationScope(id);
  const updated = await updateInvestigation(id, {
    status,
    closedAt: status === "closed" ? new Date() : undefined,
  });
  return updated ? toDetail(updated) : null;
}

export async function setInvestigationAssignedToAction(
  id: string,
  assignment: string,
): Promise<InvestigationDetail | null> {
  await requireInvestigationScope(id);
  const updated = await updateInvestigation(id, {
    assignedTo: assignment.trim() || undefined,
  });
  return updated ? toDetail(updated) : null;
}

export async function addInvestigationNoteAction(
  id: string,
  body: string,
): Promise<InvestigationDetail | null> {
  const session = await requireInvestigationScope(id);
  const trimmed = body.trim();
  if (!trimmed) throw new Error("Note text must not be empty.");
  const authorName = session.user.name ?? "Officer";
  const updated = await addInvestigationNote(
    id,
    session.userId,
    authorName,
    trimmed,
  );
  return updated ? toDetail(updated) : null;
}
async function requireInvestigationScope(id: string) {
  const session = await requireApprovedOfficer();
  const doc = await getInvestigationById(id);
  if (!doc?.jurisdiction || !session.jurisdictionIds.includes(String(doc.jurisdiction))) throw new Error("Forbidden: investigation is outside your approved scope.");
  return session;
}
