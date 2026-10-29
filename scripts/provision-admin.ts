import { emitKeypressEvents, type Key } from "node:readline";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { config } from "dotenv";
import { connectDB, closeDB } from "../server/db/connection";
import { User } from "../server/models/User";
import hashPassword from "../server/lib/hashpassword";
import { emailSchema, passwordSchema } from "../lib/validation/validators";
import { safeErrorCategory } from "../server/lib/safe-error";

/** Never updates an existing account, password, role, status or verification state. */
export async function provisionAdmin(email: string, password: string) {
  const normalizedEmail = emailSchema.parse(email);
  passwordSchema.parse(password);
  // bcrypt only considers the first 72 bytes. Reject silent password truncation.
  if (Buffer.byteLength(password, "utf8") > 72)
    throw new Error("Password must be at most 72 UTF-8 bytes.");
  await connectDB();
  const existing = await User.findOne({ email: normalizedEmail }).lean();
  if (existing) {
    return existing.role === "admin" && existing.accountStatus === "active"
      ? "already-provisioned" as const
      : "existing-account" as const;
  }
  const passwordHash = await hashPassword(password);
  try {
    // The unique email index protects against a concurrent signup/provisioning run.
    await User.init();
    await User.create({
      name: "AfyaPulse Administrator",
      email: normalizedEmail,
      passwordHash,
      role: "admin",
      accountStatus: "active",
      simulation: false,
    });
    return "created" as const;
  } catch (error) {
    if (safeErrorCategory(error) === "duplicate_key") return "existing-account" as const;
    throw error;
  }
}

// Raw terminal input keeps passwords out of terminal echo, shell history and logs.
export function prompt(label: string, secret = false): Promise<string> {
  return new Promise((resolvePrompt, reject) => {
    let value = "";
    const wasRaw = process.stdin.isRaw;
    process.stdout.write(label);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    function finish() {
      process.stdin.removeListener("keypress", onKey);
      process.stdin.setRawMode(wasRaw);
      process.stdin.pause();
      process.stdout.write("\n");
    }
    function onKey(text: string | undefined, key: Key) {
      if (key.ctrl && (key.name === "c" || key.name === "d")) {
        value = "";
        finish();
        reject(new Error("Provisioning cancelled."));
      } else if (key.name === "return" || key.name === "enter") {
        const result = value;
        value = "";
        finish();
        resolvePrompt(result);
      } else if (key.name === "backspace") {
        if (value.length) {
          value = Array.from(value).slice(0, -1).join("");
          if (!secret) process.stdout.write("\b \b");
        }
      } else if (text && !key.ctrl && !key.meta && !/[\x00-\x1f\x7f]/.test(text)) {
        if (value.length + text.length <= 254) {
          value += text;
          if (!secret) process.stdout.write(text);
        }
      }
    }
    process.stdin.on("keypress", onKey);
  });
}

async function main() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    console.error("Run npm run provision:admin in an interactive terminal. Piped credentials are not accepted.");
    process.exitCode = 1;
    return;
  }
  config({ path: resolve(process.cwd(), ".env.local"), quiet: true });
  emitKeypressEvents(process.stdin);
  let password = "";
  let confirmation = "";
  try {
    const email = emailSchema.safeParse(await prompt("Admin email: "));
    if (!email.success) {
      console.error("Enter a valid Admin email address.");
      process.exitCode = 1;
      return;
    }
    password = await prompt("Admin password (hidden): ", true);
    confirmation = await prompt("Confirm password (hidden): ", true);
    if (password !== confirmation) {
      console.error("Passwords do not match. No account was changed.");
      process.exitCode = 1;
      return;
    }
    confirmation = "";
    if (!passwordSchema.safeParse(password).success || Buffer.byteLength(password, "utf8") > 72) {
      console.error("Use a password of at least 8 characters and at most 72 UTF-8 bytes.");
      process.exitCode = 1;
      return;
    }
    const result = await provisionAdmin(email.data, password);
    password = "";
    if (result === "existing-account") {
      console.error("Email already exists. No password, role or account status was changed. Use a separate Admin email.");
      process.exitCode = 1;
      return;
    }
    console.log(result === "created" ? "Admin created with ACTIVE status." : "Active Admin already exists. Account and password unchanged.");
    console.log("Sign in at /admin/login, then open /admin/dashboard.");
    console.log("The current Admin policy does not require email OTP. Email verification was not marked complete.");
  } catch (error) {
    console.error("Admin provisioning failed or was cancelled:", safeErrorCategory(error));
    process.exitCode = 1;
  } finally {
    password = "";
    confirmation = "";
    await closeDB();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  void main().catch(() => { console.error("Unable to finish Admin provisioning."); process.exitCode = 1; });
}
