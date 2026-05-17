import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session as any).id;

  const notifications = await prisma.notification.findMany({
    where:   { userId },
    orderBy: { createdAt: "desc" },
    take:    50,
  });

  const unreadCount = await prisma.notification.count({ where: { userId, isRead: false } });

  return NextResponse.json({ notifications, unreadCount });
}

// Mark all as read
export async function PATCH() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.notification.updateMany({
    where: { userId: (session as any).id, isRead: false },
    data:  { isRead: true },
  });

  return NextResponse.json({ ok: true });
}
