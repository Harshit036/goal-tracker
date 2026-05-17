"use client";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Shield } from "lucide-react";

const ACTION_COLORS: Record<string, string> = {
  GOAL_CREATED: "info",
  GOAL_UPDATED: "warning",
  GOAL_DELETED: "destructive",
  GOAL_SUBMITTED: "info",
  GOAL_APPROVED: "success",
  GOAL_RETURNED: "warning",
  GOAL_UNLOCKED: "warning",
  ACHIEVEMENT_UPDATED: "info",
  CHECKIN_ADDED: "success",
  CYCLE_UPDATED: "secondary",
  USER_CREATED: "secondary",
  USER_DELETED: "destructive",
  SHARED_GOAL_PUSHED: "info",
};

export default function AuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/reports?type=audit").then((r) => r.json()).then((d) => { setLogs(d); setLoading(false); });
  }, []);

  // Resolve display name: prefer live user, fall back to stored snapshot, then "System"
  function actorLabel(log: any): { name: string; deleted: boolean } {
    if (log.user?.name) return { name: log.user.name, deleted: false };
    if (log.actorName)  return { name: log.actorName, deleted: true };
    return { name: "System", deleted: false };
  }

  const filtered = logs.filter(
    (l) => {
      const name = l.user?.name ?? l.actorName ?? "";
      return (
        name.toLowerCase().includes(search.toLowerCase()) ||
        l.action?.toLowerCase().includes(search.toLowerCase()) ||
        l.entityType?.toLowerCase().includes(search.toLowerCase())
      );
    }
  );

  if (loading) return <div className="flex h-full items-center justify-center text-[var(--fg-muted)]">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-[var(--fg-muted)]" />
        <div>
          <h1 className="text-2xl font-bold text-[var(--fg)]">Audit Log</h1>
          <p className="text-sm text-[var(--fg-muted)]">{logs.length} events recorded</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--fg-muted)]" />
        <Input className="pl-9" placeholder="Search by user, action, entity..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--bg)] text-xs text-[var(--fg-muted)]">
            <tr>
              <th className="px-4 py-3 text-left">Timestamp</th>
              <th className="px-4 py-3 text-left">User</th>
              <th className="px-4 py-3 text-left">Action</th>
              <th className="px-4 py-3 text-left">Entity</th>
              <th className="px-4 py-3 text-left">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-[var(--fg-muted)]">No audit logs found.</td></tr>
            )}
            {filtered.map((log) => (
              <tr key={log.id} className="hover:bg-[var(--bg)]">
                <td className="whitespace-nowrap px-4 py-3 text-xs text-[var(--fg-muted)]">
                  {new Date(log.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  {(() => {
                    const { name, deleted } = actorLabel(log);
                    return deleted ? (
                      <span className="flex items-center gap-1.5">
                        <span className="font-medium text-[var(--fg)]">{name}</span>
                        <span className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-500 dark:bg-red-900/20 dark:text-red-400">deleted</span>
                      </span>
                    ) : (
                      <span className="font-medium text-[var(--fg)]">{name}</span>
                    );
                  })()}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={ACTION_COLORS[log.action] as any || "secondary"} className="text-xs">
                    {log.action.replace(/_/g, " ")}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-[var(--fg-muted)]">{log.entityType}</td>
                <td className="max-w-xs truncate px-4 py-3 text-xs text-[var(--fg-muted)]">
                  {log.newValue && (
                    <span title={log.newValue}>{log.newValue.substring(0, 80)}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
