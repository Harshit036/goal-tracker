"use client";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle, CheckCircle, AlertCircle, Plus, Edit2, Trash2,
  Play, RefreshCw, ShieldAlert, ListChecks,
} from "lucide-react";

const RULE_TYPES = [
  { value: "GOAL_NOT_SUBMITTED",    label: "Goals Not Submitted",     description: "Employee hasn't submitted their goal sheet within N days of Goal Setting opening." },
  { value: "GOAL_NOT_APPROVED",     label: "Goals Not Approved",      description: "Manager hasn't approved a submitted goal sheet within N days of submission." },
  { value: "CHECKIN_NOT_COMPLETED", label: "Check-in Not Completed",  description: "Manager hasn't completed a quarterly check-in within N days of the check-in window opening." },
];

const LEVEL_COLORS: Record<number, string> = { 1: "info", 2: "warning", 3: "destructive" };
const LEVEL_LABELS: Record<number, string>  = { 1: "Level 1 — Notify Subject", 2: "Level 2 — Escalate to Manager", 3: "Level 3 — HR / Admin Alert" };

const STATUS_COLORS: Record<string, string> = { OPEN: "destructive", RESOLVED: "success" };

const emptyForm = { name: "", type: "GOAL_NOT_SUBMITTED", thresholdDays: 7, level2Days: 3, level3Days: 5 };

export default function EscalationPage() {
  const [tab,    setTab]    = useState<"rules" | "events">("rules");
  const [rules,  setRules]  = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [eventFilter, setEventFilter] = useState<"ALL" | "OPEN" | "RESOLVED">("ALL");

  const [loading,  setLoading]  = useState(true);
  const [running,  setRunning]  = useState(false);
  const [runResult, setRunResult] = useState<{ eventsCreated: number; escalated: number; resolved: number } | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [editRule,   setEditRule]   = useState<any>(null);
  const [deleteRule, setDeleteRule] = useState<any>(null);

  const [form,  setForm]  = useState({ ...emptyForm });
  const [error, setError] = useState("");

  const fetchRules  = useCallback(() => fetch("/api/escalation/rules").then((r) => r.json()).then(setRules), []);
  const fetchEvents = useCallback((filter: string) => {
    const q = filter !== "ALL" ? `?status=${filter}` : "";
    return fetch(`/api/escalation/events${q}`).then((r) => r.json()).then(setEvents);
  }, []);

  useEffect(() => {
    Promise.all([fetchRules(), fetchEvents("ALL")]).finally(() => setLoading(false));
  }, [fetchRules, fetchEvents]);

  useEffect(() => { fetchEvents(eventFilter); }, [eventFilter, fetchEvents]);

  async function runCheck() {
    setRunning(true);
    setRunResult(null);
    setError("");
    const res  = await fetch("/api/escalation/run", { method: "POST" });
    const data = await res.json();
    setRunning(false);
    if (!res.ok) { setError(data.error || "Run failed."); return; }
    setRunResult(data);
    await Promise.all([fetchRules(), fetchEvents(eventFilter)]);
  }

  async function createRule(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res  = await fetch("/api/escalation/rules", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Failed."); return; }
    setRules((r) => [...r, data]);
    setShowCreate(false);
    setForm({ ...emptyForm });
  }

  async function updateRule(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res  = await fetch(`/api/escalation/rules/${editRule.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editRule) });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Failed."); return; }
    setRules((r) => r.map((x) => (x.id === editRule.id ? data : x)));
    setEditRule(null);
  }

  async function toggleRule(rule: any) {
    const res  = await fetch(`/api/escalation/rules/${rule.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !rule.isActive }) });
    const data = await res.json();
    if (res.ok) setRules((r) => r.map((x) => (x.id === rule.id ? data : x)));
  }

  async function confirmDeleteRule() {
    if (!deleteRule) return;
    await fetch(`/api/escalation/rules/${deleteRule.id}`, { method: "DELETE" });
    setRules((r) => r.filter((x) => x.id !== deleteRule.id));
    setDeleteRule(null);
  }

  if (loading) return <div className="flex h-full items-center justify-center text-[var(--fg-muted)]">Loading...</div>;

  const openCount = events.filter((e) => e.status === "OPEN").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldAlert className="h-6 w-6 text-amber-500" />
          <div>
            <h1 className="text-2xl font-bold text-[var(--fg)]">Escalation Rules</h1>
            <p className="text-sm text-[var(--fg-muted)]">Configure rule-based escalations and track violations</p>
          </div>
        </div>
        <Button onClick={runCheck} disabled={running} className="gap-2">
          {running ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {running ? "Running…" : "Run Escalation Check"}
        </Button>
      </div>

      {/* Run result banner */}
      {runResult && (
        <div className="flex items-center gap-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-800/30 dark:bg-green-900/15 dark:text-green-300">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>Check complete —</span>
          <span><strong>{runResult.eventsCreated}</strong> new event{runResult.eventsCreated !== 1 ? "s" : ""} opened</span>
          <span>·</span>
          <span><strong>{runResult.escalated}</strong> escalated to next level</span>
          <span>·</span>
          <span><strong>{runResult.resolved}</strong> resolved</span>
          <button onClick={() => setRunResult(null)} className="ml-auto text-green-600 hover:text-green-800 dark:text-green-400">✕</button>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
          <AlertCircle className="h-4 w-4" />{error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1 w-fit">
        {(["rules", "events"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              tab === t ? "bg-amber-500 text-white shadow-sm" : "text-[var(--fg-2)] hover:text-[var(--fg)]"
            }`}
          >
            {t === "rules" ? <ListChecks className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            {t === "rules" ? "Rules" : "Events Log"}
            {t === "events" && openCount > 0 && (
              <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white leading-none">{openCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── RULES TAB ── */}
      {tab === "rules" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { setError(""); setShowCreate(true); }} size="sm"><Plus className="h-4 w-4" />Add Rule</Button>
          </div>

          {rules.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-[var(--fg-muted)]">No escalation rules configured. Add your first rule.</CardContent></Card>
          ) : (
            <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
              <table className="w-full text-sm">
                <thead className="bg-[var(--bg)] text-xs text-[var(--fg-muted)]">
                  <tr>
                    <th className="px-4 py-3 text-left">Rule Name</th>
                    <th className="px-4 py-3 text-left">Type</th>
                    <th className="px-4 py-3 text-center">Level 1 (days)</th>
                    <th className="px-4 py-3 text-center">Level 2 (+days)</th>
                    <th className="px-4 py-3 text-center">Level 3 (+days)</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {rules.map((rule) => {
                    const typeInfo = RULE_TYPES.find((t) => t.value === rule.type);
                    return (
                      <tr key={rule.id} className="hover:bg-[var(--bg)]">
                        <td className="px-4 py-3 font-medium text-[var(--fg)]">{rule.name}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-[var(--fg-muted)]">{typeInfo?.label ?? rule.type}</span>
                        </td>
                        <td className="px-4 py-3 text-center text-[var(--fg-muted)]">{rule.thresholdDays}d</td>
                        <td className="px-4 py-3 text-center text-[var(--fg-muted)]">+{rule.level2Days}d</td>
                        <td className="px-4 py-3 text-center text-[var(--fg-muted)]">+{rule.level3Days}d</td>
                        <td className="px-4 py-3 text-center">
                          <button onClick={() => toggleRule(rule)} className="group">
                            <Badge variant={rule.isActive ? "success" : "secondary"} className="cursor-pointer group-hover:opacity-80">
                              {rule.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1 justify-end">
                            <Button size="sm" variant="ghost" onClick={() => { setError(""); setEditRule({ ...rule }); }}>
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => setDeleteRule(rule)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Escalation chain explainer */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--fg-muted)]">Escalation Chain</p>
            <div className="flex flex-wrap gap-3">
              {[1, 2, 3].map((level) => (
                <div key={level} className="flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-xs">
                  <Badge variant={LEVEL_COLORS[level] as any} className="text-[10px]">L{level}</Badge>
                  <span className="text-[var(--fg-2)]">{LEVEL_LABELS[level]}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-[var(--fg-muted)]">
              When a condition is first violated, a <strong>Level 1</strong> notification fires after <em>Threshold</em> days. If still unresolved, the escalation advances to Level 2 after the additional delay, then Level 3.
            </p>
          </div>
        </div>
      )}

      {/* ── EVENTS TAB ── */}
      {tab === "events" && (
        <div className="space-y-4">
          <div className="flex gap-2">
            {(["ALL", "OPEN", "RESOLVED"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setEventFilter(f)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  eventFilter === f ? "bg-amber-500 text-white" : "border border-[var(--border)] text-[var(--fg-2)] hover:text-[var(--fg)]"
                }`}
              >
                {f}
                {f === "OPEN" && openCount > 0 && <span className="ml-1.5 rounded-full bg-red-500 px-1 text-white">{openCount}</span>}
              </button>
            ))}
          </div>

          {events.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-[var(--fg-muted)]">No escalation events found. Run a check to detect violations.</CardContent></Card>
          ) : (
            <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
              <table className="w-full text-sm">
                <thead className="bg-[var(--bg)] text-xs text-[var(--fg-muted)]">
                  <tr>
                    <th className="px-4 py-3 text-left">Rule</th>
                    <th className="px-4 py-3 text-left">Subject</th>
                    <th className="px-4 py-3 text-left">Context</th>
                    <th className="px-4 py-3 text-center">Level</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-left">Opened</th>
                    <th className="px-4 py-3 text-left">Resolved</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {events.map((ev) => (
                    <tr key={ev.id} className="hover:bg-[var(--bg)]">
                      <td className="px-4 py-3">
                        <p className="font-medium text-[var(--fg)]">{ev.rule?.name ?? "—"}</p>
                        <p className="text-[10px] text-[var(--fg-muted)]">{RULE_TYPES.find((t) => t.value === ev.rule?.type)?.label}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-[var(--fg)]">{ev.subject?.name}</p>
                        <p className="text-xs text-[var(--fg-muted)]">{ev.subject?.role}</p>
                      </td>
                      <td className="px-4 py-3 max-w-[180px] truncate text-xs text-[var(--fg-muted)]" title={ev.contextLabel}>
                        {ev.contextLabel}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={LEVEL_COLORS[ev.currentLevel] as any} className="text-xs">
                          L{ev.currentLevel}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={STATUS_COLORS[ev.status] as any} className="text-xs">{ev.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--fg-muted)] whitespace-nowrap">
                        {new Date(ev.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--fg-muted)] whitespace-nowrap">
                        {ev.resolvedAt ? new Date(ev.resolvedAt).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Create Rule Dialog ── */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Escalation Rule</DialogTitle></DialogHeader>
          <form onSubmit={createRule} className="space-y-4">
            <RuleForm form={form} setForm={setForm} />
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button type="submit">Create Rule</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Edit Rule Dialog ── */}
      {editRule && (
        <Dialog open={!!editRule} onOpenChange={() => setEditRule(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit Rule</DialogTitle></DialogHeader>
            <form onSubmit={updateRule} className="space-y-4">
              <RuleForm form={editRule} setForm={setEditRule} isEdit />
              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditRule(null)}>Cancel</Button>
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Delete Confirm ── */}
      {deleteRule && (
        <Dialog open={!!deleteRule} onOpenChange={() => setDeleteRule(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Delete Rule?</DialogTitle></DialogHeader>
            <p className="text-sm text-[var(--fg-2)]">
              Deleting <strong>{deleteRule.name}</strong> will also remove all its escalation events and associated notifications.
            </p>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setDeleteRule(null)}>Cancel</Button>
              <Button variant="destructive" onClick={confirmDeleteRule}>Delete Rule</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function RuleForm({ form, setForm, isEdit }: { form: any; setForm: any; isEdit?: boolean }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Rule Name <span className="text-red-500">*</span></Label>
        <Input value={form.name} onChange={(e) => setForm((f: any) => ({ ...f, name: e.target.value }))} placeholder="e.g. Goal Submission Reminder" required />
      </div>
      {!isEdit && (
        <div className="space-y-2">
          <Label>Trigger Condition</Label>
          <Select value={form.type} onValueChange={(v) => setForm((f: any) => ({ ...f, type: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {RULE_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-[var(--fg-muted)]">{RULE_TYPES.find((t) => t.value === form.type)?.description}</p>
        </div>
      )}
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label className="text-xs">
            <Badge variant="info" className="text-[10px] mr-1">L1</Badge>
            After (days)
          </Label>
          <Input type="number" min={1} value={form.thresholdDays} onChange={(e) => setForm((f: any) => ({ ...f, thresholdDays: +e.target.value }))} />
          <p className="text-[10px] text-[var(--fg-muted)]">Days before first escalation</p>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">
            <Badge variant="warning" className="text-[10px] mr-1">L2</Badge>
            + (days)
          </Label>
          <Input type="number" min={1} value={form.level2Days} onChange={(e) => setForm((f: any) => ({ ...f, level2Days: +e.target.value }))} />
          <p className="text-[10px] text-[var(--fg-muted)]">Additional days to L2</p>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">
            <Badge variant="destructive" className="text-[10px] mr-1">L3</Badge>
            + (days)
          </Label>
          <Input type="number" min={1} value={form.level3Days} onChange={(e) => setForm((f: any) => ({ ...f, level3Days: +e.target.value }))} />
          <p className="text-[10px] text-[var(--fg-muted)]">Additional days to L3</p>
        </div>
      </div>
      <div className="rounded-lg bg-[var(--bg)] px-3 py-2 text-xs text-[var(--fg-muted)]">
        Example: if <strong>L1 = {form.thresholdDays}d</strong>, <strong>L2 = +{form.level2Days}d</strong>, <strong>L3 = +{form.level3Days}d</strong> →
        first alert after {form.thresholdDays} days, escalate to manager at {form.thresholdDays + form.level2Days} days, HR alert at {form.thresholdDays + form.level2Days + form.level3Days} days.
      </div>
    </div>
  );
}
