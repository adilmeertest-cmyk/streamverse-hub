import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { listCategoriesAdmin, upsertCategory, deleteCategory, listGenresAdmin, upsertGenre, deleteGenre } from "@/lib/cms.functions";
import { AdminPage } from "@/components/sf/admin-shell";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/taxonomy")({
  component: Taxonomy,
  errorComponent: ({ error }) => <div className="p-12">{error.message}</div>,
  notFoundComponent: () => <div className="p-12">Not found</div>,
});

function Taxonomy() {
  const [tab, setTab] = useState<"categories" | "genres">("categories");
  return (
    <AdminPage title="Taxonomy" description="Categories and genres for organising content.">
      <div className="mb-4 inline-flex rounded-md border border-border p-0.5 bg-card">
        {(["categories", "genres"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 text-sm font-medium rounded ${tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{t}</button>
        ))}
      </div>
      {tab === "categories" ? <CategoriesPane /> : <GenresPane />}
    </AdminPage>
  );
}

function CategoriesPane() {
  const list = useServerFn(listCategoriesAdmin);
  const upsert = useServerFn(upsertCategory);
  const del = useServerFn(deleteCategory);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin-cats"], queryFn: () => list() as never });
  const rows = ((data as unknown) as Array<{ id: string; slug: string; name: string; description: string | null; display_order: number }> | undefined) ?? [];
  const [form, setForm] = useState({ slug: "", name: "", description: "", display_order: 0 });
  const mut = useMutation({ mutationFn: () => upsert({ data: { ...form, description: form.description || null } } as never), onSuccess: () => { setForm({ slug: "", name: "", description: "", display_order: 0 }); qc.invalidateQueries({ queryKey: ["admin-cats"] }); } });
  const delMut = useMutation({ mutationFn: (id: string) => del({ data: { id } } as never), onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-cats"] }) });
  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-6">
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-xs uppercase text-muted-foreground"><tr><th className="text-left px-4 py-2">Name</th><th className="text-left px-4 py-2">Slug</th><th className="text-left px-4 py-2">Order</th><th></th></tr></thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="border-t border-border">
                <td className="px-4 py-2 font-medium">{c.name}</td><td className="px-4 py-2 text-muted-foreground">{c.slug}</td><td className="px-4 py-2">{c.display_order}</td>
                <td className="px-4 py-2 text-right"><button onClick={() => delMut.mutate(c.id)} className="p-1.5 rounded hover:bg-destructive/20 text-destructive"><Trash2 className="h-4 w-4" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="rounded-lg border border-border bg-card p-4 space-y-3 h-fit">
        <div className="font-semibold">New category</div>
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
        <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="slug" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
        <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description (optional)" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
        <input type="number" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: Number(e.target.value) })} placeholder="Order" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
        <button onClick={() => mut.mutate()} disabled={mut.isPending} className="w-full inline-flex justify-center items-center gap-1 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"><Plus className="h-4 w-4" /> Add</button>
      </div>
    </div>
  );
}

function GenresPane() {
  const list = useServerFn(listGenresAdmin);
  const upsert = useServerFn(upsertGenre);
  const del = useServerFn(deleteGenre);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin-genres"], queryFn: () => list() as never });
  const rows = ((data as unknown) as Array<{ id: string; slug: string; name: string }> | undefined) ?? [];
  const [form, setForm] = useState({ slug: "", name: "" });
  const mut = useMutation({ mutationFn: () => upsert({ data: form } as never), onSuccess: () => { setForm({ slug: "", name: "" }); qc.invalidateQueries({ queryKey: ["admin-genres"] }); } });
  const delMut = useMutation({ mutationFn: (id: string) => del({ data: { id } } as never), onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-genres"] }) });
  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-6">
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-xs uppercase text-muted-foreground"><tr><th className="text-left px-4 py-2">Name</th><th className="text-left px-4 py-2">Slug</th><th></th></tr></thead>
          <tbody>
            {rows.map((g) => (
              <tr key={g.id} className="border-t border-border">
                <td className="px-4 py-2 font-medium">{g.name}</td><td className="px-4 py-2 text-muted-foreground">{g.slug}</td>
                <td className="px-4 py-2 text-right"><button onClick={() => delMut.mutate(g.id)} className="p-1.5 rounded hover:bg-destructive/20 text-destructive"><Trash2 className="h-4 w-4" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="rounded-lg border border-border bg-card p-4 space-y-3 h-fit">
        <div className="font-semibold">New genre</div>
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
        <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="slug" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
        <button onClick={() => mut.mutate()} disabled={mut.isPending} className="w-full inline-flex justify-center items-center gap-1 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"><Plus className="h-4 w-4" /> Add</button>
      </div>
    </div>
  );
}