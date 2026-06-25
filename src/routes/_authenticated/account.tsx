import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Shell } from "@/components/sf/shell";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getMySubscription, createBillingPortalSession } from "@/lib/billing.functions";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({ meta: [{ title: "Account — StreamFlix" }, { name: "description", content: "Manage your StreamFlix account." }] }),
  component: AccountPage,
  errorComponent: ({ error }) => <Shell><div className="p-12">{error.message}</div></Shell>,
  notFoundComponent: () => <Shell><div className="p-12">Not found</div></Shell>,
});

function AccountPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string>("");
  const [name, setName] = useState<string>("");
  const sub = useServerFn(getMySubscription);
  const portal = useServerFn(createBillingPortalSession);
  const [portalErr, setPortalErr] = useState<string | null>(null);
  const { data: mySub } = useQuery({ queryKey: ["my-subscription"], queryFn: () => sub() as never });
  const s = (mySub as unknown) as { status: string; current_period_end: string | null; cancel_at_period_end: boolean; subscription_plans: { name: string; tier: string; interval: string } | null } | null;

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setEmail(u.user.email ?? "");
      const { data } = await supabase.from("profiles").select("display_name").eq("id", u.user.id).maybeSingle();
      setName(data?.display_name ?? "");
    })();
  }, []);

  const signOut = async () => { await supabase.auth.signOut(); navigate({ to: "/" }); };

  return (
    <Shell>
      <div className="mx-auto max-w-2xl px-4 md:px-8 py-12">
        <h1 className="text-3xl font-black tracking-tight">Account</h1>
        <div className="mt-6 space-y-6">
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="text-sm text-muted-foreground">Signed in as</div>
            <div className="mt-1 text-lg font-medium">{name || email}</div>
            <div className="text-sm text-muted-foreground">{email}</div>
          </div>
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="font-semibold">Subscription</div>
            {s ? (
              <>
                <div className="mt-2 flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-primary/15 text-primary px-2.5 py-0.5 text-xs font-semibold">{s.subscription_plans?.name ?? s.subscription_plans?.tier}</span>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs ${["active","trialing"].includes(s.status) ? "bg-emerald-500/15 text-emerald-300" : "bg-yellow-500/15 text-yellow-300"}`}>{s.status}</span>
                </div>
                {s.current_period_end && <div className="mt-2 text-sm text-muted-foreground">{s.cancel_at_period_end ? "Ends" : "Renews"} on {new Date(s.current_period_end).toLocaleDateString()}</div>}
                <div className="mt-3 flex gap-2">
                  <button onClick={async () => { setPortalErr(null); try { const r = await portal() as { url: string }; if (r?.url) window.location.href = r.url; } catch (e) { setPortalErr((e as Error).message); } }} className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Manage billing</button>
                  <Link to="/pricing" className="inline-flex items-center rounded-md bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground">Change plan</Link>
                </div>
                {portalErr && <div className="mt-2 text-xs text-destructive">{portalErr}</div>}
              </>
            ) : (
              <>
                <p className="mt-1 text-sm text-muted-foreground">You don't have a subscription yet.</p>
                <Link to="/pricing" className="mt-3 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">See plans</Link>
              </>
            )}
          </div>
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="font-semibold">My list & history</div>
            <div className="mt-3 flex gap-3">
              <Link to="/watchlist" className="rounded-md bg-secondary px-4 py-2 text-sm font-semibold">My list</Link>
            </div>
          </div>
          <button onClick={signOut} className="w-full rounded-md bg-destructive px-4 py-2.5 font-semibold text-destructive-foreground">Sign out</button>
        </div>
      </div>
    </Shell>
  );
}