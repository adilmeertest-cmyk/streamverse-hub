import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { listTitlesAdmin, upsertTitle, deleteTitle } from "@/lib/cms.functions";
import { AdminPage } from "@/components/sf/admin-shell";
import { Plus, Search, Trash2, Pencil } from "lucide-react";
import { TitleEditor } from "@/components/sf/admin-title-editor";

export const Route = createFileRoute("/_authenticated/admin/titles")({
  component: TitlesAdmin,
  errorComponent: ({ error }) => <div className="p-12">{error.message}</div>,
  notFoundComponent: () => <div className="p-12">Not found</div>,
});

function TitlesAdmin() {
  const list = useServerFn(listTitlesAdmin);
  const del = useServerFn(deleteTitle);
  const upsert = useServerFn(upsertTitle);
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<{ id?: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-titles", q],
    queryFn: () => list({ data: { q: q || undefined } } as never) as never,
  });

  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } } as never),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-titles"] }),
  });

  const rows = (data as unknown as Array<{ id: string; title: string; slug: string; kind: string; is_published: boolean; is_premium: boolean; release_year: number | null; avg_rating: number | null; rating_count: number }>) ?? [];

  return (
    <AdminPage title="Titles" description="Manage your catalog." actions={
      <button onClick={() => setEditing({})} className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"><Plus className="h-4 w-4" /> New title</button>
    }>
      <div className="mb-4 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search titles…" className="w-full rounded-md border border-border bg-card px-9 py-2 text-sm" />
      </div>
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr><th className="text-left px-4 py-2.5">Title</th><th className="text-left px-4 py-2.5">Kind</th><th className="text-left px-4 py-2.5">Year</th><th className="text-left px-4 py-2.5">Rating</th><th className="text-left px-4 py-2.5">Status</th><th className="px-4 py-2.5"></th></tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Loading…</td></tr>}
            {!isLoading && rows.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No titles.</td></tr>}
            {rows.map((t) => (
              <tr key={t.id} className="border-t border-border">
                <td className="px-4 py-2.5"><div className="font-medium">{t.title}</div><div className="text-xs text-muted-foreground">/{t.slug}</div></td>
                <td className="px-4 py-2.5 capitalize">{t.kind}</td>
                <td className="px-4 py-2.5">{t.release_year ?? "—"}</td>
                <td className="px-4 py-2.5">{t.avg_rating ? `${Number(t.avg_rating).toFixed(1)} (${t.rating_count})` : "—"}</td>
                <td className="px-4 py-2.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${t.is_published ? "bg-emerald-500/15 text-emerald-300" : "bg-yellow-500/15 text-yellow-300"}`}>{t.is_published ? "Published" : "Draft"}</span>
                  {t.is_premium && <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary">Premium</span>}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <Link to="/admin/titles/$id" params={{ id: t.id }} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mr-3">Episodes →</Link>
                  <button onClick={() => setEditing({ id: t.id })} className="p-1.5 rounded hover:bg-secondary"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => { if (confirm(`Delete "${t.title}"?`)) delMut.mutate(t.id); }} className="p-1.5 rounded hover:bg-destructive/20 text-destructive"><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing && <TitleEditor id={editing.id} onClose={() => setEditing(null)} onSaved={() => { qc.invalidateQueries({ queryKey: ["admin-titles"] }); setEditing(null); }} upsert={upsert as never} />}
    </AdminPage>
  );
}