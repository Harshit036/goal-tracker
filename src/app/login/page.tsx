"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Zap, Eye, EyeOff, AlertCircle, ArrowRight } from "lucide-react";

const DEMO_ACCOUNTS = [
  {
    label: "Employee",
    email: "employee@atomberg.com",
    password: "password123",
    color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  },
  {
    label: "Manager",
    email: "manager@atomberg.com",
    password: "password123",
    color: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  },
  {
    label: "Admin / HR",
    email: "admin@atomberg.com",
    password: "password123",
    color: "bg-violet-500/20 text-violet-300 border-violet-500/30",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const cardRef = useRef<HTMLDivElement>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `perspective(900px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg)`;
    el.style.transition = "transform 0.08s ease";
  }

  function handleMouseLeave() {
    if (!cardRef.current) return;
    cardRef.current.style.transform = "perspective(900px) rotateY(0deg) rotateX(0deg)";
    cardRef.current.style.transition = "transform 0.7s cubic-bezier(0.23,1,0.32,1)";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (!res.ok) {
      setError("Invalid email or password.");
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  function quickLogin(acc: (typeof DEMO_ACCOUNTS)[0]) {
    setEmail(acc.email);
    setPassword(acc.password);
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4 mesh-bg">
      {/* Floating ambient orbs */}
      <div
        aria-hidden
        className="animate-float-a pointer-events-none absolute rounded-full opacity-30"
        style={{
          top: "15%", right: "12%",
          width: 320, height: 320,
          background: "radial-gradient(circle, #6366f1, transparent 70%)",
          filter: "blur(60px)",
        }}
      />
      <div
        aria-hidden
        className="animate-float-b pointer-events-none absolute rounded-full opacity-25"
        style={{
          bottom: "10%", left: "8%",
          width: 400, height: 400,
          background: "radial-gradient(circle, #3b82f6, transparent 70%)",
          filter: "blur(80px)",
        }}
      />
      <div
        aria-hidden
        className="animate-float-c pointer-events-none absolute rounded-full opacity-20"
        style={{
          top: "55%", right: "28%",
          width: 200, height: 200,
          background: "radial-gradient(circle, #8b5cf6, transparent 70%)",
          filter: "blur(50px)",
        }}
      />

      {/* ── Content ── */}
      <div className="relative z-10 w-full max-w-[420px] space-y-4">
        {/* Logo */}
        <div
          className="flex flex-col items-center gap-3 animate-slide-up"
          style={{ animationDelay: "0ms" }}
        >
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl shadow-2xl"
            style={{
              background: "linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)",
              boxShadow: "0 0 40px rgba(99,102,241,0.5)",
            }}
          >
            <Zap className="h-7 w-7 text-white" strokeWidth={2.5} />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white tracking-tight">AtomQuest</h1>
            <p className="mt-0.5 text-sm text-blue-200/60 font-medium">
              Goal Setting &amp; Tracking Portal
            </p>
          </div>
        </div>

        {/* ── 3D Login card ── */}
        <div
          ref={cardRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{
            transformStyle: "preserve-3d",
            animationDelay: "80ms",
          }}
          className="animate-slide-up rounded-2xl border border-white/12 bg-white/8 p-6 shadow-2xl glass"
        >
          <h2 className="text-lg font-semibold text-white mb-0.5">Sign in</h2>
          <p className="text-sm text-blue-200/50 mb-5">Enter your credentials to continue</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-blue-200/60">
                Email
              </label>
              <input
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={[
                  "w-full rounded-xl border px-3.5 py-2.5 text-sm text-white transition-all duration-200",
                  "bg-white/8 border-white/15 placeholder:text-white/25",
                  "focus:outline-none focus:ring-2 focus:ring-indigo-400/50 focus:border-indigo-400/50",
                ].join(" ")}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-blue-200/60">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className={[
                    "w-full rounded-xl border px-3.5 py-2.5 pr-11 text-sm text-white transition-all duration-200",
                    "bg-white/8 border-white/15 placeholder:text-white/25",
                    "focus:outline-none focus:ring-2 focus:ring-indigo-400/50 focus:border-indigo-400/50",
                  ].join(" ")}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-red-500/15 border border-red-500/25 px-3 py-2.5 text-sm text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={[
                "group flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200",
                "bg-gradient-to-r from-indigo-600 to-blue-600",
                "hover:from-indigo-500 hover:to-blue-500",
                "shadow-lg hover:shadow-indigo-500/30 hover:shadow-xl",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "active:scale-[0.98]",
              ].join(" ")}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Signing in…
                </span>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* ── Demo accounts ── */}
        <div
          className="animate-slide-up rounded-2xl border border-white/10 bg-white/5 p-4 glass"
          style={{ animationDelay: "160ms" }}
        >
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-blue-200/40">
            Demo accounts
          </p>
          <div className="space-y-2">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.email}
                onClick={() => quickLogin(acc)}
                className="group flex w-full items-center justify-between rounded-xl border border-white/8 bg-white/4 p-3 text-left transition-all duration-200 hover:bg-white/10 hover:border-white/15"
              >
                <div>
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${acc.color}`}
                  >
                    {acc.label}
                  </span>
                  <p className="mt-1 text-xs text-blue-200/50">{acc.email}</p>
                </div>
                <span className="text-xs text-white/20 group-hover:text-white/40 transition-colors">
                  password123
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
