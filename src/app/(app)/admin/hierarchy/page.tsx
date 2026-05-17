"use client";
import { useEffect, useState } from "react";
import { Users, ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

const ROLE_COLORS: Record<string, string> = {
  ADMIN:    "warning",
  MANAGER:  "info",
  EMPLOYEE: "secondary",
};

const ROLE_DOT: Record<string, string> = {
  ADMIN:    "bg-amber-500",
  MANAGER:  "bg-blue-500",
  EMPLOYEE: "bg-gray-400",
};

function TreeNode({ user, allUsers, depth = 0, search }: { user: any; allUsers: any[]; depth?: number; search: string }) {
  const children = allUsers.filter((u) => u.managerId === user.id);
  const [collapsed, setCollapsed] = useState(false);

  const matchesSearch = search
    ? user.name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase()) ||
      (user.department || "").toLowerCase().includes(search.toLowerCase())
    : true;

  const hasMatchingDescendant = (u: any): boolean => {
    if (u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        (u.department || "").toLowerCase().includes(search.toLowerCase())) return true;
    return allUsers.filter((c) => c.managerId === u.id).some(hasMatchingDescendant);
  };

  if (search && !matchesSearch && !hasMatchingDescendant(user)) return null;

  return (
    <div className="relative">
      {/* Connecting line from parent */}
      {depth > 0 && (
        <>
          <span className="absolute -left-4 top-5 w-4 border-t border-dashed border-[var(--border)]" />
          <span className="absolute -left-4 top-0 bottom-1/2 border-l border-dashed border-[var(--border)]" />
        </>
      )}

      <div
        className={`group relative flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 transition-colors hover:bg-[var(--bg)] ${
          !matchesSearch && search ? "opacity-50" : ""
        }`}
      >
        {/* Avatar */}
        <div className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white`}
          style={{ background: user.role === "ADMIN" ? "linear-gradient(135deg,#f59e0b,#d97706)" : user.role === "MANAGER" ? "linear-gradient(135deg,#3b82f6,#2563eb)" : "linear-gradient(135deg,#6b7280,#4b5563)" }}>
          {user.name.charAt(0).toUpperCase()}
          <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--surface)] ${ROLE_DOT[user.role]}`} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[var(--fg)]">{user.name}</p>
          <p className="truncate text-xs text-[var(--fg-muted)]">{user.email}</p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {user.department && (
            <span className="hidden sm:block rounded-md bg-[var(--surface-2)] px-2 py-0.5 text-xs text-[var(--fg-2)]">
              {user.department}
            </span>
          )}
          <Badge variant={ROLE_COLORS[user.role] as any} className="text-xs">{user.role}</Badge>
        </div>

        {children.length > 0 && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="ml-1 rounded-lg p-1 text-[var(--fg-muted)] hover:bg-[var(--surface-2)]"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        )}
        {children.length > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--accent)] text-[10px] font-bold text-white">
            {children.length}
          </span>
        )}
      </div>

      {/* Children */}
      {!collapsed && children.length > 0 && (
        <div className="relative ml-8 mt-2 space-y-2 border-l border-dashed border-[var(--border)] pl-4">
          {children.map((child) => (
            <TreeNode key={child.id} user={child} allUsers={allUsers} depth={depth + 1} search={search} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function HierarchyPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/users").then((r) => r.json()).then((d) => { setUsers(d); setLoading(false); });
  }, []);

  if (loading) return <div className="flex h-full items-center justify-center text-[var(--fg-muted)]">Loading...</div>;

  // Roots = users with no manager
  const roots = users.filter((u) => !u.managerId);

  const adminCount    = users.filter((u) => u.role === "ADMIN").length;
  const managerCount  = users.filter((u) => u.role === "MANAGER").length;
  const employeeCount = users.filter((u) => u.role === "EMPLOYEE").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Users className="h-6 w-6 text-[var(--fg-muted)]" />
        <div>
          <h1 className="text-2xl font-bold text-[var(--fg)]">Org Chart</h1>
          <p className="text-sm text-[var(--fg-muted)]">Reporting structure across the organisation</p>
        </div>
      </div>

      {/* Summary */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
          <span className="text-[var(--fg-2)]">{adminCount} Admin{adminCount !== 1 ? "s" : ""}</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm">
          <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
          <span className="text-[var(--fg-2)]">{managerCount} Manager{managerCount !== 1 ? "s" : ""}</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm">
          <span className="h-2.5 w-2.5 rounded-full bg-gray-400" />
          <span className="text-[var(--fg-2)]">{employeeCount} Employee{employeeCount !== 1 ? "s" : ""}</span>
        </div>
      </div>

      <Input
        placeholder="Search by name, email or department..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      <div className="space-y-3">
        {roots.length === 0 && (
          <p className="text-sm text-[var(--fg-muted)]">No users found.</p>
        )}
        {roots.map((root) => (
          <TreeNode key={root.id} user={root} allUsers={users} depth={0} search={search} />
        ))}
        {/* Orphan employees (have no manager but should) */}
        {users.filter((u) => u.role === "EMPLOYEE" && !u.managerId).length > 0 && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-300">
            ⚠ {users.filter((u) => u.role === "EMPLOYEE" && !u.managerId).length} employee(s) have no manager assigned. Please update via Users & Hierarchy.
          </div>
        )}
      </div>
    </div>
  );
}
