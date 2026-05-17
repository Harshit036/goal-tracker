"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, AlertCircle, MessageSquare } from "lucide-react";
import { SHEET_STATUS_COLORS, SHEET_STATUS_LABELS, STATUS_COLORS, STATUS_LABELS, formatScore, QUARTER_LABELS } from "@/lib/utils";

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];

export default function CheckinsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/manager/team").then((r) => r.json()).then((d) => {
      setData(d);
      // Pre-fill existing check-in comments
      if (d?.sheets) {
        const init: Record<string, string> = {};
        d.sheets.forEach((s: any) => {
          QUARTERS.forEach((q) => {
            const ci = s.checkIns?.find((c: any) => c.quarter === q);
            if (ci) init[`${s.id}_${q}`] = ci.comment;
          });
        });
        setComments(init);
      }
      setLoading(false);
    });
  }, []);

  async function saveCheckIn(sheetId: string, quarter: string) {
    const key = `${sheetId}_${quarter}`;
    const comment = comments[key];
    if (!comment?.trim()) { setError("Comment cannot be empty."); return; }
    setSaving(key);
    setError("");
    const res = await fetch("/api/checkins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goalSheetId: sheetId, quarter, comment }),
    });
    setSaving(null);
    if (!res.ok) { const d = await res.json(); setError(d.error); return; }
    setSuccess(`Check-in saved for ${quarter}.`);
    setTimeout(() => setSuccess(""), 3000);
  }

  if (loading) return <div className="flex h-full items-center justify-center text-[var(--fg-muted)]">Loading...</div>;

  const approvedSheets = data?.sheets?.filter((s: any) => s.status === "APPROVED") || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--fg)]">Quarterly Check-ins</h1>
        <p className="text-sm text-[var(--fg-muted)]">Review team progress and add structured feedback</p>
      </div>

      {error && <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400"><AlertCircle className="h-4 w-4" />{error}</div>}
      {success && <div className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400"><CheckCircle className="h-4 w-4" />{success}</div>}

      {approvedSheets.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-[var(--fg-muted)]">No approved goal sheets yet. Approve team goals first.</CardContent></Card>
      ) : (
        <Tabs defaultValue="Q1">
          <TabsList>{QUARTERS.map((q) => <TabsTrigger key={q} value={q}>{q}</TabsTrigger>)}</TabsList>
          {QUARTERS.map((quarter) => (
            <TabsContent key={quarter} value={quarter} className="space-y-4 mt-4">
              <p className="text-sm text-[var(--fg-muted)]">{QUARTER_LABELS[quarter]}</p>
              {approvedSheets.map((sheet: any) => {
                const key = `${sheet.id}_${quarter}`;
                const existingCI = sheet.checkIns?.find((c: any) => c.quarter === quarter);
                return (
                  <Card key={sheet.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">{sheet.employee.name}</CardTitle>
                        {existingCI && <span className="flex items-center gap-1 text-xs text-green-600"><CheckCircle className="h-3 w-3" />Check-in done</span>}
                      </div>
                      <p className="text-xs text-[var(--fg-muted)]">{sheet.employee.department}</p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Progress table */}
                      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
                        <table className="w-full text-xs">
                          <thead className="bg-[var(--bg)]">
                            <tr>
                              <th className="px-3 py-2 text-left font-medium text-[var(--fg-muted)]">Goal</th>
                              <th className="px-3 py-2 text-right font-medium text-[var(--fg-muted)]">Target</th>
                              <th className="px-3 py-2 text-right font-medium text-[var(--fg-muted)]">Actual</th>
                              <th className="px-3 py-2 text-center font-medium text-[var(--fg-muted)]">Status</th>
                              <th className="px-3 py-2 text-right font-medium text-[var(--fg-muted)]">Score</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {sheet.goals?.map((goal: any) => {
                              const ach = goal.achievements?.find((a: any) => a.quarter === quarter);
                              return (
                                <tr key={goal.id} className="hover:bg-[var(--bg)]">
                                  <td className="max-w-[200px] truncate px-3 py-2 font-medium text-[var(--fg)]">{goal.title}</td>
                                  <td className="px-3 py-2 text-right text-[var(--fg-2)]">{goal.target}</td>
                                  <td className="px-3 py-2 text-right text-[var(--fg-2)]">{ach?.actualValue ?? ach?.actualDate ? new Date(ach.actualDate).toLocaleDateString() : "—"}</td>
                                  <td className="px-3 py-2 text-center">
                                    <span className={`rounded-full px-1.5 py-0.5 text-xs ${ach ? STATUS_COLORS[ach.status] : STATUS_COLORS.NOT_STARTED}`}>
                                      {ach ? STATUS_LABELS[ach.status] : "Not Started"}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 text-right font-semibold text-blue-600">{ach ? formatScore(ach.computedScore) : "—"}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Check-in comment */}
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-[var(--fg-2)] flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          Check-in Comment
                        </label>
                        <Textarea
                          rows={3}
                          placeholder="Summarize the check-in discussion, key observations, and next steps..."
                          value={comments[key] || ""}
                          onChange={(e) => setComments((c) => ({ ...c, [key]: e.target.value }))}
                        />
                        <Button size="sm" onClick={() => saveCheckIn(sheet.id, quarter)} disabled={saving === key}>
                          {saving === key ? "Saving..." : existingCI ? "Update Check-in" : "Save Check-in"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
