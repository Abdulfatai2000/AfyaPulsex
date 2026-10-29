// TEMP DEBUG SCRIPT — reproduce the officer access-request submission path.
import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(__dirname, "../.env.local"), quiet: true });

async function main() {
  const { connectDB, closeDB } = await import("../server/db/connection");
  const mongoose = await connectDB();
  const admin = mongoose.connection.db!.admin();

  const hello = await admin.command({ hello: 1 });
  console.log("[repro] topology setName:", hello.setName ?? "(NONE - standalone)");
  console.log("[repro] isWritablePrimary:", hello.isWritablePrimary);

  const { User, AccessRequest, OfficerProfile, Jurisdiction } = await import(
    "../server/models"
  );
  const { REFERENCE_STATES } = await import(
    "../lib/services/officer/geography/reference"
  );
  const normalize = (v: string) =>
    v.toLowerCase().replace(/\b(state|lga)\b/g, "").replace(/[^a-z0-9]/g, "");
  const referenceLocation = (state: string, district?: string) => {
    const selected = REFERENCE_STATES.find((item: any) =>
      [item.id, item.code, item.name].some((v: string) => normalize(v) === normalize(state)),
    );
    if (!selected) throw new Error("Select a valid State.");
    const lga = district
      ? (selected as any).lgas.find((item: any) =>
          [item.id, item.code, item.name].some((v: string) => normalize(v) === normalize(district)),
        )
      : undefined;
    if (district && !lga) throw new Error("Select an LGA belonging to that State.");
    return { state: selected, lga };
  };
  const resolveJurisdiction = async (stateInput: string, district?: string, create = false) => {
    const reference = referenceLocation(stateInput, district);
    let root = await Jurisdiction.findOne({ code: "NG", level: "country" }).lean();
    if (!root && create)
      root = await Jurisdiction.findOneAndUpdate(
        { code: "NG" },
        { $setOnInsert: { name: "Nigeria", level: "country", centroid: null } },
        { upsert: true, new: true },
      ).lean();
    const states = await Jurisdiction.find({ level: "state" }).lean();
    let state: any = states.find((item: any) => item.code === reference.state.code || normalize(item.name) === normalize(reference.state.name));
    if (!state && create && root)
      state = (await Jurisdiction.findOneAndUpdate(
        { code: reference.state.code },
        { $setOnInsert: { name: reference.state.name, level: "state", parent: root._id, centroid: { type: "Point", coordinates: [reference.state.lng, reference.state.lat] } } },
        { upsert: true, new: true },
      ).lean()) ?? undefined;
    if (!state) return null;
    if (!reference.lga) return { jurisdiction: state, state, reference };
    const children = await Jurisdiction.find({ level: "lga", parent: state._id }).lean();
    let lga: any = children.find((item: any) => item.code === reference.lga!.code || normalize(item.name) === normalize(reference.lga!.name));
    if (!lga && create)
      lga = (await Jurisdiction.findOneAndUpdate(
        { code: reference.lga.code },
        { $setOnInsert: { name: reference.lga.name, level: "lga", parent: state._id, centroid: { type: "Point", coordinates: [reference.lga.lng, reference.lga.lat] } } },
        { upsert: true, new: true },
      ).lean()) ?? undefined;
    return lga ? { jurisdiction: lga, state, reference } : null;
  };

  const email = `repro-${Date.now()}@example.com`;
  const input = {
    fullName: "Repro Officer",
    email,
    phone: "+2348012345678",
    position: "Disease Surveillance Officer (DSO)",
    governmentLevel: "state" as const,
    stateId: "Lagos",
    organization: "Lagos State Ministry of Health",
    lgaId: "Ikeja",
    isOtherOrg: false,
  };

  try {
    referenceLocation(input.stateId, input.lgaId);
    console.log("[repro] referenceLocation OK");
  } catch (e) {
    console.log("[repro] referenceLocation FAILED:", (e as Error).message);
  }

  const resolved = await resolveJurisdiction(input.stateId, input.lgaId, true);
  console.log("[repro] resolveJurisdiction:", resolved?.jurisdiction?._id?.toString() ?? "null");

  console.log("[repro] indexes on users:");
  console.log(JSON.stringify(await User.collection.indexes(), null, 2));

  console.log("[repro] attempting User.init() ...");
  await User.init();
  console.log("[repro] User.init OK");

  console.log("[repro] attempting transaction ...");
  const jurisdictionId = resolved?.jurisdiction._id;
  const evidenceBytes = Buffer.from("%PDF-1.4 repro");

  try {
    const created = await AccessRequest.db.transaction(async (transaction) => {
      const [user] = await User.create(
        [{ name: input.fullName, email, role: "officer", accountStatus: "active" }],
        { session: transaction },
      );
      const [profile] = await OfficerProfile.create(
        [
          {
            user: user._id,
            title: input.position,
            status: "pending",
            setupRequired: true,
            organizationName: input.organization,
            governmentLevel: input.governmentLevel,
            capabilities: [],
          },
        ],
        { session: transaction },
      );
      const [request] = await AccessRequest.create(
        [
          {
            officer: profile._id,
            jurisdiction: jurisdictionId,
            scopes: [input.position],
            applicant: { ...input, email },
            justification: `Organization: ${input.organization}`,
            evidence: {
              fileName: "repro.pdf",
              mimeType: "application/pdf",
              size: evidenceBytes!.length,
              data: evidenceBytes,
            },
            status: "pending",
          },
        ],
        { session: transaction },
      );
      return { user, profile, request };
    });
    console.log("[repro] TRANSACTION OK:", created.request._id.toString());
  } catch (e) {
    console.log("[repro] TRANSACTION FAILED");
    console.log("  name:", (e as Error).name);
    console.log("  message:", (e as Error).message);
    console.log("  code:", (e as any)?.code);
    if ((e as any)?.errors) {
      for (const [k, v] of Object.entries((e as any).errors)) {
        console.log("   field:", k, "->", JSON.stringify((v as any).message));
      }
    }
    console.log("  stack:", (e as Error).stack);
  }

  await closeDB();
}

void main().catch(async (e) => {
  console.error("FATAL", e);
  process.exit(1);
});
