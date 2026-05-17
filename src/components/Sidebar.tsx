"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Target, ClipboardCheck, Users, Settings,
  BarChart3, FileText, LogOut, Shield, Bell, Zap, GitBranch, AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ui/theme-toggle";

type NavItem = { label: string; href: string; icon: React.ElementType };

const employeeNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "My Goals", href: "/goals", icon: Target },
  { label: "Quarterly Updates", href: "/achievements", icon: ClipboardCheck },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
];

const managerNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "My Goals", href: "/goals", icon: Target },
  { label: "Quarterly Updates", href: "/achievements", icon: ClipboardCheck },
  { label: "Team Goals", href: "/manager/team", icon: Users },
  { label: "Check-ins", href: "/manager/checkins", icon: Bell },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
];

const adminNav: NavItem[] = [
  { label: "Dashboard",         href: "/dashboard",            icon: LayoutDashboard },
  { label: "Cycle Management",  href: "/admin/cycles",         icon: Settings },
  { label: "Team Goals",        href: "/manager/team",         icon: ClipboardCheck },
  { label: "Users & Hierarchy", href: "/admin/users",          icon: Users },
  { label: "Org Chart",         href: "/admin/hierarchy",      icon: GitBranch },
  { label: "Shared Goals",      href: "/admin/shared-goals",   icon: Target },
  { label: "Escalation Rules",  href: "/admin/escalation",     icon: AlertTriangle },
  { label: "Audit Log",         href: "/admin/audit",          icon: Shield },
  { label: "Reports",           href: "/admin/reports",        icon: FileText },
  { label: "Analytics",         href: "/analytics",            icon: BarChart3 },
];

interface SidebarProps { role: string; userName: string; }

export default function Sidebar({ role, userName }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = role === "ADMIN" ? adminNav : role === "MANAGER" ? managerNav : employeeNav;

  async function handleSignOut() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className={cn(
      "relative flex h-screen w-64 flex-col overflow-hidden",
      "border-r border-[var(--border)]",
      "bg-white dark:bg-[#080c18]",
      "transition-colors duration-300"
    )}>
      {/* Dark-mode ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-56 opacity-0 dark:opacity-100 transition-opacity duration-500"
        style={{
          background: "radial-gradient(ellipse 80% 60% at 50% -5%, rgba(245,158,11,0.15) 0%, transparent 75%)",
        }}
      />

      {/* ── Logo ── */}
      <div className="flex h-16 items-center gap-3 px-5 border-b border-[var(--border)] relative z-10">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-lg"
          style={{ background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" }}
        >
          <Zap className="h-5 w-5 text-white" strokeWidth={2.5} />
        </div>
        <div>
          <p className="text-sm font-bold text-[var(--fg)] tracking-tight">AtomQuest</p>
          <p className="text-[10px] font-medium text-[var(--fg-muted)] uppercase tracking-widest">
            Goal Tracker
          </p>
        </div>
      </div>

      {/* ── Nav ── */}
      <nav className="relative z-10 flex-1 overflow-y-auto px-3 py-4">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--fg-muted)]">
          Navigation
        </p>
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    active
                      ? "bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300"
                      : "text-[var(--fg-2)] hover:bg-[var(--surface-2)] hover:text-[var(--fg)]"
                  )}
                >
                  {/* Active indicator pill */}
                  {active && (
                    <span
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
                      style={{ background: "linear-gradient(180deg, #f59e0b, #d97706)" }}
                    />
                  )}

                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0 transition-all duration-200 group-hover:scale-110",
                      active && "text-amber-600 dark:text-amber-400"
                    )}
                  />
                  <span className="flex-1">{item.label}</span>

                  {active && (
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 dark:bg-amber-400" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* ── Bottom section ── */}
      <div className="relative z-10 border-t border-[var(--border)] p-3 space-y-1">
        {/* Theme toggle */}
        <ThemeToggle className="w-full" />

        {/* User info */}
        <div className="flex items-center gap-3 rounded-xl px-3 py-2.5">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-md"
            style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}
          >
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-[var(--fg)]">{userName}</p>
            <p className="text-[10px] text-[var(--fg-muted)] capitalize font-medium">
              {role.toLowerCase()}
            </p>
          </div>
        </div>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200 text-[var(--fg-muted)] hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
