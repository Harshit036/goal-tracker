"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, XCircle, Edit2, TrendingUp, AlertCircle } from "lucide-react";
import { SHEET_STATUS_LABELS, SHEET_STATUS_COLORS, UOM_LABELS, STATUS_COLORS, STATUS_LABELS, QUARTER_LABELS, formatScore } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";

export default function TeamGoalsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [inlineEdits, setInlineEdits] = useState<Record<string, any>>({});
  const [reworkNote, setReworkNote] = useState("");
  const [showRework, setShowRework] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetch("/api/manager/team").then((r) => r.json()).then((d) => {
      setData(d);
      setLoading(false);
    });
  }, []);

  async function approveSheet(sheetId: string) {
    setError("");
    // Apply any inline edits first
    for (const [goalId, edits] of Object.entries(inlineEdits)) {
      if (Object.keys(edits).length > 0) {
        await fetch(`/api/goals/${goalId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(edits),
        });
      }
    }
    const res = await fetch(`/api/goalsheets/${sheetId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "APPROVED" }),
    });
    if (!res.ok) { const d = await res.json(); setError(d.error); return; }
    setData((d: any) => ({ ...d, sheets: d.sheets.map((s: any) => s.id === sheetId ? { ...s, status: "APPROVED" } : s) }));
    setSelected(null);
    setInlineEdits({});
    setSuccess("Goal sheet approved successfully.");
    setTimeout(() => setSuccess(""), 3000);
  }

  async function returnSheet(sheetId: string) {
    const res = await fetch(`/api/goalsheets/${sheetId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "REWORK", managerNote: reworkNote }),
    });
    if (!res.ok) { const d = await res.json(); setError(d.error); return; }
    setData((d: any) => ({ ...d, sheets: d.sheets.map((s: any) => s.id === sheetId ? { ...s, status: "REWORK" } : s) }));
    setShowRework(false);
    setSelected(null);
    setSuccess("Sheet returned to employee for rework.");
    setTimeout(() => setSuccess(""), 3000);
  }

  if (loading) return <div className="flex h-full items-center justify-center text-[var(--fg-muted)]">Loading...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--fg)]">Team Goal Sheets</h1>
        <p className="text-sm text-[var(--fg-muted)]">{data?.totalReports} team members · {data?.cycle?.name}</p>
      </div>

      {error && <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400"><AlertCircle className="h-4 w-4" />{error}</div>}
      {success && <div className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400"><CheckCircle className="h-4 w-4" />{success}</div>}

      <div className="space-y-3">
        {data?.sheets?.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-[var(--fg-muted)]">No goal sheets submitted yet.</CardContent></Card>
        ) : (
          data?.sheets?.map((sheet: any) => (
            <Card key={sheet.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelected(sheet)}>
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="font-semibold text-[var(--fg)]">{sheet.employee.name}</p>
                  <p className="text-xs text-[var(--fg-muted)]">{sheet.employee.department} · {sheet.goals?.length} goals</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${SHEET_STATUS_COLORS[sheet.status]}`}>
                    {SHEET_STATUS_LABELS[sheet.status]}
                  </span>
                  <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setSelected(sheet); }}>
                    Review
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Review Dialog */}
      {selected && (
        <Dialog open={!!selected} onOpenChange={() => { setSelected(null); setInlineEdits({}); }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Review: {selected.employee.name}</DialogTitle>
              <span className={`w-fit rounded-full px-2.5 py-0.5 text-xs font-semibold ${SHEET_STATUS_COLORS[selected.status]}`}>
                {SHEET_STATUS_LABELS[selected.status]}
              </span>
            </DialogHeader>

            <div className="space-y-4">
              {selected.goals?.map((goal: any) => {
                const edits = inlineEdits[goal.id] || {};
                return (
                  <Card key={goal.id} className="border-[var(--border)]">
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-sm">{goal.title}</p>
                          <p className="text-xs text-[var(--fg-muted)]">{goal.thrustArea.name} · {UOM_LABELS[goal.uomType]}</p>
                        </div>
                      </div>
                      {selected.status === "SUBMITTED" && (
                        <div className="grid grid-cols-2 gap-3 border-t pt-3">
                          <div className="space-y-1">
                            <label className="text-xs text-[var(--fg-muted)]">Target (editable)</label>
                            <Input
                              type="number"
                              step="any"
                              defaultValue={goal.target}
                              onChange={(e) => setInlineEdits((ie) => ({ ...ie, [goal.id]: { ...ie[goal.id], target: e.target.value } }))}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-[var(--fg-muted)]">Weightage % (editable)</label>
                            <Input
                              type="number"
                              min={10}
                              defaultValue={goal.weightage}
                              onChange={(e) => setInlineEdits((ie) => ({ ...ie, [goal.id]: { ...ie[goal.id], weightage: e.target.value } }))}
                            />
                          </div>
                        </div>
                      )}
                      {selected.status === "APPROVED" && (
                        <div className="mt-2 space-y-2">
                          {["Q1","Q2","Q3","Q4"].map((q) => {
                            const a = goal.achievements?.find((a: any) => a.quarter === q);
                            return a ? (
                              <div key={q} className="flex items-center justify-between text-xs bg-[var(--bg)] rounded px-2 py-1">
                                <span className="font-medium">{q}</span>
                                <span>{a.actualValue ?? a.actualDate ?? "—"} / {goal.target}</span>
                                <span className={`rounded-full px-1.5 py-0.5 ${STATUS_COLORS[a.status]}`}>{STATUS_LABELS[a.status]}</span>
                                <span className="font-semibold text-blue-600">{formatScore(a.computedScore)}</span>
                              </div>
                            ) : null;
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {selected.status === "SUBMITTED" && (
              <DialogFooter className="gap-2">
                <Button variant="destructive" onClick={() => setShowRework(true)}>
                  <XCircle className="h-4 w-4" />
                  Return for Rework
                </Button>
                <Button variant="success" onClick={() => approveSheet(selected.id)}>
                  <CheckCircle className="h-4 w-4" />
                  Approve
                </Button>
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* Rework note dialog */}
      <Dialog open={showRework} onOpenChange={setShowRework}>
        <DialogContent>
          <DialogHeader><DialogTitle>Return for Rework</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Note to employee</Label>
            <Textarea rows={3} value={reworkNote} onChange={(e) => setReworkNote(e.target.value)} placeholder="Explain what needs to be revised..." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRework(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => returnSheet(selected?.id)}>Return Sheet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Label({ children, className }: any) {
  return <label className={`text-sm font-medium ${className}`}>{children}</label>;
}
