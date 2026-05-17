"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Target, CheckCircle, Clock, Users, AlertCircle, TrendingUp,
  FileText, Settings, GitBranch, BarChart3, Plus, ArrowRight, UserCheck,
} from "lucide-react";
import { SHEET_STATUS_LABELS, SHEET_STATUS_COLORS, STATUS_COLORS, STATUS_LABELS, cn } from "@/lib/utils";

const CYCLE_STATUS_LABELS: Record<string, string> = {
  GOAL_SETTING: "Goal Setting",
  ACTIVE: "Active",
  CLOSED: "Closed",
};
const CYCLE_STATUS_COLORS: Record<string, "info" | "success" | "secondary"> = {
  GOAL_SETTING: "info",
  ACTIVE: "success",
  CLOSED: "secondary",
};

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [me, setMe] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/dashboard").then((r) => r.json()),
      fetch("/api/me").then((r) => r.json()),
    ]).then(([d, user]) => { setData(d); setMe(user); });
  }, []);

  if (!data || !me) return <div className="flex h-full items-center justify-center text-[var(--fg-muted)]">Loading...</div>;

  if (me.role === "ADMIN") return <AdminDashboard data={data} me={me} />;
  if (me.role === "MANAGER") return <ManagerDashboard data={data} me={me} />;
  return <EmployeeDashboard data={data} me={me} />;
}

function StatCard({ icon: Icon, label, value, color = "amber", sub }: any) {
  const iconBg: Record<string, string> = {
    amber:  "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
    green:  "bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400",
    blue:   "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    purple: "bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
    red:    "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400",
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[var(--fg-2)]">{label}</p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-[var(--fg)]">{value}</p>
            {sub && <p className="mt-0.5 text-xs text-[var(--fg-muted)]">{sub}</p>}
          </div>
          <div className={cn("rounded-xl p-3", iconBg[color])}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ManagerBadge({ manager }: { manager: { name: string; department?: string | null } | null }) {
  if (!manager) return null;
  return (
    <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm w-fit">
      <UserCheck className="h-4 w-4 shrink-0 text-amber-500" />
      <span className="text-[var(--fg-muted)]">Reports to</span>
      <span className="font-semibold text-[var(--fg)]">{manager.name}</span>
      {manager.department && (
        <span className="text-xs text-[var(--fg-muted)]">· {manager.department}</span>
      )}
    </div>
  );
}

function AdminDashboard({ data, me }: any) {
  const completionRate = data.totalSheets > 0
    ? Math.round((data.approvedSheets / data.totalSheets) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-[var(--fg)]">Admin Dashboard</h1>
        <ManagerBadge manager={me?.manager ?? null} />
        {data.cycle ? (
          <div className="mt-1 flex items-center gap-2">
            <p className="text-sm text-[var(--fg-2)]">{data.cycle.name}</p>
            <Badge variant={CYCLE_STATUS_COLORS[data.cycle.status] || "secondary"} className="text-xs">
              {CYCLE_STATUS_LABELS[data.cycle.status] || data.cycle.status}
            </Badge>
          </div>
        ) : (
          <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">No active cycle — create one to get started.</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users}       label="Total Employees"  value={data.totalUsers}    color="amber" />
        <StatCard icon={FileText}    label="Goal Sheets"       value={data.totalSheets}   color="blue" />
        <StatCard icon={CheckCircle} label="Approved"          value={data.approvedSheets} color="green" sub={`${completionRate}% completion rate`} />
        <StatCard icon={Clock}       label="Pending Approval"  value={data.pendingSheets} color="purple" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Quick Actions</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Link href="/admin/cycles">
              <Button variant="outline" className="w-full justify-between gap-2">
                <span className="flex items-center gap-2"><Settings className="h-4 w-4 text-[var(--fg-muted)]" />Manage Cycles</span>
                <ArrowRight className="h-3.5 w-3.5 text-[var(--fg-muted)]" />
              </Button>
            </Link>
            <Link href="/admin/users">
              <Button variant="outline" className="w-full justify-between gap-2">
                <span className="flex items-center gap-2"><Users className="h-4 w-4 text-[var(--fg-muted)]" />Manage Users</span>
                <ArrowRight className="h-3.5 w-3.5 text-[var(--fg-muted)]" />
              </Button>
            </Link>
            <Link href="/admin/shared-goals">
              <Button variant="outline" className="w-full justify-between gap-2">
                <span className="flex items-center gap-2"><Target className="h-4 w-4 text-[var(--fg-muted)]" />Push Shared Goals</span>
                <ArrowRight className="h-3.5 w-3.5 text-[var(--fg-muted)]" />
              </Button>
            </Link>
            <Link href="/admin/reports">
              <Button variant="outline" className="w-full justify-between gap-2">
                <span className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-[var(--fg-muted)]" />View Reports</span>
                <ArrowRight className="h-3.5 w-3.5 text-[var(--fg-muted)]" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Cycle Overview</CardTitle></CardHeader>
          <CardContent>
            {data.cycle ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--fg-2)]">Status</span>
                  <Badge variant={CYCLE_STATUS_COLORS[data.cycle.status] || "secondary"}>
                    {CYCLE_STATUS_LABELS[data.cycle.status] || data.cycle.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--fg-2)]">Approval Rate</span>
                  <span className="font-bold tabular-nums">{completionRate}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-2)]">
                  <div className="h-full rounded-full bg-amber-500 transition-all duration-500" style={{ width: `${completionRate}%` }} />
                </div>
                <div className="flex items-center justify-between text-xs text-[var(--fg-muted)]">
                  <span>{data.approvedSheets} approved</span>
                  <span>{data.pendingSheets} pending</span>
                  <span>{data.totalSheets} total</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center py-4 text-center">
                <AlertCircle className="mb-2 h-8 w-8 text-amber-400" />
                <p className="text-sm text-[var(--fg-muted)]">No active cycle.</p>
                <Link href="/admin/cycles" className="mt-2">
                  <Button size="sm">
                    <Plus className="h-3.5 w-3.5" />Create Cycle
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ManagerDashboard({ data, me }: any) {
  const approved  = data.teamSheets?.filter((s: any) => s.status === "APPROVED").length || 0;
  const pending   = data.teamSheets?.filter((s: any) => s.status === "SUBMITTED").length || 0;
  const rework    = data.teamSheets?.filter((s: any) => s.status === "REWORK").length || 0;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-[var(--fg)]">Manager Dashboard</h1>
        <ManagerBadge manager={me?.manager ?? null} />
        {data.cycle && (
          <div className="mt-1 flex items-center gap-2">
            <p className="text-sm text-[var(--fg-2)]">{data.cycle.name}</p>
            <Badge variant={CYCLE_STATUS_COLORS[data.cycle.status] || "secondary"} className="text-xs">
              {CYCLE_STATUS_LABELS[data.cycle.status] || data.cycle.status}
            </Badge>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard icon={Users}       label="Team Members"      value={data.reports}  color="amber" />
        <StatCard icon={CheckCircle} label="Approved"          value={approved}       color="green" />
        <StatCard icon={AlertCircle} label="Awaiting Approval" value={pending}        color="blue" />
        <StatCard icon={TrendingUp}  label="Returned for Rework" value={rework}      color="red" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Team Goal Status</CardTitle>
              <Link href="/manager/team">
                <Button size="sm" variant="outline">
                  View All <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {data.teamSheets?.length === 0 ? (
              <p className="text-sm text-[var(--fg-muted)]">No team submissions yet.</p>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {data.teamSheets?.slice(0, 5).map((sheet: any) => (
                  <div key={sheet.id} className="flex items-center justify-between py-2.5">
                    <div>
                      <p className="text-sm font-medium text-[var(--fg)]">{sheet.employee.name}</p>
                      <p className="text-xs text-[var(--fg-muted)]">{sheet.goals?.length || 0} goals</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${SHEET_STATUS_COLORS[sheet.status]}`}>
                      {SHEET_STATUS_LABELS[sheet.status]}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Quick Actions</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Link href="/manager/team">
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2"><FileText className="h-4 w-4 text-[var(--fg-muted)]" />Review Goal Sheets</span>
                {pending > 0 && <Badge variant="warning" className="text-xs">{pending} pending</Badge>}
              </Button>
            </Link>
            <Link href="/manager/checkins">
              <Button variant="outline" className="w-full justify-between gap-2">
                <span className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-[var(--fg-muted)]" />Quarterly Check-ins</span>
                <ArrowRight className="h-3.5 w-3.5 text-[var(--fg-muted)]" />
              </Button>
            </Link>
            <Link href="/analytics">
              <Button variant="outline" className="w-full justify-between gap-2">
                <span className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-[var(--fg-muted)]" />Analytics</span>
                <ArrowRight className="h-3.5 w-3.5 text-[var(--fg-muted)]" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EmployeeDashboard({ data, me }: any) {
  const sheet = data.mySheet;
  const totalWeight    = sheet?.goals?.reduce((s: number, g: any) => s + g.weightage, 0) || 0;
  const completedGoals = sheet?.goals?.filter((g: any) =>
    g.achievements?.some((a: any) => a.status === "COMPLETED")
  ).length || 0;
  const cycleOpen = data.cycle?.status === "GOAL_SETTING";

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-[var(--fg)]">My Dashboard</h1>
        <ManagerBadge manager={me?.manager ?? null} />
        {data.cycle ? (
          <div className="mt-1 flex items-center gap-2">
            <p className="text-sm text-[var(--fg-2)]">{data.cycle.name}</p>
            <Badge variant={CYCLE_STATUS_COLORS[data.cycle.status] || "secondary"} className="text-xs">
              {CYCLE_STATUS_LABELS[data.cycle.status] || data.cycle.status}
            </Badge>
          </div>
        ) : (
          <p className="mt-1 text-sm text-[var(--fg-muted)]">No active cycle at this time.</p>
        )}
      </div>

      {sheet?.status === "REWORK" && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800/40 dark:bg-amber-900/15">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Goal sheet returned for revision</p>
            {sheet.managerNote && (
              <p className="mt-0.5 text-sm text-amber-700 dark:text-amber-400">{sheet.managerNote}</p>
            )}
            <Link href="/goals" className="mt-1 inline-block text-xs font-medium text-amber-700 underline dark:text-amber-400">
              Revise now →
            </Link>
          </div>
        </div>
      )}

      {!sheet ? (
        <Card className="border-dashed border-2 border-[var(--border)]">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-900/20">
              <Target className="h-7 w-7 text-amber-500" />
            </div>
            <h3 className="font-semibold text-[var(--fg)]">No Goal Sheet Yet</h3>
            <p className="mt-1 text-sm text-[var(--fg-muted)]">
              {cycleOpen
                ? "Start by creating your goals for this cycle."
                : "Goal setting is not open yet. Check back when the cycle is in Goal Setting phase."}
            </p>
            {cycleOpen && (
              <Link href="/goals" className="mt-4">
                <Button>
                  <Plus className="h-4 w-4" />
                  Create Goal Sheet
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard icon={Target}      label="Total Goals"    value={sheet.goals?.length || 0} color="amber" />
            <StatCard icon={CheckCircle} label="Completed"      value={completedGoals}            color="green" />
            <StatCard icon={TrendingUp}  label="Total Weightage" value={`${totalWeight}%`}        color={totalWeight === 100 ? "green" : "amber"} />
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Goal Sheet</CardTitle>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${SHEET_STATUS_COLORS[sheet.status]}`}>
                  {SHEET_STATUS_LABELS[sheet.status]}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              {sheet.goals?.length === 0 ? (
                <p className="text-sm text-[var(--fg-muted)]">No goals added yet.</p>
              ) : (
                <div className="space-y-2">
                  {sheet.goals?.slice(0, 5).map((goal: any) => {
                    const latestAch = goal.achievements?.[goal.achievements.length - 1];
                    return (
                      <div key={goal.id} className="flex items-center justify-between rounded-lg bg-[var(--bg)] px-3 py-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-[var(--fg)]">{goal.title}</p>
                          <p className="text-xs text-[var(--fg-muted)]">{goal.thrustArea.name} · {goal.weightage}%</p>
                        </div>
                        <span className={`ml-3 shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${latestAch ? STATUS_COLORS[latestAch.status] : STATUS_COLORS.NOT_STARTED}`}>
                          {latestAch ? STATUS_LABELS[latestAch.status] : "Not Started"}
                        </span>
                      </div>
                    );
                  })}
                  {sheet.goals?.length > 5 && (
                    <p className="text-xs text-[var(--fg-muted)] text-center pt-1">+{sheet.goals.length - 5} more goals</p>
                  )}
                </div>
              )}
              <div className="mt-4 flex gap-2 flex-wrap">
                <Link href="/goals">
                  <Button variant="outline" size="sm">
                    <FileText className="h-3.5 w-3.5" />
                    Manage Goals
                  </Button>
                </Link>
                {sheet.status === "APPROVED" && (
                  <Link href="/achievements">
                    <Button size="sm">
                      <TrendingUp className="h-3.5 w-3.5" />
                      Update Progress
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
