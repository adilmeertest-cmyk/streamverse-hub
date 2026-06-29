import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Shell } from "@/components/sf/shell";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getMySubscription, createBillingPortalSession } from "@/lib/billing.functions";
import { fetchUserDownloads } from "@/lib/apps.functions";
import { Download, Package, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/account")({
  component: AccountPage,
});

function AccountPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [portalErr, setPortalErr] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const portal = useServerFn(createBillingPortalSession);
  const sub = useServerFn(getMySubscription);
  const { data: s } = useQuery({ queryKey: ["my-sub"], queryFn: () => sub({}) as any });
  const { data: downloads } = useQuery({
    queryKey: ["my-downloads", userId],
    queryFn: () => fetchUserDownloads(userId!),
    enabled: !!userId,
  });

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setEmail(u.user.email ?? "");
      setUserId(u.user.id);
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
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="font-semibold flex items-center gap-2">
              <Download className="h-4 w-4" />
              Downloaded Apps
            </div>
            {downloads && downloads.length > 0 ? (
              <div className="mt-3 space-y-3">
                {downloads.map((download: any) => (
                  <div key={download.id} className="flex items-center justify-between p-3 rounded-lg bg-background/50">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                        <Package className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="font-medium text-sm">{download.apps?.name || "Unknown App"}</div>
                        <div className="text-xs text-muted-foreground capitalize">{download.app_platforms?.platform || "Unknown"} · v{download.app_platforms?.version || "—"}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">Downloaded</div>
                      <div className="text-xs">{new Date(download.downloaded_at).toLocaleDateString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">No apps downloaded yet.</p>
            )}
            <Link to="/browse/apps" className="mt-3 inline-flex items-center gap-2 text-sm text-primary hover:underline">
              Browse apps <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
          <button onClick={signOut} className="w-full rounded-md bg-destructive px-4 py-2.5 font-semibold text-destructive-foreground">Sign out</button>
        </div>
      </div>
    </Shell>
  );
}