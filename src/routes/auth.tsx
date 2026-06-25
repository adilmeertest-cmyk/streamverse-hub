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

function AuthPage() {
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(window.location.search);
  const message = searchParams.get("message");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(message === "email_not_verified" ? " please verify your email before accessing protected features." : null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/" });
    });
  }, [navigate]);

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error, data } = await supabase.auth.signUp({
          email, password,
          options: { 
            emailRedirectTo: window.location.origin, 
            data: { display_name: name }
          },
        });
        if (error) throw error;
        // Show message about email verification
        setErr("Please check your email to verify your account before signing in.");
      } else {
        const { error, data } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (!data.user.email_confirmed_at) {
          await supabase.auth.signOut();
          setErr("Please verify your email before signing in.");
          return;
        }
        navigate({ to: "/" });
      }
    } catch (e: any) { setErr(e.message ?? "Something went wrong"); }
    finally { setBusy(false); }
  };

  const handleGoogle = async () => {
    setErr(null);
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        }
      });
      if (error) {
        if (error.message.includes('OAuth secret') || error.message.includes('Unsupported provider')) {
          setErr("Google OAuth is not configured. Please use email/password sign in or configure Google OAuth in Supabase dashboard.");
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
        <h1 className="text-3xl font-black tracking-tight">{mode === "signin" ? "Welcome back" : "Create your account"}</h1>
        <p className="mt-2 text-muted-foreground">
          {mode === "signin" ? "Sign in to continue watching." : "Start your 14-day free trial."}
        </p>
        <button onClick={handleGoogle} className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-md border border-border bg-card px-4 py-2.5 text-sm font-semibold hover:bg-secondary">
          <svg viewBox="0 0 24 24" className="h-4 w-4"><path fill="#EA4335" d="M12 11v3.6h5.1c-.2 1.3-1.6 3.9-5.1 3.9-3.1 0-5.6-2.5-5.6-5.7s2.5-5.7 5.6-5.7c1.8 0 2.9.7 3.6 1.4l2.5-2.4C16.5 4.5 14.5 3.6 12 3.6 7.3 3.6 3.5 7.4 3.5 12s3.8 8.4 8.5 8.4c4.9 0 8.2-3.4 8.2-8.3 0-.6-.1-1-.1-1.1H12z"/></svg>
          Continue with Google
        </button>
        <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> or email <div className="h-px flex-1 bg-border" />
        </div>
        <form onSubmit={handleEmail} className="space-y-3">
          {mode === "signup" && (
            <input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} placeholder="Your name"
              className="w-full rounded-md bg-card border border-border px-3 py-2.5 outline-none focus:border-primary" />
          )}
          <input value={email} onChange={(e) => setEmail(e.target.value)} required type="email" placeholder="Email address"
            className="w-full rounded-md bg-card border border-border px-3 py-2.5 outline-none focus:border-primary" />
          <input value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} type="password" placeholder="Password"
            className="w-full rounded-md bg-card border border-border px-3 py-2.5 outline-none focus:border-primary" />
          {err && <div className="text-sm text-destructive">{err}</div>}
          <button disabled={busy} type="submit" className="w-full inline-flex items-center justify-center rounded-md bg-primary px-4 py-2.5 font-semibold text-primary-foreground disabled:opacity-60">
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>
        <div className="mt-6 text-center text-sm text-muted-foreground">
          {mode === "signin" ? (
            <>New to StreamFlix? <button className="text-foreground hover:underline" onClick={() => setMode("signup")}>Create an account</button></>
          ) : (
            <>Already have an account? <button className="text-foreground hover:underline" onClick={() => setMode("signin")}>Sign in</button></>
          )}
        </div>
      </div>
    </Shell>
  );
}