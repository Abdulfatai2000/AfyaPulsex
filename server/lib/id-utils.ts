// Dev 3 owns this file. Mongoose InferSchemaType omits `_id`, so document ids
// are accessed through these coercing helpers at the boundary layer instead of
// repeating unsafe casts across actions.
import type { Types } from "mongoose";

/**
 * Read the `_id` off a lean/document-shaped value (cast at the boundary where
 * Mongoose types intentionally omit it).
 */
export function docIdString(doc: unknown): string {
  return (doc as { _id?: { toString(): string } })._id?.toString() ?? "";
}

export function docId(doc: unknown): Types.ObjectId {
  return (doc as { _id: Types.ObjectId })._id;
}