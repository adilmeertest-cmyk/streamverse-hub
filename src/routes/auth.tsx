import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Shell } from "@/components/sf/shell";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — StreamFlix" }, { name: "description", content: "Sign in or create an account on StreamFlix." }] }),
  component: AuthPage,
  errorComponent: ({ error }) => <Shell><div className="p-12">{error.message}</div></Shell>,
  notFoundComponent: () => <Shell><div className="p-12">Not found</div></Shell>,
});

type Mode = "signin" | "signup" | "forgot";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/" });
    });
  }, [navigate]);

  const reset = () => { setErr(null); setInfo(null); };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    reset();
    setBusy(true);
    try {
      if (mode === "signup") {
        if (password !== confirmPassword) throw new Error("Passwords do not match");
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: name },
          },
        });
        if (error) throw error;
        // Auto sign-in (succeeds when email confirmation is OFF in Supabase Auth settings)
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
        if (signInErr) {
          setInfo("Account created. Check your email to verify, then sign in.");
          setMode("signin");
          return;
        }
        navigate({ to: "/" });
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setInfo("Password reset link sent. Check your email.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/" });
      }
    } catch (e: any) {
      setErr(e.message ?? "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    reset();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/` },
      });
      if (error) {
        if (error.message.includes("OAuth secret") || error.message.includes("Unsupported provider")) {
          setErr("Google OAuth is not configured. Use email/password or enable Google in Auth settings.");
        } else {
          throw error;
        }
      }
    } catch (e: any) {
      setErr(e.message ?? "Google sign-in failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell>
      <div className="mx-auto max-w-md px-4 py-16">
        <div className="flex rounded-md border border-border bg-card p-1 text-sm font-semibold">
          <button type="button" onClick={() => { setMode("signin"); reset(); }} className={`flex-1 rounded-sm py-2 transition ${mode !== "signup" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Sign in</button>
          <button type="button" onClick={() => { setMode("signup"); reset(); }} className={`flex-1 rounded-sm py-2 transition ${mode === "signup" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Sign up</button>
        </div>
        <h1 className="mt-6 text-3xl font-black tracking-tight">
          {mode === "signup" ? "Create your account" : mode === "forgot" ? "Reset your password" : "Welcome back"}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {mode === "signup" ? "Join StreamFlix and start watching." : mode === "forgot" ? "Enter your email and we'll send a reset link." : "Sign in to continue watching."}
        </p>

        {mode !== "forgot" && (
          <>
            <button onClick={handleGoogle} disabled={busy} className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-md border border-border bg-card px-4 py-2.5 text-sm font-semibold hover:bg-secondary disabled:opacity-60">
              <svg viewBox="0 0 24 24" className="h-4 w-4"><path fill="#EA4335" d="M12 11v3.6h5.1c-.2 1.3-1.6 3.9-5.1 3.9-3.1 0-5.6-2.5-5.6-5.7s2.5-5.7 5.6-5.7c1.8 0 2.9.7 3.6 1.4l2.5-2.4C16.5 4.5 14.5 3.6 12 3.6 7.3 3.6 3.5 7.4 3.5 12s3.8 8.4 8.5 8.4c4.9 0 8.2-3.4 8.2-8.3 0-.6-.1-1-.1-1.1H12z"/></svg>
              Continue with Google
            </button>
            <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
              <div className="h-px flex-1 bg-border" /> or email <div className="h-px flex-1 bg-border" />
            </div>
          </>
        )}

        <form onSubmit={handleEmail} className="space-y-3">
          {mode === "signup" && (
            <input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} placeholder="Your name" className="w-full rounded-md bg-card border border-border px-3 py-2.5 outline-none focus:border-primary" />
          )}
          <input value={email} onChange={(e) => setEmail(e.target.value)} required type="email" placeholder="Email address" className="w-full rounded-md bg-card border border-border px-3 py-2.5 outline-none focus:border-primary" />
          {mode !== "forgot" && (
            <input value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} type="password" placeholder="Password" className="w-full rounded-md bg-card border border-border px-3 py-2.5 outline-none focus:border-primary" />
          )}
          {mode === "signup" && (
            <input value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} type="password" placeholder="Confirm password" className="w-full rounded-md bg-card border border-border px-3 py-2.5 outline-none focus:border-primary" />
          )}
          {err && <div className="text-sm text-destructive">{err}</div>}
          {info && <div className="text-sm text-emerald-500">{info}</div>}
          <button disabled={busy} type="submit" className="w-full inline-flex items-center justify-center rounded-md bg-primary px-4 py-2.5 font-semibold text-primary-foreground disabled:opacity-60">
            {busy ? "Please wait…" : mode === "signup" ? "Create account" : mode === "forgot" ? "Send reset link" : "Sign in"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          {mode === "signin" && (
            <button className="text-foreground hover:underline" onClick={() => { setMode("forgot"); reset(); }}>Forgot password?</button>
          )}
          {mode === "forgot" && (
            <button className="text-foreground hover:underline" onClick={() => { setMode("signin"); reset(); }}>Back to sign in</button>
          )}
        </div>
      </div>
    </Shell>
  );
}