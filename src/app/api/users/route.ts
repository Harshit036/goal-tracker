import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session as any;

  if (user.role === "MANAGER") {
    const users = await prisma.user.findMany({
      where: { managerId: user.id },
      select: { id: true, name: true, email: true, role: true, department: true, managerId: true },
    });
    return NextResponse.json(users);
  }

  if (user.role === "ADMIN") {
    const users = await prisma.user.findMany({
      include: { manager: { select: { id: true, name: true } } },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(users.map((u) => ({ ...u, password: undefined })));
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || (session as any).role !== "ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, email, password, role, department, managerId } = await req.json();

  if (!email?.toLowerCase().endsWith("@atomberg.com")) {
    return NextResponse.json({ error: "Email must be a valid @atomberg.com address." }, { status: 400 });
  }

  if ((role || "EMPLOYEE") === "EMPLOYEE" && !managerId) {
    return NextResponse.json({ error: "Employees must be assigned a manager." }, { status: 400 });
  }

  try {
    const hashed = await bcrypt.hash(password || "password123", 10);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
        role: role || "EMPLOYEE",
        department,
        managerId: managerId || null,
      },
      include: { manager: { select: { id: true, name: true } } },
    });
    return NextResponse.json({ ...user, password: undefined }, { status: 201 });
  } catch (err: any) {
    if (err.code === "P2002") return NextResponse.json({ error: "Email already exists." }, { status: 400 });
    return NextResponse.json({ error: err.message || "Failed to create user" }, { status: 500 });
  }
}
