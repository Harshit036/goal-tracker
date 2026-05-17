import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { runEscalationCheck } from "@/lib/services/escalation.service";
import { createAuditLog } from "@/lib/audit";

export async function POST() {
  const session = await getSession();
  if (!session || (session as any).role !== "ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const result = await runEscalationCheck();

    await createAuditLog({
      userId: (session as any).id,
      action: "ESCALATION_RUN",
      entityType: "System",
      entityId:   "escalation",
      newValue:   result,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Escalation check failed." }, { status: 500 });
  }
}
