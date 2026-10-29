import { config } from "dotenv";
import { resolve } from "node:path";
import { connectDB, closeDB } from "../server/db/connection";
import { safeErrorCategory } from "../server/lib/safe-error";

// Existing shell variables take precedence. Never print the connection string.
config({ path: resolve(__dirname, "../.env.local"), quiet: true });

async function main() {
  if (!process.env.MONGODB_URI?.trim()) {
    console.error(
      "FAIL: MONGODB_URI is missing. Set it in .env.local or your environment.",
    );
    process.exitCode = 1;
    return;
  }

  const started = Date.now();
  console.log(
    "Testing MONGODB_URI using the application's MongoDB connection...",
  );
  try {
    const mongoose = await connectDB();
    const db = mongoose.connection.db;
    if (!db) throw new Error("Database connection was not established.");
    await db.command({ ping: 1 }, { timeoutMS: 10000 });
    console.log(
      `PASS: Connected and ping succeeded (${Date.now() - started} ms).`,
    );
    console.log("No application data was read or changed.");
  } catch (error) {
    // connectDB prints the sanitized underlying network/TLS category itself.
    console.error(
      `FAIL: Connection or ping failed (${Date.now() - started} ms).`,
    );
    if (!(
      error instanceof Error && error.name === "DatabaseUnavailableError"
    )) {
      console.error(`Error category: ${safeErrorCategory(error)}`);
    }
    process.exitCode = 1;
  } finally {
    try {
      await closeDB();
    } catch {
      console.error("FAIL: Could not close the database connection cleanly.");
      process.exitCode = 1;
    }
  }
}

void main();
