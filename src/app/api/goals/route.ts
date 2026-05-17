import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = session as any;
    const body = await req.json();
    const { goalSheetId, thrustAreaId, title, description, uomType, target, targetDate, weightage } = body;

    if (!goalSheetId || !thrustAreaId || !title || !uomType || !weightage) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const sheet = await prisma.goalSheet.findUnique({
      where: { id: goalSheetId },
      include: { goals: true, cycle: true },
    });
    if (!sheet) return NextResponse.json({ error: "Sheet not found" }, { status: 404 });
    if (sheet.employeeId !== user.id)
      return NextResponse.json({ error: "Not your sheet" }, { status: 403 });
    if (sheet.status === "APPROVED")
      return NextResponse.json({ error: "Sheet is approved and locked." }, { status: 400 });

    if ((sheet.cycle as any)?.status === "ACTIVE" || (sheet.cycle as any)?.status === "CLOSED")
      return NextResponse.json({ error: "Goal setting is closed for this cycle." }, { status: 400 });

    if (sheet.goals.length >= 8)
      return NextResponse.json({ error: "Maximum 8 goals allowed per employee." }, { status: 400 });

    const parsedWeight = parseInt(weightage);
    if (parsedWeight < 10)
      return NextResponse.json({ error: "Minimum weightage per goal is 10%." }, { status: 400 });

    const parsedTarget = uomType === "TIMELINE" ? 0 : parseFloat(target);
    if (uomType !== "TIMELINE" && isNaN(parsedTarget))
      return NextResponse.json({ error: "Target value is required." }, { status: 400 });

    const goal = await prisma.goal.create({
      data: {
        goalSheetId,
        thrustAreaId,
        title,
        description: description || null,
        uomType,
        target: parsedTarget,
        targetDate: targetDate ? new Date(targetDate) : null,
        weightage: parsedWeight,
      },
      include: { thrustArea: true },
    });

    await createAuditLog({ userId: user.id, action: "GOAL_CREATED", entityType: "Goal", entityId: goal.id, newValue: { title, uomType, target: parsedTarget, weightage: parsedWeight } });
    return NextResponse.json(goal, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/goals error:", err);
    return NextResponse.json({ error: err.message || "Failed to create goal." }, { status: 500 });
  }
}
