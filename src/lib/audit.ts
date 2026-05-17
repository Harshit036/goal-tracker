import { prisma } from "@/lib/prisma";

// SRP: sole responsibility is writing an immutable audit entry.
// actorName is snapshotted at write time so the record survives user deletion.
export async function createAuditLog({
  userId,
  action,
  entityType,
  entityId,
  oldValue,
  newValue,
}: {
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValue?: object | null;
  newValue?: object | null;
}) {
  // Snapshot the actor's name — userId will become null if the user is ever deleted.
  // Fail-safe: a lookup error must never block the main operation.
  let actorName: string | null = null;
  try {
    const actor = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    actorName = actor?.name ?? null;
  } catch { /* non-fatal */ }

  await prisma.auditLog.create({
    data: {
      userId,
      actorName,
      action,
      entityType,
      entityId,
      oldValue: oldValue ? JSON.stringify(oldValue) : null,
      newValue: newValue ? JSON.stringify(newValue) : null,
    },
  });
}
