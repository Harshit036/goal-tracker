"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, AlertCircle, Lock, TrendingUp } from "lucide-react";
import { UOM_LABELS, STATUS_LABELS, STATUS_COLORS, QUARTER_LABELS, formatScore } from "@/lib/utils";

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];

export default function AchievementsPage() {
  const [sheet, setSheet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [forms, setForms] = useState<Record<string, any>>({});

  useEffect(() => {
    fetch("/api/goalsheets").then((r) => r.json()).then((s) => {
      setSheet(s);
      if (s?.goals) {
        const init: Record<string, any> = {};
        s.goals.forEach((g: any) => {
          QUARTERS.forEach((q) => {
            const existing = g.achievements?.find((a: any) => a.quarter === q);
            init[`${g.id}_${q}`] = {
              actualValue: existing?.actualValue ?? "",
              actualDate: existing?.actualDate ? new Date(existing.actualDate).toISOString().split("T")[0] : "",
              status: existing?.status ?? "NOT_STARTED",
              notes: existing?.notes ?? "",
            };
          });
        });
        setForms(init);
      }
      setLoading(false);
    });
  }, []);

  async function save(goalId: string, quarter: string) {
    setSaving(`${goalId}_${quarter}`);
    setError("");
    const form = forms[`${goalId}_${quarter}`];
    const goal = sheet.goals.find((g: any) => g.id === goalId);

    const payload: any = { goalId, quarter, status: form.status, notes: form.notes };
    if (goal.uomType === "TIMELINE") {
      payload.actualDate = form.actualDate;
    } else {
      payload.actualValue = form.actualValue !== "" ? parseFloat(form.actualValue) : null;
    }

    const res = await fetch("/api/achievements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setSaving(null);
    if (!res.ok) { setError(data.error); return; }

    // Update local sheet
    setSheet((s: any) => ({
      ...s,
      goals: s.goals.map((g: any) =>
        g.id === goalId
          ? {
              ...g,
              achievements: g.achievements.some((a: any) => a.quarter === quarter)
                ? g.achievements.map((a: any) => a.quarter === quarter ? data : a)
                : [...g.achievements, data],
            }
          : g
      ),
    }));
    setSuccess(`Progress saved for Q${quarter.slice(1)}`);
    setTimeout(() => setSuccess(""), 3000);
  }

  if (loading) return <div className="flex h-full items-center justify-center text-[var(--fg-muted)]">Loading...</div>;

  if (!sheet) return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <h2 className="text-lg font-semibold text-[var(--fg)]">No Goal Sheet</h2>
      <p className="text-sm text-[var(--fg-muted)]">Create and get your goals approved first.</p>
    </div>
  );

  if (sheet.status !== "APPROVED") return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <AlertCircle className="mb-3 h-10 w-10 text-amber-400" />
      <h2 className="text-lg font-semibold text-[var(--fg)]">Goals Not Yet Approved</h2>
      <p className="text-sm text-[var(--fg-muted)] max-w-sm">Your goal sheet needs to be approved by your manager before you can log achievements.</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--fg)]">Quarterly Achievements</h1>
        <p className="text-sm text-[var(--fg-muted)]">Log your actual progress against planned targets each quarter</p>
      </div>

      {error && <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400"><AlertCircle className="h-4 w-4" />{error}</div>}
      {success && <div className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400"><CheckCircle className="h-4 w-4" />{success}</div>}

      <Tabs defaultValue="Q1">
        <TabsList>
          {QUARTERS.map((q) => <TabsTrigger key={q} value={q}>{q}</TabsTrigger>)}
        </TabsList>
        {QUARTERS.map((quarter) => (
          <TabsContent key={quarter} value={quarter} className="space-y-4 mt-4">
            <p className="text-sm text-[var(--fg-muted)]">{QUARTER_LABELS[quarter]}</p>
            {sheet.goals.map((goal: any) => {
              const key = `${goal.id}_${quarter}`;
              const form = forms[key] || {};
              const existing = goal.achievements?.find((a: any) => a.quarter === quarter);
              const isSaving = saving === key;

              return (
                <Card key={goal.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-sm font-semibold">{goal.title}</CardTitle>
                        <p className="text-xs text-[var(--fg-muted)]">{goal.thrustArea.name} · {goal.weightage}% · {UOM_LABELS[goal.uomType]}</p>
                        <p className="text-xs text-[var(--fg-muted)] mt-0.5">Target: {goal.target}{goal.targetDate && ` by ${new Date(goal.targetDate).toLocaleDateString()}`}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {existing?.computedScore != null && (
                          <div className="flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                            <TrendingUp className="h-3 w-3" />
                            {formatScore(existing.computedScore)}
                          </div>
                        )}
                        {form.status && (
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[form.status]}`}>
                            {STATUS_LABELS[form.status]}
                          </span>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">{goal.uomType === "TIMELINE" ? "Completion Date" : "Actual Value"}</Label>
                        {goal.uomType === "TIMELINE" ? (
                          <Input type="date" value={form.actualDate || ""} onChange={(e) => setForms((f) => ({ ...f, [key]: { ...f[key], actualDate: e.target.value } }))} />
                        ) : (
                          <Input type="number" step="any" placeholder={`Target: ${goal.target}`} value={form.actualValue ?? ""} onChange={(e) => setForms((f) => ({ ...f, [key]: { ...f[key], actualValue: e.target.value } }))} />
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Status</Label>
                        <Select value={form.status || "NOT_STARTED"} onValueChange={(v) => setForms((f) => ({ ...f, [key]: { ...f[key], status: v } }))}>
                          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NOT_STARTED">Not Started</SelectItem>
                            <SelectItem value="ON_TRACK">On Track</SelectItem>
                            <SelectItem value="COMPLETED">Completed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Notes <span className="text-[var(--fg-muted)]">(optional)</span></Label>
                      <Textarea rows={2} value={form.notes || ""} onChange={(e) => setForms((f) => ({ ...f, [key]: { ...f[key], notes: e.target.value } }))} placeholder="Any context about this quarter's progress..." />
                    </div>
                    <Button size="sm" onClick={() => save(goal.id, quarter)} disabled={isSaving}>
                      {isSaving ? "Saving..." : "Save Progress"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
