import mongoose from "mongoose";
import { safeErrorCategory } from "@/server/lib/safe-error";

export class DatabaseUnavailableError extends Error {
  constructor() {
    super("Database temporarily unavailable.");
    this.name = "DatabaseUnavailableError";
  }
}

declare global {
  var mongooseConn: Promise<typeof mongoose> | undefined;
}

export async function connectDB(): Promise<typeof mongoose> {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error(
      "MONGODB_URI is not set. Copy .env.example to .env.local and fill in your MongoDB connection string.",
    );
  }

  if (global.mongooseConn) {
    return global.mongooseConn;
  }

  global.mongooseConn = mongoose
    .connect(uri, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 10,
      minPoolSize: 2,
    })
    .catch((error: unknown) => {
      global.mongooseConn = undefined;
      console.error("[database.connect]", safeErrorCategory(error));
      throw new DatabaseUnavailableError();
    });

  return global.mongooseConn;
}

export async function closeDB(): Promise<void> {
  await mongoose.disconnect();
  global.mongooseConn = undefined;
}
