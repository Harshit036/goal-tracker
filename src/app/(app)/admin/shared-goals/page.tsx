"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, AlertCircle, Share2, Info } from "lucide-react";
import { UOM_LABELS } from "@/lib/utils";

export default function SharedGoalsPage() {
  const [users, setUsers]             = useState<any[]>([]);
  const [thrustAreas, setThrustAreas] = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [pushing, setPushing]         = useState(false);
  const [error, setError]             = useState("");
  const [success, setSuccess]         = useState("");

  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [form, setForm] = useState({
    title: "", thrustAreaId: "", uomType: "", target: "", targetDate: "", weightage: "20",
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/users").then((r) => r.json()),
      fetch("/api/thrust-areas").then((r) => r.json()),
    ]).then(([u, t]) => {
      setUsers(u);
      setThrustAreas(t);
      setLoading(false);
    });
  }, []);

  const employees = users.filter((u: any) => u.role === "EMPLOYEE");

  function toggleEmployee(id: string) {
    setSelectedEmployees((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id]
    );
  }

  function selectAll() {
    setSelectedEmployees(employees.map((e: any) => e.id));
  }

  function clearAll() {
    setSelectedEmployees([]);
  }

  async function pushGoal(e: React.FormEvent) {
    e.preventDefault();
    if (selectedEmployees.length === 0) {
      setError("Select at least one employee to push to.");
      return;
    }
    setPushing(true);
    setError("");
    const res = await fetch("/api/shared-goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, targetEmployeeIds: selectedEmployees }),
    });
    const data = await res.json();
    setPushing(false);
    if (!res.ok) { setError(data.error); return; }
    const msg = `Goal pushed to ${data.pushed} employee(s)${data.skipped > 0 ? ` (${data.skipped} skipped — already pushed or sheet full)` : ""}.`;
    setSuccess(msg);
    setForm({ title: "", thrustAreaId: "", uomType: "", target: "", targetDate: "", weightage: "20" });
    setSelectedEmployees([]);
    setTimeout(() => setSuccess(""), 6000);
  }

  if (loading) return <div className="flex h-full items-center justify-center text-[var(--fg-muted)]">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Share2 className="h-6 w-6 text-[var(--fg-muted)]" />
        <div>
          <h1 className="text-2xl font-bold text-[var(--fg)]">Push Shared Goal</h1>
          <p className="text-sm text-[var(--fg-muted)]">Define a company-wide KPI and assign it to employees</p>
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-300">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          Pushed goals appear in employees' goal sheets marked as <strong>Admin Assigned</strong> and count toward their 100% weightage. Employees can only adjust the weightage of pushed goals.
        </div>
      </div>

      {error && <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400"><AlertCircle className="h-4 w-4" />{error}</div>}
      {success && <div className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400"><CheckCircle className="h-4 w-4" />{success}</div>}

      <form onSubmit={pushGoal}>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Goal definition */}
          <Card>
            <CardHeader><CardTitle className="text-base">1. Define the Goal</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Goal Title <span className="text-red-500">*</span></Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g., Zero Safety Incidents"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Thrust Area <span className="text-red-500">*</span></Label>
                <Select value={form.thrustAreaId} onValueChange={(v) => setForm((f) => ({ ...f, thrustAreaId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select area..." /></SelectTrigger>
                  <SelectContent>
                    {thrustAreas.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Unit of Measurement <span className="text-red-500">*</span></Label>
                  <Select value={form.uomType} onValueChange={(v) => setForm((f) => ({ ...f, uomType: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select UoM..." /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(UOM_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{form.uomType === "TIMELINE" ? "Target Date" : "Target Value"}</Label>
                  {form.uomType === "TIMELINE" ? (
                    <Input type="date" value={form.targetDate} onChange={(e) => setForm((f) => ({ ...f, targetDate: e.target.value }))} />
                  ) : (
                    <Input type="number" step="any" value={form.target} onChange={(e) => setForm((f) => ({ ...f, target: e.target.value }))} placeholder="e.g., 0" />
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Weightage (%) <span className="text-red-500">*</span></Label>
                <Input
                  type="number"
                  min={10}
                  max={100}
                  value={form.weightage}
                  onChange={(e) => setForm((f) => ({ ...f, weightage: e.target.value }))}
                  required
                />
                <p className="text-xs text-[var(--fg-muted)]">This portion of the employee's 100% is reserved for this goal.</p>
              </div>
            </CardContent>
          </Card>

          {/* Employee selection */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">2. Select Recipients</CardTitle>
                <div className="flex gap-2">
                  <button type="button" onClick={selectAll} className="text-xs text-[var(--accent)] hover:underline">All</button>
                  <span className="text-[var(--fg-muted)]">·</span>
                  <button type="button" onClick={clearAll} className="text-xs text-[var(--fg-muted)] hover:underline">None</button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {employees.length === 0 ? (
                <p className="text-sm text-[var(--fg-muted)]">No employees found.</p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {employees.map((emp: any) => (
                    <label
                      key={emp.id}
                      className="flex items-center gap-3 rounded-lg border border-[var(--border)] p-3 hover:bg-[var(--bg)] cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedEmployees.includes(emp.id)}
                        onChange={() => toggleEmployee(emp.id)}
                        className="h-4 w-4 accent-[var(--accent)]"
                      />
                      <div>
                        <p className="text-sm font-medium text-[var(--fg)]">{emp.name}</p>
                        <p className="text-xs text-[var(--fg-muted)]">{emp.department || emp.email}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
              <p className="mt-3 text-xs text-[var(--fg-muted)]">
                {selectedEmployees.length} of {employees.length} selected
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-4">
          <Button
            type="submit"
            disabled={pushing || selectedEmployees.length === 0 || !form.title || !form.thrustAreaId || !form.uomType}
          >
            <Share2 className="h-4 w-4" />
            {pushing ? "Pushing..." : `Push to ${selectedEmployees.length} Employee(s)`}
          </Button>
        </div>
      </form>
    </div>
  );
}
