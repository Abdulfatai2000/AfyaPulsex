import { REFERENCE_STATES } from "../geography/reference";
import type { OrganizationService, Organization } from "./types";

const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

const MOCK_ORGANIZATIONS: Record<string, string[]> = {
  abia: ["Abia State PHC Network", "Abia University Teaching Hospital"],
  adamawa: ["Adamawa State Ministry of Health", "Adamawa Central Hospital"],
  "akwa-ibom": ["Akwa Ibom University Teaching Hospital", "Akwa Ibom State Ministry of Health"],
  anambra: ["Anambra State University Teaching Hospital", "Anambra Health Management Board"],
  bauchi: ["Bauchi State Ministry of Health", "Abubakar Tafawa Balewa Teaching Hospital"],
  bayelsa: ["Bayelsa State Ministry of Health", "Niger Delta University Teaching Hospital"],
  benue: ["Benue State University Teaching Hospital", "Benue State Ministry of Health"],
  borno: ["Borno State Ministry of Health", "University of Maiduguri Teaching Hospital"],
  "cross-river": ["Cross River State Ministry of Health", "University of Calabar Teaching Hospital"],
  delta: ["Delta State University Teaching Hospital", "Delta State Ministry of Health"],
  ebonyi: ["Ebonyi State University Teaching Hospital", "Ebonyi State Ministry of Health"],
  edo: ["University of Benin Teaching Hospital", "Edo State Ministry of Health"],
  ekiti: ["Ekiti State University Teaching Hospital", "Ekiti State Ministry of Health"],
  enugu: ["University of Nigeria Teaching Hospital", "Enugu State Ministry of Health"],
  gombe: ["Gombe State Ministry of Health", "Gombe State Teaching Hospital"],
  imo: ["Imo State University Teaching Hospital", "Imo State Ministry of Health"],
  jigawa: ["Jigawa State Ministry of Health", "Jigawa State Teaching Hospital"],
  kaduna: ["Ahmadu Bello University Teaching Hospital", "Kaduna State Ministry of Health"],
  kano: ["Aminu Kano Teaching Hospital", "Kano State Ministry of Health"],
  katsina: ["Usmanu Danfodiyo University Teaching Hospital", "Katsina State Ministry of Health"],
  kebbi: ["Kebbi State Ministry of Health", "Kebbi State Teaching Hospital"],
  kogi: ["Kogi State University Teaching Hospital", "Kogi State Ministry of Health"],
  osun: [
    "Ife Central LGA PHC",
    "Osun State Ministry of Health",
    "Obafemi Awolowo University Teaching Hospitals Complex",
    "Osun State University Teaching Hospital",
  ],
  oyo: [
    "University College Hospital",
    "Oyo State Ministry of Health",
    "Oyo State University Teaching Hospital",
  ],
  plateau: ["Plateau State Ministry of Health", "Jos University Teaching Hospital"],
  rivers: ["University of Port Harcourt Teaching Hospital", "Rivers State Ministry of Health"],
  sokoto: ["Sokoto State Ministry of Health", "Usmanu Danfodiyo University Teaching Hospital"],
  taraba: ["Taraba State Ministry of Health", "Federal Medical Centre Taraba"],
  yobe: ["Yobe State Ministry of Health", "Federal Medical Centre Damaturu"],
  zamfara: ["Zamfara State Ministry of Health", "Federal Medical Centre Zamfara"],
  fct: ["Federal Capital Territory Ministry of Health", "National Hospital Abuja"],
};

const DEFAULT_ORGS: Record<string, string[]> = {
  federal: ["Federal Ministry of Health", "Nigerian Centre for Disease Control"],
};

function buildStore(): Map<string, Organization[]> {
  const map = new Map<string, Organization[]>();

  for (const state of REFERENCE_STATES) {
    const names = MOCK_ORGANIZATIONS[state.id] ?? [];
    const orgs = names.map((name, i) => ({
      id: `${state.id}-org-${i + 1}`,
      name,
      stateId: state.id,
      type: "ministry" as const,
      status: "active" as const,
    }));
    map.set(state.id, orgs);
  }

  const federalNames = DEFAULT_ORGS.federal ?? [];
  const federalOrgs = federalNames.map((name, i) => ({
    id: `federal-org-${i + 1}`,
    name,
    stateId: "federal",
    type: "ministry" as const,
    status: "active" as const,
  }));
  map.set("federal", federalOrgs);

  return map;
}

const store = buildStore();

export function createOrganizationsService(): OrganizationService {
  return {
    async getOrganizationsByState(stateId: string): Promise<readonly Organization[]> {
      await delay(100);
      return store.get(stateId) ?? [];
    },
  };
}

export const organizationsService: OrganizationService = createOrganizationsService();
