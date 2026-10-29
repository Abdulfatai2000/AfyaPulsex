import "server-only";
import { Jurisdiction } from "@/server/models";
import { connectDB } from "@/server/db/connection";
import { REFERENCE_STATES } from "@/lib/services/officer/geography/reference";
const normalize = (value: string) => value.toLowerCase().replace(/\b(state|lga)\b/g, "").replace(/[^a-z0-9]/g, "");
export function referenceLocation(state: string, district?: string) {
  const selected = REFERENCE_STATES.find(item => [item.id, item.code, item.name].some(value => normalize(value) === normalize(state)));
  if (!selected) throw new Error("Select a valid State.");
  const lga = district ? selected.lgas.find(item => [item.id, item.code, item.name].some(value => normalize(value) === normalize(district))) : undefined;
  if (district && !lga) throw new Error("Select an LGA belonging to that State.");
  return { state: selected, lga };
}
/** Map the existing reference hierarchy to existing MongoDB jurisdictions. */
export async function resolveJurisdiction(stateInput: string, district?: string, create = false) {
  const reference = referenceLocation(stateInput, district);
  await connectDB();
  let root = await Jurisdiction.findOne({ code: "NG", level: "country" }).lean();
  if (!root && create) root = await Jurisdiction.findOneAndUpdate({ code: "NG" }, { $setOnInsert: { name: "Nigeria", level: "country", centroid: null } }, { upsert: true, new: true }).lean();
  const states = await Jurisdiction.find({ level: "state" }).lean();
  let state = states.find(item => item.code === reference.state.code || normalize(item.name) === normalize(reference.state.name));
  if (!state && create && root) state = (await Jurisdiction.findOneAndUpdate({ code: reference.state.code }, { $setOnInsert: { name: reference.state.name, level: "state", parent: root._id, centroid: { type: "Point", coordinates: [reference.state.lng, reference.state.lat] } } }, { upsert: true, new: true }).lean()) ?? undefined;
  if (!state) return null;
  if (!reference.lga) return { jurisdiction: state, state, reference };
  const children = await Jurisdiction.find({ level: "lga", parent: state._id }).lean();
  let lga = children.find(item => item.code === reference.lga!.code || normalize(item.name) === normalize(reference.lga!.name));
  if (!lga && create) lga = (await Jurisdiction.findOneAndUpdate({ code: reference.lga.code }, { $setOnInsert: { name: reference.lga.name, level: "lga", parent: state._id, centroid: { type: "Point", coordinates: [reference.lga.lng, reference.lga.lat] } } }, { upsert: true, new: true }).lean()) ?? undefined;
  return lga ? { jurisdiction: lga, state, reference } : null;
}
export async function jurisdictionAncestors(id?: string) {
  await connectDB();
  const ids: string[] = [];
  let current = id ? await Jurisdiction.findById(id).lean() : await Jurisdiction.findOne({ code: "NG", level: "country" }).lean();
  while (current && !ids.includes(current._id.toString())) {
    ids.push(current._id.toString());
    current = current.parent ? await Jurisdiction.findById(current.parent).lean() : null;
  }
  return ids;
}
