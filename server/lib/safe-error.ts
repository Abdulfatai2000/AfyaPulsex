/** Log only categories, never raw errors, queries, tokens or connection strings. */
export function safeErrorCategory(error: unknown): string {
  if (!error || typeof error !== "object") return "unexpected_failure";
  const value = error as {
    name?: string;
    code?: unknown;
    cause?: unknown;
    reason?: { servers?: Map<unknown, { error?: unknown }> };
  };
  if (value.code === 11000) return "duplicate_key";
  const codes = [
    "ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR",
    "ECONNREFUSED",
    "ETIMEDOUT",
    "ENOTFOUND",
    "ECONNRESET",
  ];
  if (typeof value.code === "string" && codes.includes(value.code))
    return value.code;
  if (value.cause) {
    const category = safeErrorCategory(value.cause);
    if (category !== "unexpected_failure") return category;
  }
  if (value.reason?.servers instanceof Map) {
    for (const server of value.reason.servers.values()) {
      const category = safeErrorCategory(server.error);
      if (category !== "unexpected_failure") return category;
    }
  }
  if (
    [
      "MongoServerSelectionError",
      "MongooseServerSelectionError",
      "MongoNetworkError",
      "ValidationError",
      "CredentialsSignin",
      "MissingSecret",
    ].includes(value.name ?? "")
  )
    return value.name!;
  return "unexpected_failure";
}
