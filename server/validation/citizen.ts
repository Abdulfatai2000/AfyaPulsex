// Shared Zod schemas for citizen profile — used by BOTH client forms and server
// services. Whole team contributes; Dev 4 reviews.
import { z } from "zod";

export const citizenProfileSetupSchema = z.object({
  dateOfBirth: z.coerce.date().optional(),
  gender: z
    .enum(["male", "female", "non_binary", "undisclosed"])
    .default("undisclosed"),
  phone: z.string().trim().optional(),
  jurisdiction: z.string().trim().optional(),
  bloodType: z
    .enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "unknown"])
    .default("unknown"),
});

export type CitizenProfileSetupInput = z.infer<
  typeof citizenProfileSetupSchema
>;
