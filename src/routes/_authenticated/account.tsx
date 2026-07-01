import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Shell } from "@/components/sf/shell";
import { useQuery } from "@tanstack/react-query";
import { fetchUserDownloads } from "@/lib/apps.functions";
import { Download, Package, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/_authenticated/account")({
  component: AccountPage,
});

function AccountPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
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