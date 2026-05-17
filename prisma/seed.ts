import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";
dotenv.config();

const dbUrl      = process.env.DATABASE_URL   || "file:./dev.db";
const authToken  = process.env.TURSO_AUTH_TOKEN;          // undefined in local dev, required for Turso
const adapter    = new PrismaLibSql({ url: dbUrl, authToken });
const prisma     = new PrismaClient({ adapter } as any);

async function main() {
  console.log("Seeding database...");

  // Create users
  const adminPass = await bcrypt.hash("password123", 10);
  const managerPass = await bcrypt.hash("password123", 10);
  const empPass = await bcrypt.hash("password123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@atomberg.com" },
    update: {},
    create: {
      name: "Priya Sharma",
      email: "admin@atomberg.com",
      password: adminPass,
      role: "ADMIN",
      department: "HR",
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: "manager@atomberg.com" },
    update: {},
    create: {
      name: "Rahul Verma",
      email: "manager@atomberg.com",
      password: managerPass,
      role: "MANAGER",
      department: "Sales",
      managerId: admin.id,
    },
  });

  const employee1 = await prisma.user.upsert({
    where: { email: "employee@atomberg.com" },
    update: {},
    create: {
      name: "Ankit Gupta",
      email: "employee@atomberg.com",
      password: empPass,
      role: "EMPLOYEE",
      department: "Sales",
      managerId: manager.id,
    },
  });

  const employee2 = await prisma.user.upsert({
    where: { email: "employee2@atomberg.com" },
    update: {},
    create: {
      name: "Sneha Patel",
      email: "employee2@atomberg.com",
      password: empPass,
      role: "EMPLOYEE",
      department: "Sales",
      managerId: manager.id,
    },
  });

  const employee3 = await prisma.user.upsert({
    where: { email: "employee3@atomberg.com" },
    update: {},
    create: {
      name: "Karan Mehta",
      email: "employee3@atomberg.com",
      password: empPass,
      role: "EMPLOYEE",
      department: "Engineering",
      managerId: manager.id,
    },
  });

  console.log("Users created.");

  // Create thrust areas
  const thrustAreaNames = [
    "Revenue Growth",
    "Customer Satisfaction",
    "Operational Excellence",
    "Product Development",
    "People & Culture",
    "Cost Optimisation",
    "Safety & Compliance",
    "Digital Transformation",
  ];

  const thrustAreas: Record<string, any> = {};
  for (const name of thrustAreaNames) {
    const area = await prisma.thrustArea.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    thrustAreas[name] = area;
  }

  console.log("Thrust areas created.");

  // Create active goal cycle
  const existing = await prisma.goalCycle.findFirst({ where: { name: "FY 2025-26" } });
  let cycle: any;
  if (!existing) {
    await prisma.goalCycle.updateMany({ data: { isActive: false } });
    cycle = await prisma.goalCycle.create({
      data: {
        name: "FY 2025-26",
        year: 2025,
        isActive: true,
        windows: {
          create: [
            { phase: "GOAL_SETTING", opensAt: new Date("2025-05-01"), closesAt: new Date("2025-06-30"), isOpen: true },
            { phase: "Q1_CHECKIN", opensAt: new Date("2025-07-01"), closesAt: new Date("2025-07-31"), isOpen: false },
            { phase: "Q2_CHECKIN", opensAt: new Date("2025-10-01"), closesAt: new Date("2025-10-31"), isOpen: false },
            { phase: "Q3_CHECKIN", opensAt: new Date("2026-01-01"), closesAt: new Date("2026-01-31"), isOpen: false },
            { phase: "Q4_ANNUAL", opensAt: new Date("2026-03-01"), closesAt: new Date("2026-04-30"), isOpen: false },
          ],
        },
      },
    });
  } else {
    cycle = existing;
  }

  console.log("Cycle created.");

  // Create goal sheet for employee1 (APPROVED) with achievements
  const existingSheet1 = await prisma.goalSheet.findFirst({
    where: { employeeId: employee1.id, cycleId: cycle.id },
  });

  if (!existingSheet1) {
    const sheet1 = await prisma.goalSheet.create({
      data: {
        employeeId: employee1.id,
        cycleId: cycle.id,
        status: "APPROVED",
        goals: {
          create: [
            {
              thrustAreaId: thrustAreas["Revenue Growth"].id,
              title: "Achieve Q3 Sales Target",
              description: "Drive sales revenue to ₹50L in Q3",
              uomType: "NUMERIC_MIN",
              target: 5000000,
              weightage: 30,
              isLocked: true,
              achievements: {
                create: [
                  { quarter: "Q1", actualValue: 3200000, status: "ON_TRACK", computedScore: 64 },
                  { quarter: "Q2", actualValue: 4100000, status: "ON_TRACK", computedScore: 82 },
                ],
              },
            },
            {
              thrustAreaId: thrustAreas["Customer Satisfaction"].id,
              title: "Improve NPS Score",
              description: "Raise Net Promoter Score from 42 to 60",
              uomType: "NUMERIC_MIN",
              target: 60,
              weightage: 25,
              isLocked: true,
              achievements: {
                create: [
                  { quarter: "Q1", actualValue: 48, status: "ON_TRACK", computedScore: 80 },
                  { quarter: "Q2", actualValue: 55, status: "ON_TRACK", computedScore: 91.7 },
                ],
              },
            },
            {
              thrustAreaId: thrustAreas["Operational Excellence"].id,
              title: "Reduce Response TAT",
              description: "Bring average response time below 4 hours",
              uomType: "NUMERIC_MAX",
              target: 4,
              weightage: 20,
              isLocked: true,
              achievements: {
                create: [
                  { quarter: "Q1", actualValue: 6.2, status: "ON_TRACK", computedScore: 64.5 },
                  { quarter: "Q2", actualValue: 4.8, status: "ON_TRACK", computedScore: 83.3 },
                ],
              },
            },
            {
              thrustAreaId: thrustAreas["Safety & Compliance"].id,
              title: "Zero Safety Incidents",
              description: "Maintain zero workplace safety incidents",
              uomType: "ZERO",
              target: 0,
              weightage: 15,
              isLocked: true,
              achievements: {
                create: [
                  { quarter: "Q1", actualValue: 0, status: "COMPLETED", computedScore: 100 },
                  { quarter: "Q2", actualValue: 0, status: "COMPLETED", computedScore: 100 },
                ],
              },
            },
            {
              thrustAreaId: thrustAreas["Product Development"].id,
              title: "Launch Q2 Product Feature",
              uomType: "TIMELINE",
              target: 1,
              targetDate: new Date("2025-09-30"),
              weightage: 10,
              isLocked: true,
              achievements: {
                create: [
                  { quarter: "Q2", actualDate: new Date("2025-09-25"), status: "COMPLETED", computedScore: 100 },
                ],
              },
            },
          ],
        },
      },
    });

    // Add check-ins for employee1
    await prisma.checkIn.createMany({
      data: [
        { goalSheetId: sheet1.id, managerId: manager.id, quarter: "Q1", comment: "Ankit is progressing well on his sales targets. Revenue is at 64% of Q1 goal. Discussed pipeline improvements. Key focus for Q2: close the NPS gap by engaging top 20 customers directly." },
        { goalSheetId: sheet1.id, managerId: manager.id, quarter: "Q2", comment: "Strong performance this quarter — NPS jumped to 55 and the product launch landed ahead of schedule. TAT still needs work. Action item: review ticket triage process before Q3." },
      ],
    });
  }

  // Create submitted sheet for employee2
  const existingSheet2 = await prisma.goalSheet.findFirst({
    where: { employeeId: employee2.id, cycleId: cycle.id },
  });

  if (!existingSheet2) {
    await prisma.goalSheet.create({
      data: {
        employeeId: employee2.id,
        cycleId: cycle.id,
        status: "SUBMITTED",
        goals: {
          create: [
            {
              thrustAreaId: thrustAreas["Revenue Growth"].id,
              title: "New Customer Acquisition",
              uomType: "NUMERIC_MIN",
              target: 25,
              weightage: 40,
              isLocked: false,
            },
            {
              thrustAreaId: thrustAreas["Cost Optimisation"].id,
              title: "Reduce Travel Expenses",
              uomType: "NUMERIC_MAX",
              target: 50000,
              weightage: 30,
              isLocked: false,
            },
            {
              thrustAreaId: thrustAreas["People & Culture"].id,
              title: "Complete Training Modules",
              uomType: "NUMERIC_MIN",
              target: 6,
              weightage: 30,
              isLocked: false,
            },
          ],
        },
      },
    });
  }

  // Draft sheet for employee3
  const existingSheet3 = await prisma.goalSheet.findFirst({
    where: { employeeId: employee3.id, cycleId: cycle.id },
  });

  if (!existingSheet3) {
    await prisma.goalSheet.create({
      data: {
        employeeId: employee3.id,
        cycleId: cycle.id,
        status: "DRAFT",
        goals: {
          create: [
            {
              thrustAreaId: thrustAreas["Digital Transformation"].id,
              title: "Migrate Services to Cloud",
              uomType: "NUMERIC_MIN",
              target: 8,
              weightage: 50,
            },
            {
              thrustAreaId: thrustAreas["Operational Excellence"].id,
              title: "Reduce Bug Backlog",
              uomType: "NUMERIC_MAX",
              target: 10,
              weightage: 50,
            },
          ],
        },
      },
    });
  }

  console.log("Goal sheets created.");

  // Default escalation rules
  const defaultRules = [
    { name: "Goal Submission Reminder",   type: "GOAL_NOT_SUBMITTED",    thresholdDays: 7,  level2Days: 3, level3Days: 3 },
    { name: "Goal Approval Reminder",     type: "GOAL_NOT_APPROVED",     thresholdDays: 5,  level2Days: 3, level3Days: 3 },
    { name: "Quarterly Check-in Reminder",type: "CHECKIN_NOT_COMPLETED", thresholdDays: 7,  level2Days: 5, level3Days: 3 },
  ];
  for (const rule of defaultRules) {
    const existing = await (prisma as any).escalationRule.findFirst({ where: { type: rule.type } });
    if (!existing) {
      await (prisma as any).escalationRule.create({ data: rule });
    }
  }
  console.log("Escalation rules created.");

  console.log("\n✅ Seed complete!");
  console.log("\nDemo credentials:");
  console.log("  Admin:    admin@atomberg.com   / password123");
  console.log("  Manager:  manager@atomberg.com / password123");
  console.log("  Employee: employee@atomberg.com / password123");
}

main().catch(console.error).finally(() => prisma.$disconnect());
