import { requireAdmin } from "@/server/auth/rbac";
import { connectDB } from "@/server/db/connection";
import { User, AuditLog } from "@/server/models";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const actionSchema = z.object({
  action: z.enum(["suspend", "reactivate", "deactivate"]),
  reason: z.string().min(1).max(500).optional(),
  suspendedUntil: z.string().datetime().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    await connectDB();

    const { id } = await params;
    const body = await req.json();
    const result = actionSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }
    const { action, reason, suspendedUntil } = result.data;

    const targetUser = await User.findById(id).select("email role accountStatus").lean();
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Prevent admin from suspending/deactivating themselves
    if (targetUser._id.toString() === session.user.id) {
      return NextResponse.json({ error: "You cannot modify your own account" }, { status: 400 });
    }

    let update: Record<string, unknown> = {};
    let auditAction = "";

    switch (action) {
      case "suspend":
        update = {
          accountStatus: "suspended",
          suspendedUntil: suspendedUntil ? new Date(suspendedUntil) : null,
          suspensionReason: reason || "Suspended by admin",
        };
        auditAction = "suspend";
        break;
      case "reactivate":
        update = {
          accountStatus: "active",
          suspendedUntil: null,
          suspensionReason: null,
        };
        auditAction = "reactivate";
        break;
      case "deactivate":
        update = {
          accountStatus: "deactivated",
          suspensionReason: reason || "Deactivated by admin",
        };
        auditAction = "deactivate";
        break;
    }

    await User.findByIdAndUpdate(id, update);

    // Create audit log
    await AuditLog.create({
      actor: session.user.id,
      actorRole: "admin",
      action: auditAction,
      targetEmail: targetUser.email,
      targetRole: targetUser.role,
      resourceType: "user",
      resourceId: id,
      reason: reason || null,
      metadata: {
        suspendedUntil: suspendedUntil || null,
        previousStatus: targetUser.accountStatus,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[admin.users.action]", err);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}