import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { canReviewGoalSheets, getTeamSheets } from "@/lib/services/goalsheet.service";

// DIP: route depends on the service abstraction, not on Prisma directly.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session as any;

  // LSP: MANAGER and ADMIN both satisfy the reviewer contract uniformly.
  if (!canReviewGoalSheets(user.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const data = await getTeamSheets(user.id);
  return NextResponse.json(data);
}
