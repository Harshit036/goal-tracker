# AtomQuest — Goal Setting & Tracking Portal

> Built for the Atomberg Frontend Engineer assignment — an enterprise-grade OKR / goal-tracking system for managing employee performance across an organisation.

---

## Live Demo

**URL:** _[Deploy and paste URL here]_

---

## Demo Credentials

| Role | Email | Password |
|---|---|---|
| **Admin / HR** | admin@atomberg.com | `password123` |
| **Manager** | manager@atomberg.com | `password123` |
| **Employee** | employee@atomberg.com | `password123` |

Additional seeded employees: `employee2@atomberg.com`, `employee3@atomberg.com` (password: `password123`)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript |
| Database | SQLite (local) / Turso (production) |
| ORM | Prisma v7 with libsql adapter |
| Auth | Custom JWT via `jose` (httpOnly cookies) |
| UI | Tailwind CSS v4 + Radix UI primitives |
| Charts | Recharts |
| Icons | Lucide React |

---

## Feature Set

### Core Modules

#### User & Hierarchy Management (Admin)
- Create / edit / delete users with role assignment (Employee, Manager, Admin)
- Manager hierarchy — cyclic dependency detection, last-admin guard
- `@atomberg.com` email validation (client + server)
- Password visibility toggle; admin can reset passwords
- Cascade deletion: removing a user cleans all their goals, sheets, achievements, check-ins, and shared goals, while preserving audit history

#### Goal Cycle Management (Admin)
- Full SOLID-based cycle state machine: `GOAL_SETTING → Q1_CHECKIN → Q2_CHECKIN → Q3_CHECKIN → Q4_ANNUAL → CLOSED`
- Admin manually advances phases via a phase stepper UI
- Delete cycles (with sheet-count safety check)

#### Goal Sheet Flow
- **Employee**: Create goals (Thrust Area, UoM, Target, Weightage) in DRAFT → submit
- **Validation**: total weightage must equal 100%, minimum 10% per goal, maximum 8 goals per sheet
- **Manager/Admin**: Review submitted sheets → Approve (locks goals) or Return for Rework
- **Admin**: Unlock approved sheets to allow amendments

#### Quarterly Achievement Tracking
- Employees log Q1–Q4 actuals per goal
- Auto-computed scores by UoM type:
  - `NUMERIC_MIN` — score = (actual / target) × 100, capped at 100
  - `NUMERIC_MAX` — score = (target / actual) × 100, capped at 100 (lower is better)
  - `TIMELINE` — 100 if on or before target date, 50 if within grace, 0 otherwise
  - `ZERO` — 100 if actual = 0, else 0

#### Manager Check-ins
- Quarterly structured comments per goal sheet
- Check-in window matches the active cycle phase

#### Shared / Pushed Goals (Admin)
- Admin can push a goal as a template to multiple employees
- Shared goals are linked; deleting the source nulls the link (not the target)

### Bonus Modules

#### Escalation Module (Rule-Based)
- Configurable rules for three triggers:
  - **GOAL_NOT_SUBMITTED** — employee hasn't submitted within N days of Goal Setting opening
  - **GOAL_NOT_APPROVED** — manager hasn't approved a submission within N days
  - **CHECKIN_NOT_COMPLETED** — check-in not completed within N days of a check-in window opening
- Three-level escalation chain per rule:
  - **Level 1** → notify the responsible party (employee / manager)
  - **Level 2** → escalate to manager / skip-level
  - **Level 3** → HR / Admin alert
- Auto-resolution: events close when the underlying condition clears
- Deduplication: notifications are not re-sent for the same level
- In-app notification bell (top-right header, all roles) — real-time unread count, dropdown panel, mark-as-read
- Admin events log — filterable by OPEN / RESOLVED, full audit trail

#### Org Chart
- Visual hierarchy tree of the reporting structure

#### Analytics Dashboard
- Approval rate, average score by quarter
- Goal distribution by Thrust Area
- Department completion rates

#### Audit Log
- Immutable log of all significant actions
- Actor name snapshot — log entries survive user deletion (shown with "deleted" badge)

---

## Architecture

See [`architecture-diagram.html`](./architecture-diagram.html) — open in a browser and print to PDF.

---

## Local Setup

### Prerequisites
- Node.js 20+
- npm

### Steps

```bash
# 1. Clone the repo
git clone <repo-url>
cd goaltracker

# 2. Install dependencies
npm install

# 3. Copy env file and edit if needed
cp .env.example .env

# 4. Run database migrations
npx prisma migrate dev

# 5. Seed demo data
npx ts-node --project tsconfig.json prisma/seed.ts

# 6. Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Production Deployment (Vercel + Turso)

This app uses the libsql adapter and works with [Turso](https://turso.tech) (hosted SQLite) out of the box.

### 1. Create a Turso database

```bash
# Install Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

turso auth login
turso db create atomquest

# Get your connection URL and auth token
turso db show atomquest --url
turso db tokens create atomquest
```

### 2. Push schema to Turso

```bash
DATABASE_URL="libsql://<your-db>.turso.io" \
TURSO_AUTH_TOKEN="<your-token>" \
npx prisma migrate deploy
```

### 3. Seed production data

```bash
DATABASE_URL="libsql://<your-db>.turso.io" \
TURSO_AUTH_TOKEN="<your-token>" \
npx ts-node --project tsconfig.json prisma/seed.ts
```

### 4. Deploy to Vercel

```bash
npx vercel --prod
```

Set these environment variables in the Vercel dashboard:

| Variable | Value |
|---|---|
| `DATABASE_URL` | `libsql://<your-db>.turso.io` |
| `TURSO_AUTH_TOKEN` | your Turso auth token |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `https://<your-app>.vercel.app` |

---

## Design Principles

- **SOLID** — SRP (service layer), OCP (extensible phase/rule configs), LSP (canReviewGoalSheets predicate), ISP (client-safe constants split from server-only services), DIP (routes depend on service abstractions)
- **Security** — httpOnly JWT cookies, server-side RBAC on every API route, bcrypt password hashing, email domain validation
- **Data integrity** — explicit cascade deletion order (not relying on DB cascade ordering), self-referential cycle detection for manager hierarchy, last-admin guard
- **Audit trail** — actor name snapshotted at write time; `userId` nullable so logs survive account deletion

---

## Project Structure

```
src/
├── app/
│   ├── (app)/              # Authenticated shell (sidebar layout)
│   │   ├── admin/          # Admin-only pages
│   │   │   ├── cycles/     # Cycle management
│   │   │   ├── escalation/ # Escalation rules + events log
│   │   │   ├── users/      # User management
│   │   │   ├── audit/      # Audit log
│   │   │   ├── hierarchy/  # Org chart
│   │   │   ├── reports/    # CSV reports
│   │   │   └── shared-goals/
│   │   ├── manager/        # Manager pages
│   │   ├── goals/          # Employee goal sheet
│   │   ├── achievements/   # Quarterly tracking
│   │   ├── analytics/      # Charts & KPIs
│   │   └── dashboard/      # Role-based dashboard
│   └── api/                # API routes
├── components/             # Shared UI components
│   ├── ui/                 # Primitives (Button, Card, Badge…)
│   ├── Sidebar.tsx
│   └── NotificationBell.tsx
└── lib/
    ├── auth.ts             # JWT helpers
    ├── prisma.ts           # DB client
    ├── audit.ts            # Audit log writer
    └── services/           # Business logic
        ├── cycle.constants.ts
        ├── cycle.service.ts
        ├── goalsheet.service.ts
        └── escalation.service.ts
prisma/
├── schema.prisma
├── migrations/
└── seed.ts
```
