export interface Organization {
  id: string;
  name: string;
  stateId: string;
  type: "facility" | "ministry" | "ngo" | "response_team";
  status: "active" | "inactive";
}

export interface OrganizationService {
  getOrganizationsByState(stateId: string): Promise<readonly Organization[]>;
}
