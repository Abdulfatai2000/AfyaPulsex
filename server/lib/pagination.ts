// Small list helpers shared by services that paginate.
export function safeLimit(limit?: number, cap = 100): number {
  return Math.min(Math.max(limit ?? 50, 1), cap);
}

export function safeOffset(page = 1, limit = 50): number {
  return Math.max(page - 1, 0) * limit;
}
