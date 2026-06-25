import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Shell } from "@/components/sf/shell";
import { Check, Crown } from "lucide-react";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { createCheckoutSession } from "@/lib/billing.functions";
import type { SubscriptionPlan } from "@/lib/types";

const plansOpts = queryOptions({
  queryKey: ["plans"],
  queryFn: async (): Promise<SubscriptionPlan[]> => {
    const { data, error } = await supabase
      .from("subscription_plans")
      .select("id,tier,interval,name,price_cents,currency,max_screens,max_quality,features,trial_days")
      .eq("is_active", true)
      .order("price_cents");
    if (error) throw error;
    return (data ?? []).map((p) => ({ ...p, features: Array.isArray(p.features) ? p.features as string[] : [] }));
  },
});

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing & Plans — StreamFlix" },
      { name: "description", content: "Pick a StreamFlix plan: Basic, Standard, Premium or Family. 14-day free trial. Cancel anytime." },
      { property: "og:title", content: "StreamFlix Plans" },
      { property: "og:description", content: "From $4.99/mo. 14-day free trial." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(plansOpts),
  component: PricingPage,
  errorComponent: ({ error }) => <Shell><div className="p-12">{error.message}</div></Shell>,
  notFoundComponent: () => <Shell><div className="p-12">Not found</div></Shell>,
});

function PricingPage() {
  const plans = useSuspenseQuery(plansOpts).data;
  const [interval, setInterval] = useState<"monthly" | "yearly">("monthly");
  const filtered = plans.filter((p) => p.interval === interval);
  const checkout = useServerFn(createCheckoutSession);
  const [signedIn, setSignedIn] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { supabase.auth.getUser().then(({ data }) => setSignedIn(Boolean(data.user))); }, []);

  async function subscribe(planId: string) {
    setError(null);
    if (!signedIn) { window.location.href = `/auth?next=/pricing`; return; }
    try {
      setPending(planId);
      const res = await checkout({ data: { planId } } as never) as { url: string };
      if (res?.url) window.location.href = res.url;
    } catch (e) {
      setError((e as Error).message);
    } finally { setPending(null); }
  }

  return (
    <Shell>
      <div className="mx-auto max-w-[1200px] px-4 md:px-8 py-14">
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight">Pick the plan that fits.</h1>
          <p className="mt-3 text-muted-foreground text-lg">14-day free trial. Cancel anytime. Change plans whenever you want.</p>
        </div>
        <div className="mt-8 flex justify-center">
          <div className="inline-flex rounded-full border border-border p-1 bg-card">
            {(["monthly", "yearly"] as const).map((opt) => (
              <button key={opt} onClick={() => setInterval(opt)}
                className={`px-4 py-1.5 text-sm font-medium rounded-full transition ${
                  interval === opt ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}>
                {opt === "monthly" ? "Monthly" : "Yearly (save ~17%)"}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {filtered.map((p) => {
            const isPremium = p.tier === "premium";
            return (
              <div key={p.id} className={`rounded-2xl border p-6 ${isPremium ? "border-primary bg-card relative shadow-2xl shadow-primary/10" : "border-border bg-card/60"}`}>
                {isPremium && (
                  <span className="absolute -top-3 right-4 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold text-primary-foreground">
                    <Crown className="h-3 w-3" /> Most popular
                  </span>
                )}
                <div className="text-sm uppercase tracking-wider text-muted-foreground">{p.tier}</div>
                <div className="mt-1 text-2xl font-bold">{p.name}</div>
                <div className="mt-4">
                  <span className="text-4xl font-black">${(p.price_cents / 100).toFixed(2)}</span>
                  <span className="text-muted-foreground">/{p.interval === "monthly" ? "mo" : "yr"}</span>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {p.max_quality} · {p.max_screens} {p.max_screens === 1 ? "screen" : "screens"}
                </div>
                <ul className="mt-6 space-y-2 text-sm">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2"><Check className="h-4 w-4 text-primary mt-0.5 shrink-0" /> {f}</li>
                  ))}
                </ul>
                <button onClick={() => subscribe(p.id)} disabled={pending === p.id}
                  className={`mt-6 inline-flex w-full items-center justify-center rounded-md px-4 py-2.5 text-sm font-semibold ${
                    isPremium ? "bg-primary text-primary-foreground hover:opacity-90" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  }`}>
                  {pending === p.id ? "Redirecting…" : `Start ${p.trial_days}-day free trial`}
                </button>
              </div>
            );
          })}
        </div>
        {error && <p className="mt-6 text-center text-sm text-destructive">{error}</p>}
        <p className="mt-10 text-center text-sm text-muted-foreground">
          Payments processed securely. Cancel anytime from your account.
        </p>
      </div>
    </Shell>
  );
}