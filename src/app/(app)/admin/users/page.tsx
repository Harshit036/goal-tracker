"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, CheckCircle, AlertCircle, Search, KeyRound, Trash2, Eye, EyeOff } from "lucide-react";

const ROLE_COLORS: Record<string, string> = {
  EMPLOYEE: "secondary",
  MANAGER:  "info",
  ADMIN:    "warning",
};

export default function UsersPage() {
  const [users, setUsers]       = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser]     = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [search, setSearch]         = useState("");
  const [error, setError]           = useState("");
  const [success, setSuccess]       = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [form, setForm] = useState({
    name: "", email: "", password: "password123",
    role: "EMPLOYEE", department: "", managerId: "__none__",
  });

  useEffect(() => {
    fetch("/api/users").then((r) => r.json()).then((d) => { setUsers(d); setLoading(false); });
  }, []);

  const managers = users.filter((u) => u.role === "MANAGER" || u.role === "ADMIN");
  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.email.toLowerCase().endsWith("@atomberg.com")) {
      setError("Email must be a valid @atomberg.com address.");
      return;
    }
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        managerId: form.managerId === "__none__" ? "" : form.managerId,
      }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Failed"); return; }
    setUsers((u) => [...u, data]);
    setShowCreate(false);
    setShowPassword(false);
    setForm({ name: "", email: "", password: "password123", role: "EMPLOYEE", department: "", managerId: "__none__" });
    setSuccess("User created successfully.");
    setTimeout(() => setSuccess(""), 3000);
  }

  async function updateUser(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const payload: any = {
      name:       editUser.name,
      role:       editUser.role,
      department: editUser.department,
      managerId:  editUser.managerId === "__none__" ? "" : editUser.managerId,
    };
    if (editUser.newPassword?.trim()) {
      payload.password = editUser.newPassword.trim();
    }
    const res = await fetch(`/api/users/${editUser.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Failed"); return; }
    setUsers((u) => u.map((x) => x.id === editUser.id ? data : x));
    setEditUser(null);
    setSuccess("User updated.");
    setTimeout(() => setSuccess(""), 3000);
  }

  async function deleteUser() {
    if (!deleteTarget) return;
    setError("");
    const res = await fetch(`/api/users/${deleteTarget.id}`, { method: "DELETE" });
    const text = await res.text();
    const data = text ? JSON.parse(text) : {};
    if (!res.ok) { setError(data.error || "Failed to delete user"); setDeleteTarget(null); return; }
    setUsers((u) => u.filter((x) => x.id !== deleteTarget.id));
    setDeleteTarget(null);
    setSuccess(`${deleteTarget.name} has been removed from the company.`);
    setTimeout(() => setSuccess(""), 4000);
  }

  if (loading) return <div className="flex h-full items-center justify-center text-[var(--fg-muted)]">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--fg)]">Users & Hierarchy</h1>
          <p className="text-sm text-[var(--fg-muted)]">{users.length} users</p>
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" />Add User</Button>
      </div>

      {error && <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400"><AlertCircle className="h-4 w-4" />{error}</div>}
      {success && <div className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400"><CheckCircle className="h-4 w-4" />{success}</div>}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--fg-muted)]" />
        <Input className="pl-9" placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--bg)] text-xs text-[var(--fg-muted)]">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Role</th>
              <th className="px-4 py-3 text-left">Department</th>
              <th className="px-4 py-3 text-left">Manager</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {filtered.map((user) => (
              <tr key={user.id} className="hover:bg-[var(--bg)]">
                <td className="px-4 py-3 font-medium text-[var(--fg)]">{user.name}</td>
                <td className="px-4 py-3 text-[var(--fg-muted)]">{user.email}</td>
                <td className="px-4 py-3">
                  <Badge variant={ROLE_COLORS[user.role] as any}>{user.role}</Badge>
                </td>
                <td className="px-4 py-3 text-[var(--fg-muted)]">{user.department || "—"}</td>
                <td className="px-4 py-3 text-[var(--fg-muted)]">
                  {user.manager?.name || (
                    user.role === "EMPLOYEE"
                      ? <span className="text-amber-600 dark:text-amber-400 text-xs font-medium">⚠ No manager</span>
                      : "—"
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" title="Edit user" onClick={() => setEditUser({ ...user, managerId: user.managerId || "__none__", newPassword: "" })}>
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      title="Remove from company"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                      onClick={() => setDeleteTarget(user)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create User Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add New User</DialogTitle></DialogHeader>
          <form onSubmit={createUser} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name <span className="text-red-500">*</span></Label>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Email <span className="text-red-500">*</span></Label>
                <Input
                  type="email"
                  placeholder="name@atomberg.com"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  required
                />
                {form.email && !form.email.toLowerCase().endsWith("@atomberg.com") && (
                  <p className="text-xs text-red-500">Must end with @atomberg.com</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    className="pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--fg-muted)] hover:text-[var(--fg)]"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v, managerId: "__none__" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EMPLOYEE">Employee</SelectItem>
                    <SelectItem value="MANAGER">Manager</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Input value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>
                  Manager
                  {form.role === "EMPLOYEE" && <span className="text-red-500 ml-1">*</span>}
                </Label>
                <Select value={form.managerId} onValueChange={(v) => setForm((f) => ({ ...f, managerId: v }))}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    {form.role !== "EMPLOYEE" && <SelectItem value="__none__">None</SelectItem>}
                    {managers.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {form.role === "EMPLOYEE" && <p className="text-xs text-amber-600 dark:text-amber-400">Required for employees.</p>}
              </div>
            </div>
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button type="submit">Create User</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      {deleteTarget && (
        <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Remove {deleteTarget.name}?</DialogTitle></DialogHeader>
            <div className="space-y-3 text-sm text-[var(--fg-2)]">
              <p>
                This will permanently remove <strong>{deleteTarget.name}</strong> ({deleteTarget.email}) from the company.
              </p>
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-400">
                <p className="font-semibold">All of the following will be deleted:</p>
                <ul className="mt-1 list-disc pl-4 space-y-0.5 text-xs">
                  <li>Goal sheets and all goals</li>
                  <li>Quarterly achievements and scores</li>
                  <li>Manager check-in notes</li>
                  <li>Shared goal assignments</li>
                </ul>
              </div>
              <p className="text-xs text-[var(--fg-muted)]">
                Audit log entries for this user are preserved for compliance, with their name recorded.
              </p>
            </div>
            {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button variant="destructive" onClick={deleteUser}>Remove from Company</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit User Dialog */}
      {editUser && (
        <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit User</DialogTitle></DialogHeader>
            <form onSubmit={updateUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={editUser.name} onChange={(e) => setEditUser((u: any) => ({ ...u, name: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={editUser.role} onValueChange={(v) => setEditUser((u: any) => ({ ...u, role: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EMPLOYEE">Employee</SelectItem>
                      <SelectItem value="MANAGER">Manager</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Input value={editUser.department || ""} onChange={(e) => setEditUser((u: any) => ({ ...u, department: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>
                    Manager
                    {editUser.role === "EMPLOYEE" && <span className="text-red-500 ml-1">*</span>}
                  </Label>
                  <Select value={editUser.managerId || "__none__"} onValueChange={(v) => setEditUser((u: any) => ({ ...u, managerId: v }))}>
                    <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      {editUser.role !== "EMPLOYEE" && <SelectItem value="__none__">None</SelectItem>}
                      {managers.filter((m) => m.id !== editUser.id).map((m: any) => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {editUser.role === "EMPLOYEE" && <p className="text-xs text-amber-600 dark:text-amber-400">Required for employees.</p>}
                </div>
              </div>

              {/* Password reset section */}
              <div className="rounded-lg border border-[var(--border)] p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-[var(--fg-2)]">
                  <KeyRound className="h-3.5 w-3.5" />
                  Reset Password <span className="text-xs font-normal text-[var(--fg-muted)]">(leave blank to keep current)</span>
                </div>
                <div className="relative">
                  <Input
                    type={showNewPassword ? "text" : "password"}
                    placeholder="New password..."
                    value={editUser.newPassword || ""}
                    onChange={(e) => setEditUser((u: any) => ({ ...u, newPassword: e.target.value }))}
                    className="pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--fg-muted)] hover:text-[var(--fg)]"
                    tabIndex={-1}
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditUser(null)}>Cancel</Button>
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
