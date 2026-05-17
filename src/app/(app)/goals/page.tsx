"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Lock, Edit2, Send, AlertCircle, CheckCircle, Info, Sliders } from "lucide-react";
import { SHEET_STATUS_LABELS, SHEET_STATUS_COLORS, UOM_LABELS } from "@/lib/utils";

export default function GoalsPage() {
  const [sheet, setSheet] = useState<any>(null);
  const [thrustAreas, setThrustAreas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editGoal, setEditGoal] = useState<any>(null);
  const [editWeightGoal, setEditWeightGoal] = useState<any>(null);
  const [newWeight, setNewWeight] = useState("");

  const [form, setForm] = useState({
    thrustAreaId: "", title: "", description: "", uomType: "", target: "", targetDate: "", weightage: "",
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/goalsheets").then((r) => r.json()),
      fetch("/api/thrust-areas").then((r) => r.json()),
    ]).then(([s, t]) => {
      setSheet(s);
      setThrustAreas(t);
      setLoading(false);
    });
  }, []);

  async function createSheet() {
    const res = await fetch("/api/goalsheets", { method: "POST" });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Failed to create sheet"); return; }
    setSheet(data);
  }

  async function addGoal(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!sheet) return;

    const totalWeight = sheet.goals.reduce((s: number, g: any) => s + g.weightage, 0);
    const newWeightNum = parseInt(form.weightage);
    if (totalWeight + newWeightNum > 100) {
      setError(`Adding ${newWeightNum}% would exceed 100% total weightage (current: ${totalWeight}%).`);
      return;
    }

    const res = await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, goalSheetId: sheet.id }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); return; }

    setSheet((s: any) => ({ ...s, goals: [...s.goals, { ...data, achievements: [] }] }));
    setForm({ thrustAreaId: "", title: "", description: "", uomType: "", target: "", targetDate: "", weightage: "" });
    setShowAddGoal(false);
    setSuccess("Goal added successfully.");
    setTimeout(() => setSuccess(""), 3000);
  }

  async function deleteGoal(goalId: string) {
    setError("");
    const res = await fetch(`/api/goals/${goalId}`, { method: "DELETE" });
    if (!res.ok) { const d = await res.json(); setError(d.error); return; }
    setSheet((s: any) => ({ ...s, goals: s.goals.filter((g: any) => g.id !== goalId) }));
  }

  async function updateGoal(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch(`/api/goals/${editGoal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: editGoal.title,
        description: editGoal.description,
        target: editGoal.target,
        targetDate: editGoal.targetDate,
        weightage: editGoal.weightage,
      }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); return; }
    setSheet((s: any) => ({ ...s, goals: s.goals.map((g: any) => g.id === editGoal.id ? { ...g, ...data } : g) }));
    setEditGoal(null);
    setSuccess("Goal updated.");
    setTimeout(() => setSuccess(""), 3000);
  }

  async function updateWeightage(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const w = parseInt(newWeight);
    if (isNaN(w) || w < 10) { setError("Minimum weightage is 10%."); return; }

    const otherTotal = sheet.goals
      .filter((g: any) => g.id !== editWeightGoal.id)
      .reduce((s: number, g: any) => s + g.weightage, 0);
    if (otherTotal + w > 100) {
      setError(`This would exceed 100% total (others use ${otherTotal}%).`);
      return;
    }

    const res = await fetch(`/api/goals/${editWeightGoal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weightage: w }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); return; }
    setSheet((s: any) => ({ ...s, goals: s.goals.map((g: any) => g.id === editWeightGoal.id ? { ...g, weightage: w } : g) }));
    setEditWeightGoal(null);
    setNewWeight("");
    setSuccess("Weightage updated.");
    setTimeout(() => setSuccess(""), 3000);
  }

  async function submitSheet() {
    setSubmitting(true);
    setError("");
    const res = await fetch(`/api/goalsheets/${sheet.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "SUBMITTED" }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(data.error); return; }
    setSheet((s: any) => ({ ...s, status: "SUBMITTED", managerNote: null }));
    setSuccess("Goal sheet submitted for manager approval!");
  }

  if (loading) return <div className="flex h-full items-center justify-center text-[var(--fg-muted)]">Loading...</div>;

  const totalWeight = sheet?.goals?.reduce((s: number, g: any) => s + g.weightage, 0) || 0;
  const isEditable = !sheet || sheet.status === "DRAFT" || sheet.status === "REWORK";
  const canSubmit = sheet && isEditable && sheet.goals?.length > 0 && totalWeight === 100;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--fg)]">My Goal Sheet</h1>
          <p className="text-sm text-[var(--fg-muted)]">Define and manage your goals for this cycle</p>
        </div>
        {sheet && (
          <span className={`rounded-full px-3 py-1 text-sm font-semibold ${SHEET_STATUS_COLORS[sheet.status]}`}>
            {SHEET_STATUS_LABELS[sheet.status]}
          </span>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
          <CheckCircle className="h-4 w-4 shrink-0" />
          {success}
        </div>
      )}

      {/* Manager rework note — shown prominently when sheet is returned */}
      {sheet?.status === "REWORK" && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 dark:border-amber-800/40 dark:bg-amber-900/15">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Returned for Revision</p>
            {sheet.managerNote ? (
              <p className="text-sm text-amber-700 dark:text-amber-400">
                <span className="font-medium">Manager&apos;s note:</span> {sheet.managerNote}
              </p>
            ) : (
              <p className="text-sm text-amber-700 dark:text-amber-400">
                Your manager has sent back your goal sheet. Please revise and resubmit.
              </p>
            )}
          </div>
        </div>
      )}

      {sheet?.status === "APPROVED" && (
        <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-800/40 dark:bg-green-900/15 dark:text-green-400">
          <CheckCircle className="h-4 w-4 shrink-0" />
          Goals are approved and locked. Head to <strong className="ml-1">Quarterly Updates</strong> to log progress.
        </div>
      )}

      {!sheet ? (
        <Card className="border-dashed border-2 border-[var(--border)]">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <h3 className="font-semibold text-[var(--fg)]">No Goal Sheet Yet</h3>
            <p className="mt-1 text-sm text-[var(--fg-muted)]">Create your goal sheet to get started for this cycle.</p>
            <Button className="mt-4" onClick={createSheet}>Create Goal Sheet</Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Weight tracker */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--fg-2)]">Total Weightage</span>
                <span className={`font-bold tabular-nums ${totalWeight === 100 ? "text-green-600" : totalWeight > 100 ? "text-red-600" : "text-amber-600"}`}>
                  {totalWeight}% / 100%
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--surface-2)]">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${totalWeight === 100 ? "bg-green-500" : totalWeight > 100 ? "bg-red-500" : "bg-amber-500"}`}
                  style={{ width: `${Math.min(totalWeight, 100)}%` }}
                />
              </div>
              <div className="mt-1 flex gap-4 text-xs text-[var(--fg-muted)]">
                <span>Min per goal: 10%</span>
                <span>Max goals: 8</span>
                <span>Goals: {sheet.goals?.length}/8</span>
                <span className="ml-auto text-amber-600 dark:text-amber-400">
                  {100 - totalWeight > 0 ? `${100 - totalWeight}% remaining` : totalWeight === 100 ? "✓ Ready to submit" : "Over budget"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Goals list */}
          <div className="space-y-3">
            {sheet.goals?.length === 0 && (
              <div className="rounded-xl border border-dashed border-[var(--border)] py-10 text-center text-sm text-[var(--fg-muted)]">
                No goals added yet. Click &ldquo;Add Goal&rdquo; to begin.
              </div>
            )}
            {sheet.goals?.map((goal: any, i: number) => (
              <Card key={goal.id} className={goal.isLocked ? "opacity-90" : ""}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium text-[var(--fg-muted)]">#{i + 1}</span>
                        <h3 className="font-semibold text-[var(--fg)]">{goal.title}</h3>
                        {goal.isShared && (
                          <Badge variant="warning" className="text-xs">Admin Assigned</Badge>
                        )}
                        {goal.isLocked && (
                          <span className="flex items-center gap-1 text-xs text-[var(--fg-muted)]">
                            <Lock className="h-3 w-3" /> Locked
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-[var(--fg-muted)]">{goal.thrustArea.name}</p>
                      {goal.description && <p className="mt-1 text-sm text-[var(--fg-2)]">{goal.description}</p>}
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-[var(--fg-muted)]">
                        <span>UoM: <strong className="text-[var(--fg-2)]">{UOM_LABELS[goal.uomType]}</strong></span>
                        {goal.uomType !== "TIMELINE" && <span>Target: <strong className="text-[var(--fg-2)]">{goal.target}</strong></span>}
                        {goal.targetDate && <span>By: <strong className="text-[var(--fg-2)]">{new Date(goal.targetDate).toLocaleDateString()}</strong></span>}
                        <span>Weightage: <strong className="text-[var(--fg-2)]">{goal.weightage}%</strong></span>
                      </div>
                    </div>
                    {isEditable && !goal.isLocked && (
                      <div className="flex gap-1 shrink-0">
                        {goal.isShared ? (
                          // Shared goals: weightage-only edit
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Adjust weightage"
                            onClick={() => { setEditWeightGoal(goal); setNewWeight(String(goal.weightage)); }}
                          >
                            <Sliders className="h-4 w-4" />
                          </Button>
                        ) : (
                          // Regular goals: full edit
                          <Button size="icon" variant="ghost" onClick={() => setEditGoal({ ...goal })}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                          onClick={() => deleteGoal(goal.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Add goal / submit */}
          <div className="flex flex-wrap gap-3 items-center">
            {isEditable && sheet.goals?.length < 8 && (
              <Button variant="outline" onClick={() => setShowAddGoal(true)}>
                <Plus className="h-4 w-4" />
                Add Goal
              </Button>
            )}
            {canSubmit && sheet.status !== "SUBMITTED" && sheet.status !== "APPROVED" && (
              <Button onClick={submitSheet} disabled={submitting}>
                <Send className="h-4 w-4" />
                {submitting ? "Submitting..." : "Submit for Approval"}
              </Button>
            )}
            {!canSubmit && sheet && isEditable && (
              <p className="text-sm text-[var(--fg-muted)]">
                {totalWeight !== 100
                  ? `Weightage must total 100% (currently ${totalWeight}%)`
                  : "Add at least one goal to submit"}
              </p>
            )}
          </div>
        </>
      )}

      {/* Add Goal Dialog */}
      <Dialog open={showAddGoal} onOpenChange={setShowAddGoal}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add New Goal</DialogTitle></DialogHeader>
          <form onSubmit={addGoal} className="space-y-4">
            <div className="space-y-2">
              <Label>Thrust Area <span className="text-red-500">*</span></Label>
              <Select value={form.thrustAreaId} onValueChange={(v) => setForm((f) => ({ ...f, thrustAreaId: v }))} required>
                <SelectTrigger><SelectValue placeholder="Select area..." /></SelectTrigger>
                <SelectContent>{thrustAreas.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Goal Title <span className="text-red-500">*</span></Label>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required placeholder="e.g., Increase Q3 Sales Revenue" />
            </div>
            <div className="space-y-2">
              <Label>Description <span className="text-xs text-[var(--fg-muted)]">(optional)</span></Label>
              <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Unit of Measurement <span className="text-red-500">*</span></Label>
                <Select value={form.uomType} onValueChange={(v) => setForm((f) => ({ ...f, uomType: v, target: "", targetDate: "" }))}>
                  <SelectTrigger><SelectValue placeholder="Select UoM..." /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(UOM_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{form.uomType === "TIMELINE" ? "Target Date" : "Target Value"} <span className="text-red-500">*</span></Label>
                {form.uomType === "TIMELINE" ? (
                  <Input type="date" value={form.targetDate} onChange={(e) => setForm((f) => ({ ...f, targetDate: e.target.value }))} required />
                ) : (
                  <Input type="number" step="any" value={form.target} onChange={(e) => setForm((f) => ({ ...f, target: e.target.value }))} placeholder="e.g., 100" />
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Weightage (%) <span className="text-red-500">*</span></Label>
              <Input
                type="number"
                min={10}
                max={100 - (sheet?.goals?.reduce((s: number, g: any) => s + g.weightage, 0) || 0)}
                value={form.weightage}
                onChange={(e) => setForm((f) => ({ ...f, weightage: e.target.value }))}
                required
                placeholder="Min 10%"
              />
              <p className="text-xs text-[var(--fg-muted)]">
                Remaining: {100 - (sheet?.goals?.reduce((s: number, g: any) => s + g.weightage, 0) || 0)}% · Min: 10%
              </p>
            </div>
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setShowAddGoal(false); setError(""); }}>Cancel</Button>
              <Button type="submit">Add Goal</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Goal Dialog (regular goals) */}
      {editGoal && (
        <Dialog open={!!editGoal} onOpenChange={() => { setEditGoal(null); setError(""); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Edit Goal</DialogTitle></DialogHeader>
            <form onSubmit={updateGoal} className="space-y-4">
              <div className="space-y-2">
                <Label>Goal Title</Label>
                <Input value={editGoal.title} onChange={(e) => setEditGoal((g: any) => ({ ...g, title: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={editGoal.description || ""} onChange={(e) => setEditGoal((g: any) => ({ ...g, description: e.target.value }))} rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{editGoal.uomType === "TIMELINE" ? "Target Date" : "Target Value"}</Label>
                  {editGoal.uomType === "TIMELINE" ? (
                    <Input type="date" value={editGoal.targetDate ? new Date(editGoal.targetDate).toISOString().split("T")[0] : ""} onChange={(e) => setEditGoal((g: any) => ({ ...g, targetDate: e.target.value }))} />
                  ) : (
                    <Input type="number" step="any" value={editGoal.target} onChange={(e) => setEditGoal((g: any) => ({ ...g, target: e.target.value }))} />
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Weightage (%)</Label>
                  <Input type="number" min={10} max={100} value={editGoal.weightage} onChange={(e) => setEditGoal((g: any) => ({ ...g, weightage: parseInt(e.target.value) }))} />
                </div>
              </div>
              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setEditGoal(null); setError(""); }}>Cancel</Button>
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Weightage-only Edit Dialog (shared/admin-assigned goals) */}
      {editWeightGoal && (
        <Dialog open={!!editWeightGoal} onOpenChange={() => { setEditWeightGoal(null); setNewWeight(""); setError(""); }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Adjust Weightage</DialogTitle>
            </DialogHeader>
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-800/40 dark:bg-amber-900/15 dark:text-amber-400">
              This is an Admin Assigned goal. Only the weightage can be adjusted.
            </div>
            <p className="text-sm font-medium text-[var(--fg)]">{editWeightGoal.title}</p>
            <form onSubmit={updateWeightage} className="space-y-4">
              <div className="space-y-2">
                <Label>Weightage (%)</Label>
                <Input
                  type="number"
                  min={10}
                  max={100}
                  value={newWeight}
                  onChange={(e) => setNewWeight(e.target.value)}
                  required
                  autoFocus
                />
                <p className="text-xs text-[var(--fg-muted)]">Min: 10% · Current: {editWeightGoal.weightage}%</p>
              </div>
              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setEditWeightGoal(null); setNewWeight(""); setError(""); }}>Cancel</Button>
                <Button type="submit">Update Weightage</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
