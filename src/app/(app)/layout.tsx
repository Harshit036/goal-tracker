import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import NotificationBell from "@/components/NotificationBell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg)]">
      <Sidebar role={session.role} userName={session.name} />
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top header bar */}
        <header className="flex h-14 shrink-0 items-center justify-end border-b border-[var(--border)] bg-[var(--surface)] px-5 gap-3">
          <NotificationBell />
        </header>
        <main className="flex-1 overflow-y-auto bg-[var(--bg)] p-6 transition-colors duration-300">
          {children}
        </main>
      </div>
    </div>
  );
}
