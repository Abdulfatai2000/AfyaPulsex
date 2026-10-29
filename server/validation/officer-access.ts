// Shared Zod schema for officer access requests. Whole team contributes;
// Dev 4 reviews (privacy + approval chain).
import { z } from "zod";

export const accessRequestSchema = z.object({
  citizen: z.string().trim().optional(),
  jurisdiction: z.string().trim().min(1, "Jurisdiction is required"),
  scopes: z
    .array(z.string().trim().min(1))
    .min(1, "At least one scope required"),
  justification: z.string().trim().min(10, "Justification too short"),
  expiresAt: z.coerce.date().optional(),
});

export type AccessRequestInput = z.infer<typeof accessRequestSchema>;
