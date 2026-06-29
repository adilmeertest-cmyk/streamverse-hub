import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Star, Trash2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { listTitleReviews, getMyReview, upsertMyReview, deleteMyReview } from "@/lib/reviews.functions";

export function ReviewsSection({ titleId, avgRating, ratingCount }: { titleId: string; avgRating: number | null; ratingCount: number }) {
  const list = useServerFn(listTitleReviews);
  const getMine = useServerFn(getMyReview);
  const upsert = useServerFn(upsertMyReview);
  const del = useServerFn(deleteMyReview);
  const qc = useQueryClient();

  const [authed, setAuthed] = useState(false);
  useEffect(() => { supabase.auth.getUser().then(({ data }) => setAuthed(Boolean(data.user))); }, []);

  const { data: reviews } = useQuery({ queryKey: ["reviews", titleId], queryFn: () => list({ data: { titleId } } as never) as never });
  const { data: mine } = useQuery({ queryKey: ["my-review", titleId, authed], queryFn: () => authed ? getMine({ data: { titleId } } as never) : Promise.resolve(null) as never, enabled: authed });

  const rows = ((reviews as unknown) as Array<{ id: string; rating: number; body: string | null; created_at: string; profiles: { display_name: string | null; avatar_url: string | null } | null }> | undefined) ?? [];
  const my = (mine as unknown) as { id: string; rating: number; body: string | null; is_approved: boolean } | null;

  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  useEffect(() => { if (my) { setRating(my.rating); setBody(my.body ?? ""); } }, [my]);

  const submit = useMutation({
    mutationFn: () => upsert({ data: { titleId, rating, body: body || null } } as never),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["my-review", titleId] }); qc.invalidateQueries({ queryKey: ["reviews", titleId] }); },
  });
  const remove = useMutation({
    mutationFn: () => del({ data: { titleId } } as never),
    onSuccess: () => { setRating(0); setBody(""); qc.invalidateQueries({ queryKey: ["my-review", titleId] }); qc.invalidateQueries({ queryKey: ["reviews", titleId] }); },
  });

  return (
    <section className="mt-12 max-w-3xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold tracking-tight">Ratings & reviews</h2>
        {avgRating ? (
          <div className="flex items-center gap-2">
            <div className="flex">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-4 w-4 ${i < Math.round(Number(avgRating)) ? "fill-yellow-300 text-yellow-300" : "text-muted"}`} />)}</div>
            <span className="text-sm text-muted-foreground">{Number(avgRating).toFixed(1)} · {ratingCount} reviews</span>
          </div>
        ) : <span className="text-sm text-muted-foreground">No reviews yet</span>}
      </div>

      {!authed ? (
        <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
          <Link to="/auth" className="text-primary underline">Sign in</Link> to write a review.
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-sm font-semibold">{my ? "Your review" : "Write a review"}</div>
          <div className="mt-2 flex items-center gap-1">
            {[1,2,3,4,5].map((n) => (
              <button key={n} onClick={() => setRating(n)} aria-label={`${n} star`}>
                <Star className={`h-6 w-6 ${n <= rating ? "fill-yellow-300 text-yellow-300" : "text-muted hover:text-foreground"}`} />
              </button>
            ))}
          </div>
          <textarea value={body} onChange={(e) => setBody(e.target.value.slice(0, 2000))} placeholder="Share what you thought (optional)…" rows={3} className="mt-3 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          <div className="mt-2 flex items-center justify-between">
            <div className="text-xs text-muted-foreground">{my && !my.is_approved && "Pending moderation"} {body.length}/2000</div>
            <div className="flex gap-2">
              {my && <button onClick={() => remove.mutate()} className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-md bg-secondary text-muted-foreground hover:text-foreground"><Trash2 className="h-3.5 w-3.5" /> Delete</button>}
              <button disabled={rating === 0 || submit.isPending} onClick={() => submit.mutate()} className="rounded-md bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-40">{submit.isPending ? "Saving…" : my ? "Update" : "Submit"}</button>
            </div>
          </div>
          {submit.error && <div className="mt-2 text-xs text-destructive">{(submit.error as Error).message}</div>}
        </div>
      )}

      <div className="mt-6 space-y-4">
        {rows.length === 0 && <div className="text-sm text-muted-foreground">Be the first to review.</div>}
        {rows.map((r) => (
          <div key={r.id} className="rounded-lg border border-border bg-card/60 p-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xs font-bold">{(r.profiles?.display_name ?? "?")[0]?.toUpperCase()}</div>
              <div>
                <div className="text-sm font-medium">{r.profiles?.display_name ?? "Anonymous"}</div>
                <div className="flex items-center gap-1 mt-0.5">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-3 w-3 ${i < r.rating ? "fill-yellow-300 text-yellow-300" : "text-muted"}`} />)}</div>
              </div>
              <div className="ml-auto text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</div>
            </div>
            {r.body && <p className="mt-3 text-sm text-foreground/90 whitespace-pre-wrap">{r.body}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}