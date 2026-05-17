import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || (session as any).role !== "ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status"); // OPEN | RESOLVED | null (all)

  const events = await prisma.escalationEvent.findMany({
    where:   status ? { status } : undefined,
    include: {
      rule:    { select: { id: true, name: true, type: true } },
      subject: { select: { id: true, name: true, email: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
    take:    200,
  });

  // Enrich: resolve human-readable context label
  const enriched = await Promise.all(
    events.map(async (ev) => {
      let contextLabel = ev.contextId;

      // GoalSheet context — look up employee + cycle name
      const sheetId = ev.contextId.includes(":") ? ev.contextId.split(":")[0] : ev.contextId;
      if (!ev.contextId.startsWith("cycle-")) {
        const sheet = await prisma.goalSheet.findUnique({
          where: { id: sheetId },
          select: { employee: { select: { name: true } }, cycle: { select: { name: true } } },
        });
        if (sheet) {
          const quarter = ev.contextId.includes(":") ? ` · ${ev.contextId.split(":")[1]}` : "";
          contextLabel = `${sheet.employee.name} — ${sheet.cycle.name}${quarter}`;
        }
      } else {
        // Synthetic key: cycle-{cycleId}-emp-{empId}
        contextLabel = `${ev.subject.name} (no sheet yet)`;
      }

      return { ...ev, contextLabel };
    })
  );

  return NextResponse.json(enriched);
}
