import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import {
  canReviewGoalSheets,
  approveGoalSheet,
  returnGoalSheetForRework,
  unlockGoalSheet,
} from "@/lib/services/goalsheet.service";

// DIP: route delegates all business logic to GoalSheetService.
// Route is only responsible for: auth, request parsing, HTTP response.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session as any;
  const { id } = await params;
  const body = await req.json();

  // ── Employee: submit ──────────────────────────────────────────────────────
  if (body.status === "SUBMITTED") {
    const sheet = await prisma.goalSheet.findUnique({
      where: { id },
      include: { goals: true },
    });
    if (!sheet) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (sheet.employeeId !== user.id)
      return NextResponse.json({ error: "Not your sheet" }, { status: 403 });

    const totalWeight = sheet.goals.reduce((sum, g) => sum + g.weightage, 0);
    if (sheet.goals.length === 0)
      return NextResponse.json({ error: "Add at least one goal before submitting." }, { status: 400 });
    if (totalWeight !== 100)
      return NextResponse.json(
        { error: `Total weightage must be 100%. Currently ${totalWeight}%.` },
        { status: 400 }
      );

    const updated = await prisma.goalSheet.update({
      where: { id },
      data: { status: "SUBMITTED", managerNote: null },
    });
    await createAuditLog({
      userId: user.id,
      action: "GOAL_SUBMITTED",
      entityType: "GoalSheet",
      entityId: id,
      oldValue: { status: sheet.status },
      newValue: { status: "SUBMITTED" },
    });
    return NextResponse.json(updated);
  }

  // ── Manager / Admin: approve or return ───────────────────────────────────
  if (body.status === "APPROVED" || body.status === "REWORK") {
    if (!canReviewGoalSheets(user.role))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    try {
      const updated =
        body.status === "APPROVED"
          ? await approveGoalSheet(id, user.id)
          : await returnGoalSheetForRework(id, user.id, body.managerNote ?? null);

      return NextResponse.json(updated);
    } catch (err: any) {
      return NextResponse.json({ error: err.message || "Operation failed" }, { status: 400 });
    }
  }

  // ── Admin: unlock ─────────────────────────────────────────────────────────
  if (body.unlock && user.role === "ADMIN") {
    try {
      const updated = await unlockGoalSheet(id, user.id);
      return NextResponse.json(updated);
    } catch (err: any) {
      return NextResponse.json({ error: err.message || "Unlock failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Invalid operation" }, { status: 400 });
}
