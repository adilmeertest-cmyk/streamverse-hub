import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Shell } from "@/components/sf/shell";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset password — StreamFlix" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setInfo(null);
    if (password.length < 6) return setErr("Password must be at least 6 characters.");
    if (password !== confirmPassword) return setErr("Passwords do not match.");
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setInfo("Password updated. Redirecting to sign in…");
      await supabase.auth.signOut();
      setTimeout(() => navigate({ to: "/auth", replace: true }), 1200);
    } catch (e: any) {
      setErr(e.message ?? "Failed to update password");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell>
      <div className="mx-auto max-w-md px-4 py-16">
        <h1 className="text-3xl font-black tracking-tight">Set a new password</h1>
        <p className="mt-2 text-muted-foreground">Enter a new password for your account.</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          <input value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} type="password" placeholder="New password" className="w-full rounded-md bg-card border border-border px-3 py-2.5 outline-none focus:border-primary" />
          <input value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} type="password" placeholder="Confirm new password" className="w-full rounded-md bg-card border border-border px-3 py-2.5 outline-none focus:border-primary" />
          {err && <div className="text-sm text-destructive">{err}</div>}
          {info && <div className="text-sm text-emerald-500">{info}</div>}
          <button disabled={busy} type="submit" className="w-full inline-flex items-center justify-center rounded-md bg-primary px-4 py-2.5 font-semibold text-primary-foreground disabled:opacity-60">
            {busy ? "Saving…" : "Update password"}
          </button>
        </form>
      </div>
    </Shell>
  );
}