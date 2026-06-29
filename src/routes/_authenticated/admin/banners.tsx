import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { listBannersAdmin, upsertBanner, deleteBanner } from "@/lib/cms.functions";
import { AdminPage } from "@/components/sf/admin-shell";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/banners")({
  component: BannersPage,
  errorComponent: ({ error }) => <div className="p-12">{error.message}</div>,
  notFoundComponent: () => <div className="p-12">Not found</div>,
});

function BannersPage() {
  const list = useServerFn(listBannersAdmin);
  const upsert = useServerFn(upsertBanner);
  const del = useServerFn(deleteBanner);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin-banners"], queryFn: () => list() as never });
  const rows = ((data as unknown) as Array<{ id: string; headline: string; subhead: string | null; image_url: string; is_active: boolean; display_order: number; cta_label: string | null; cta_href: string | null }> | undefined) ?? [];
  const [form, setForm] = useState({ headline: "", subhead: "", image_url: "", cta_label: "", cta_href: "", display_order: 0, is_active: true });
  const mut = useMutation({
    mutationFn: () => upsert({ data: { ...form, subhead: form.subhead || null, cta_label: form.cta_label || null, cta_href: form.cta_href || null } } as never),
    onSuccess: () => { setForm({ headline: "", subhead: "", image_url: "", cta_label: "", cta_href: "", display_order: 0, is_active: true }); qc.invalidateQueries({ queryKey: ["admin-banners"] }); },
  });
  const delMut = useMutation({ mutationFn: (id: string) => del({ data: { id } } as never), onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-banners"] }) });

  return (
    <AdminPage title="Banners" description="Hero banners shown on the homepage.">
      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        <div className="space-y-3">
          {rows.map((b) => (
            <div key={b.id} className="rounded-lg border border-border bg-card overflow-hidden flex">
              <img src={b.image_url} alt="" className="w-40 h-24 object-cover" />
              <div className="flex-1 p-3">
                <div className="font-semibold">{b.headline}</div>
                <div className="text-xs text-muted-foreground line-clamp-2">{b.subhead}</div>
                <div className="mt-1 text-xs text-muted-foreground">Order {b.display_order} · {b.is_active ? "active" : "inactive"}</div>
              </div>
              <button onClick={() => delMut.mutate(b.id)} className="p-3 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
          {rows.length === 0 && <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">No banners yet.</div>}
        </div>
        <div className="rounded-lg border border-border bg-card p-4 space-y-3 h-fit">
          <div className="font-semibold">New banner</div>
          <input value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} placeholder="Headline" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          <textarea value={form.subhead} onChange={(e) => setForm({ ...form, subhead: e.target.value })} placeholder="Subhead" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          <input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="Image URL" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          <input value={form.cta_label} onChange={(e) => setForm({ ...form, cta_label: e.target.value })} placeholder="CTA label" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          <input value={form.cta_href} onChange={(e) => setForm({ ...form, cta_href: e.target.value })} placeholder="CTA href (/title/...)" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          <div className="flex gap-2">
            <input type="number" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: Number(e.target.value) })} placeholder="Order" className="w-24 rounded-md border border-border bg-background px-3 py-2 text-sm" />
            <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Active</label>
          </div>
          <button onClick={() => mut.mutate()} disabled={mut.isPending || !form.headline || !form.image_url} className="w-full rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">Add banner</button>
        </div>
      </div>
    </AdminPage>
  );
}