import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { listReviewsAdmin, moderateReview } from "@/lib/cms.functions";
import { AdminPage } from "@/components/sf/admin-shell";
import { Check, X, Star } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/reviews")({
  component: ReviewsAdmin,
  errorComponent: ({ error }) => <div className="p-12">{error.message}</div>,
  notFoundComponent: () => <div className="p-12">Not found</div>,
});

function ReviewsAdmin() {
  const list = useServerFn(listReviewsAdmin);
  const moderate = useServerFn(moderateReview);
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"pending" | "approved">("pending");
  const { data } = useQuery({ queryKey: ["admin-reviews", filter], queryFn: () => list({ data: { approved: filter === "approved" } } as never) as never });
  const rows = ((data as unknown) as Array<{ id: string; rating: number; body: string | null; created_at: string; profiles: { display_name: string | null; email: string } | null; titles: { title: string; slug: string } | null }> | undefined) ?? [];
  const mut = useMutation({ mutationFn: (v: { id: string; approve: boolean }) => moderate({ data: v } as never), onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-reviews"] }) });

  return (
    <AdminPage title="Reviews" description="Approve user reviews before they go live.">
      <div className="mb-4 inline-flex rounded-md border border-border p-0.5 bg-card">
        {(["pending", "approved"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 text-sm font-medium rounded ${filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{f}</button>
        ))}
      </div>
      <div className="space-y-3">
        {rows.length === 0 && <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">No reviews.</div>}
        {rows.map((r) => (
          <div key={r.id} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">{r.profiles?.display_name ?? r.profiles?.email} <span className="text-muted-foreground font-normal">on</span> {r.titles?.title}</div>
                <div className="flex items-center gap-0.5 mt-1">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? "fill-yellow-300 text-yellow-300" : "text-muted"}`} />)}</div>
              </div>
              <div className="flex gap-2">
                {filter === "pending" && <button onClick={() => mut.mutate({ id: r.id, approve: true })} className="inline-flex items-center gap-1 rounded-md bg-emerald-500/20 text-emerald-300 px-3 py-1.5 text-sm"><Check className="h-4 w-4" /> Approve</button>}
                <button onClick={() => mut.mutate({ id: r.id, approve: false })} className="inline-flex items-center gap-1 rounded-md bg-destructive/15 text-destructive px-3 py-1.5 text-sm"><X className="h-4 w-4" /> Delete</button>
              </div>
            </div>
            {r.body && <p className="mt-3 text-sm text-foreground/90 whitespace-pre-wrap">{r.body}</p>}
            <div className="mt-2 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</div>
          </div>
        ))}
      </div>
    </AdminPage>
  );
}