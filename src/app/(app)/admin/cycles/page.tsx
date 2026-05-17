"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, CheckCircle, AlertCircle, Edit2, Trash2, ChevronRight, Lock, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CYCLE_PHASES,
  PHASE_CONFIG,
  getCurrentPhase,
  type CyclePhase,
} from "@/lib/services/cycle.constants";

// Maps cycle-level status to a badge variant for the "Active / Closed" pill
const CYCLE_STATUS_VARIANT: Record<string, "info" | "success" | "secondary"> = {
  GOAL_SETTING: "info",
  ACTIVE:       "success",
  CLOSED:       "secondary",
};

export default function CyclesPage() {
  const [cycles, setCycles]         = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editCycle, setEditCycle]   = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [form, setForm]             = useState({ name: "", year: new Date().getFullYear().toString(), isActive: true });
  const [error, setError]           = useState("");
  const [success, setSuccess]       = useState("");

  useEffect(() => {
    fetch("/api/cycles").then((r) => r.json()).then((d) => { setCycles(d); setLoading(false); });
  }, []);

  async function createCycle(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/cycles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Failed to create cycle"); return; }
    setCycles((c) => [data, ...c]);
    setShowCreate(false);
    setSuccess("Cycle created. It starts in Goal Setting phase.");
    setTimeout(() => setSuccess(""), 4000);
  }

  async function saveCycleName(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch(`/api/cycles/${editCycle.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editCycle.name }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Failed"); return; }
    setCycles((c) => c.map((x) => x.id === editCycle.id ? { ...x, name: data.name } : x));
    setEditCycle(null);
    setSuccess("Cycle renamed.");
    setTimeout(() => setSuccess(""), 3000);
  }

  // Phase transition — calls CycleService via API
  async function setPhase(cycleId: string, phase: CyclePhase) {
    setError("");
    const res = await fetch(`/api/cycles/${cycleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phase }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Failed to transition phase"); return; }
    setCycles((c) => c.map((x) => x.id === cycleId ? data : x));
    setSuccess(`Moved to "${PHASE_CONFIG[phase].label}".`);
    setTimeout(() => setSuccess(""), 3000);
  }

  async function deleteCycle() {
    if (!deleteTarget) return;
    setError("");
    const res = await fetch(`/api/cycles/${deleteTarget.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Failed to delete"); setDeleteTarget(null); return; }
    setCycles((c) => c.filter((x) => x.id !== deleteTarget.id));
    setDeleteTarget(null);
    setSuccess("Cycle deleted.");
    setTimeout(() => setSuccess(""), 3000);
  }

  if (loading) return <div className="flex h-full items-center justify-center text-[var(--fg-muted)]">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--fg)]">Cycle Management</h1>
          <p className="text-sm text-[var(--fg-muted)]">Manage annual goal-setting cycles and advance their lifecycle</p>
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" />New Cycle</Button>
      </div>

      {error   && <div className="flex items-center gap-2 rounded-lg bg-red-50   px-4 py-3 text-sm text-red-700   dark:bg-red-900/20   dark:text-red-400">  <AlertCircle className="h-4 w-4" />{error}</div>}
      {success && <div className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400"><CheckCircle className="h-4 w-4" />{success}</div>}

      {/* Phase legend */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-xs text-[var(--fg-2)] space-y-2">
        <p className="font-semibold text-[var(--fg)]">Cycle Phases</p>
        <div className="flex flex-wrap items-center gap-1.5">
          {CYCLE_PHASES.map((phase, i) => (
            <span key={phase} className="flex items-center gap-1.5">
              <span className="rounded-md bg-[var(--surface-2)] px-2 py-0.5 font-medium">{PHASE_CONFIG[phase].label}</span>
              <span className="hidden sm:inline text-[var(--fg-muted)]">{PHASE_CONFIG[phase].description}</span>
              {i < CYCLE_PHASES.length - 1 && <ChevronRight className="h-3 w-3 text-[var(--fg-muted)]" />}
            </span>
          ))}
        </div>
        <p className="text-[var(--fg-muted)]">Click a phase button on any cycle card to move it to that phase immediately.</p>
      </div>

      <div className="space-y-4">
        {cycles.length === 0 && (
          <Card><CardContent className="py-8 text-center text-[var(--fg-muted)]">No cycles created yet.</CardContent></Card>
        )}
        {cycles.map((cycle) => {
          const currentPhase = getCurrentPhase(cycle.windows ?? []);
          const statusVariant = CYCLE_STATUS_VARIANT[cycle.status] ?? "secondary";

          return (
            <Card
              key={cycle.id}
              className={cycle.isActive ? "border-amber-300 ring-2 ring-amber-100 dark:ring-amber-900/30" : ""}
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 flex-wrap min-w-0">
                    <CardTitle className="text-base truncate">{cycle.name}</CardTitle>
                    <Badge variant={statusVariant}>{PHASE_CONFIG[currentPhase].label}</Badge>
                    {cycle.isActive && <Badge variant="success">Active</Badge>}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button size="sm" variant="ghost" title="Rename cycle" onClick={() => setEditCycle({ ...cycle })}>
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                      title="Delete cycle"
                      onClick={() => setDeleteTarget(cycle)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-[var(--fg-muted)]">
                  Year: {cycle.year} · {PHASE_CONFIG[currentPhase].description}
                </p>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* ── Phase Stepper ─────────────────────────────────── */}
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--fg-muted)]">Phase Control</p>
                  <div className="flex flex-wrap gap-2">
                    {CYCLE_PHASES.map((phase, i) => {
                      const isCurrent = phase === currentPhase;
                      const config = PHASE_CONFIG[phase];

                      return (
                        <button
                          key={phase}
                          disabled={isCurrent}
                          onClick={() => setPhase(cycle.id, phase)}
                          title={isCurrent ? `Current phase: ${config.label}` : `Move to: ${config.label} — ${config.description}`}
                          className={cn(
                            "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-150",
                            isCurrent
                              ? "bg-amber-500 text-white shadow-sm cursor-default"
                              : "border border-[var(--border)] text-[var(--fg-2)] hover:border-amber-400 hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-amber-900/20 dark:hover:text-amber-400"
                          )}
                        >
                          {isCurrent && <CheckCircle className="h-3 w-3" />}
                          {phase === "CLOSED" && !isCurrent && <Lock className="h-3 w-3" />}
                          {config.label}
                          {i < CYCLE_PHASES.length - 1 && !isCurrent && (
                            <ArrowRight className="h-3 w-3 opacity-40" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ── Window dates (reference only) ─────────────────── */}
                {cycle.windows?.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--fg-muted)]">Window Dates</p>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {cycle.windows.map((w: any) => (
                        <div
                          key={w.id}
                          className={cn(
                            "rounded-lg border p-3 text-xs",
                            w.isOpen
                              ? "border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-900/10"
                              : "border-[var(--border)] bg-[var(--bg)]"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-[var(--fg-2)]">
                              {PHASE_CONFIG[w.phase as CyclePhase]?.label ?? w.phase}
                            </p>
                            {w.isOpen && <span className="h-2 w-2 rounded-full bg-amber-500" />}
                          </div>
                          <p className="mt-1 text-[var(--fg-muted)]">
                            {new Date(w.opensAt).toLocaleDateString()} – {new Date(w.closesAt).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create New Cycle</DialogTitle></DialogHeader>
          <form onSubmit={createCycle} className="space-y-4">
            <div className="space-y-2">
              <Label>Cycle Name</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g., FY 2025-26" required />
            </div>
            <div className="space-y-2">
              <Label>Year</Label>
              <Input type="number" value={form.year} onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))} required />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="isActive" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />
              <label htmlFor="isActive" className="text-sm text-[var(--fg-2)]">Set as active cycle (starts in Goal Setting)</label>
            </div>
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button type="submit">Create Cycle</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      {editCycle && (
        <Dialog open={!!editCycle} onOpenChange={() => setEditCycle(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Rename Cycle</DialogTitle></DialogHeader>
            <form onSubmit={saveCycleName} className="space-y-4">
              <div className="space-y-2">
                <Label>Cycle Name</Label>
                <Input value={editCycle.name} onChange={(e) => setEditCycle((c: any) => ({ ...c, name: e.target.value }))} required />
              </div>
              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditCycle(null)}>Cancel</Button>
                <Button type="submit">Save</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirm Dialog */}
      {deleteTarget && (
        <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Delete Cycle?</DialogTitle></DialogHeader>
            <p className="text-sm text-[var(--fg-2)]">
              Delete <strong>{deleteTarget.name}</strong>? This cannot be undone.
            </p>
            <p className="text-sm text-amber-600 dark:text-amber-400">
              Cycles that have goal sheets attached cannot be deleted. Remove all goal sheets first, or close the cycle instead.
            </p>
            {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button variant="destructive" onClick={deleteCycle}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
