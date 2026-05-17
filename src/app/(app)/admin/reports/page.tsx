"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, FileText, CheckCircle, Clock } from "lucide-react";
import { SHEET_STATUS_LABELS, SHEET_STATUS_COLORS, STATUS_LABELS, STATUS_COLORS, formatScore } from "@/lib/utils";

export default function ReportsPage() {
  const [cycles, setCycles] = useState<any[]>([]);
  const [cycleId, setCycleId] = useState("");
  const [achievementData, setAchievementData] = useState<any[]>([]);
  const [completionData, setCompletionData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/cycles").then((r) => r.json()).then((c) => {
      setCycles(c);
      const active = c.find((x: any) => x.isActive);
      if (active) setCycleId(active.id);
    });
  }, []);

  useEffect(() => {
    if (!cycleId) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/reports?cycleId=${cycleId}&type=achievement`).then((r) => r.json()),
      fetch(`/api/reports?cycleId=${cycleId}&type=completion`).then((r) => r.json()),
    ]).then(([a, c]) => {
      setAchievementData(a);
      setCompletionData(c);
      setLoading(false);
    });
  }, [cycleId]);

  function downloadCSV() {
    const rows: string[][] = [["Employee", "Email", "Department", "Goal", "Thrust Area", "UoM", "Target", "Q1 Actual", "Q1 Score", "Q2 Actual", "Q2 Score", "Q3 Actual", "Q3 Score", "Q4 Actual", "Q4 Score"]];
    achievementData.forEach((sheet) => {
      sheet.goals?.forEach((goal: any) => {
        const quarters = ["Q1","Q2","Q3","Q4"];
        const qData = quarters.flatMap((q) => {
          const a = goal.achievements?.find((a: any) => a.quarter === q);
          return [a?.actualValue ?? "", a?.computedScore != null ? a.computedScore.toFixed(1) + "%" : ""];
        });
        rows.push([
          sheet.employee.name, sheet.employee.email, sheet.employee.department || "",
          goal.title, goal.thrustArea.name, goal.uomType, String(goal.target),
          ...qData,
        ]);
      });
    });

    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `achievement-report-${cycleId}.csv`;
    a.click();
  }

  const approvedCount = completionData.filter((s: any) => s.status === "APPROVED").length;
  const submittedCount = completionData.filter((s: any) => s.status === "SUBMITTED").length;
  const draftCount = completionData.filter((s: any) => s.status === "DRAFT").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--fg)]">Reports</h1>
          <p className="text-sm text-[var(--fg-muted)]">Achievement reports and completion dashboard</p>
        </div>
        <Button onClick={downloadCSV} disabled={achievementData.length === 0}>
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-[var(--fg-2)]">Cycle:</span>
        <Select value={cycleId} onValueChange={setCycleId}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Select cycle..." /></SelectTrigger>
          <SelectContent>{cycles.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="text-center text-[var(--fg-muted)] py-8">Loading reports...</div>
      ) : (
        <Tabs defaultValue="completion">
          <TabsList>
            <TabsTrigger value="completion">Completion Dashboard</TabsTrigger>
            <TabsTrigger value="achievement">Achievement Report</TabsTrigger>
          </TabsList>

          <TabsContent value="completion" className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <Card><CardContent className="pt-4 text-center"><p className="text-3xl font-bold text-green-600">{approvedCount}</p><p className="text-sm text-[var(--fg-muted)]">Approved</p></CardContent></Card>
              <Card><CardContent className="pt-4 text-center"><p className="text-3xl font-bold text-blue-600">{submittedCount}</p><p className="text-sm text-[var(--fg-muted)]">Pending Approval</p></CardContent></Card>
              <Card><CardContent className="pt-4 text-center"><p className="text-3xl font-bold text-[var(--fg-2)]">{draftCount}</p><p className="text-sm text-[var(--fg-muted)]">Draft / Not Submitted</p></CardContent></Card>
            </div>

            <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
              <table className="w-full text-sm">
                <thead className="bg-[var(--bg)] text-xs text-[var(--fg-muted)]">
                  <tr>
                    <th className="px-4 py-3 text-left">Employee</th>
                    <th className="px-4 py-3 text-left">Department</th>
                    <th className="px-4 py-3 text-left">Goals</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Q1</th>
                    <th className="px-4 py-3 text-left">Q2</th>
                    <th className="px-4 py-3 text-left">Q3</th>
                    <th className="px-4 py-3 text-left">Q4</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {completionData.map((sheet: any) => (
                    <tr key={sheet.id} className="hover:bg-[var(--bg)]">
                      <td className="px-4 py-3 font-medium">{sheet.employee.name}</td>
                      <td className="px-4 py-3 text-[var(--fg-muted)]">{sheet.employee.department || "—"}</td>
                      <td className="px-4 py-3">{sheet.goals?.length}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${SHEET_STATUS_COLORS[sheet.status]}`}>
                          {SHEET_STATUS_LABELS[sheet.status]}
                        </span>
                      </td>
                      {["Q1","Q2","Q3","Q4"].map((q) => {
                        const ci = sheet.checkIns?.find((c: any) => c.quarter === q);
                        return <td key={q} className="px-4 py-3">{ci ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Clock className="h-4 w-4 text-[var(--fg-muted)]" />}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="achievement" className="mt-4 space-y-4">
            {achievementData.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-[var(--fg-muted)]">No approved goal sheets in this cycle.</CardContent></Card>
            ) : (
              achievementData.map((sheet: any) => (
                <Card key={sheet.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{sheet.employee.name} <span className="text-[var(--fg-muted)] font-normal">— {sheet.employee.department}</span></CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-[var(--bg)]">
                          <tr>
                            <th className="px-2 py-1.5 text-left text-[var(--fg-muted)]">Goal</th>
                            <th className="px-2 py-1.5 text-[var(--fg-muted)]">Wt%</th>
                            <th className="px-2 py-1.5 text-[var(--fg-muted)]">Target</th>
                            {["Q1","Q2","Q3","Q4"].flatMap((q) => [
                              <th key={`${q}a`} className="px-2 py-1.5 text-[var(--fg-muted)]">{q} Actual</th>,
                              <th key={`${q}s`} className="px-2 py-1.5 text-[var(--fg-muted)]">{q} Score</th>,
                            ])}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {sheet.goals?.map((goal: any) => (
                            <tr key={goal.id}>
                              <td className="max-w-[150px] truncate px-2 py-1.5 font-medium">{goal.title}</td>
                              <td className="px-2 py-1.5 text-center">{goal.weightage}%</td>
                              <td className="px-2 py-1.5 text-center">{goal.target}</td>
                              {["Q1","Q2","Q3","Q4"].flatMap((q) => {
                                const a = goal.achievements?.find((a: any) => a.quarter === q);
                                return [
                                  <td key={`${q}a`} className="px-2 py-1.5 text-center">{a?.actualValue ?? "—"}</td>,
                                  <td key={`${q}s`} className="px-2 py-1.5 text-center font-semibold text-blue-600">{a ? formatScore(a.computedScore) : "—"}</td>,
                                ];
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
