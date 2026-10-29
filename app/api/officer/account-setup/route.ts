import { NextRequest, NextResponse } from "next/server";
import { STATUS_COOKIE, STATUS_MESSAGE, requestOfficerStatus, exchangeOfficerStatusToken, getOfficerSetupStatus, activateOfficerAccount } from "@/server/services/officer-account-setup";
import { officerRateLimit } from "@/server/services/officer-rate-limit";
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
export async function GET(req: NextRequest) {
  try { return json(await getOfficerSetupStatus(req.cookies.get(STATUS_COOKIE)?.value) ?? { status: "unverified" }); }
  catch { return json({ error: "Status is temporarily unavailable." }, 503); }
}
export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin !== req.nextUrl.origin) return json({ error: "Invalid request origin." }, 403);
  try {
    if (!await officerRateLimit("setup-api:global", 300, 60)) return json({ error: "Please try again later." }, 429);
    const body = await req.json();
    if (body.action === "check") {
      await requestOfficerStatus(body.fullName, body.email);
      return json({ message: STATUS_MESSAGE });
    }
    if (body.action === "exchange") {
      const token = await exchangeOfficerStatusToken(body.token);
      if (!token) return json({ error: "This link is invalid, expired or already used. Request a new status link." }, 400);
      const response = json({ ok: true });
      response.cookies.set(STATUS_COOKIE, token, { httpOnly: true, secure: req.nextUrl.protocol === "https:", sameSite: "strict", path: "/", maxAge: 900 });
      return response;
    }
    if (body.action === "activate") {
      const token = req.cookies.get(STATUS_COOKIE)?.value;
      if (!await officerRateLimit(`activate:${token ?? "none"}`, 5, 900)) return json({ error: "Please request a new status link later." }, 429);
      await activateOfficerAccount(token, body.password, body.confirmPassword);
      const response = json({ ok: true }); response.cookies.delete(STATUS_COOKIE); return response;
    }
    return json({ error: "Invalid request." }, 400);
  } catch { return json({ error: "Unable to complete this request. Check your inputs or request a new status link." }, 400); }
}
