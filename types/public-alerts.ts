import { z } from "zod";
// Citizen response DTO, deliberately separate from the unfinished Mongoose PublicAlert.
// No warning IDs, officer notes, investigation fields or private health records belong here.
export const citizenPublicAlertSchema = z.object({
 id:z.string().min(1),category:z.enum(["important","advisory","information"]),
 title:z.string().min(1),summary:z.string().min(1),affectedArea:z.object({label:z.string().min(1)}),
 publishedAt:z.iso.datetime({offset:true}),updatedAt:z.iso.datetime({offset:true}).optional(),
 issuedBy:z.string().optional(),approvedBy:z.string().optional(),
 details:z.string().min(1),guidance:z.array(z.string()).optional(),learnMoreUrl:z.string().optional(),
 status:z.literal("published"),
});
export type CitizenPublicAlert=z.infer<typeof citizenPublicAlertSchema>;
export type AlertCategory=CitizenPublicAlert["category"];
export interface CitizenAlertFeed { records: unknown[]; asOf:string; }
// TODO(DEV3): replace demo adapter with a published citizen-safe PublicAlert service.
// Resolve the server model's internal level into an explicitly reviewed citizen category.
// TODO(DEV4): enforce authorization/public-safe responses on the server; never send internal
// officer/investigation fields to the browser. Frontend projection is not access control.

