import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const notification = await prisma.notification.update({
      where: { id, userId: (session as any).id },
      data:  { isRead: true },
    });
    return NextResponse.json(notification);
  } catch {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
}
