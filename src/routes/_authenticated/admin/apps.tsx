import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminPage } from "@/components/sf/admin-shell";
import { Plus, Search, Trash2, Pencil, Upload, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import type { App, AppPlatform } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/admin/apps")({
  component: AppsAdmin,
  errorComponent: ({ error }) => <div className="p-12">{error.message}</div>,
  notFoundComponent: () => <div className="p-12">Not found</div>,
});

function AppsAdmin() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<{ id?: string } | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    version: "1.0.0",
    developer: "",
    category: "",
    icon_url: "",
    is_published: false,
    is_featured: false,
  });

  const { data: apps, isLoading } = useQuery({
    queryKey: ["admin-apps", q],
    queryFn: async () => {
      let query = supabase.from("apps").select("*").order("created_at", { ascending: false });
      if (q) {
        query = query.or(`name.ilike.%${q}%,description.ilike.%${q}%,developer.ilike.%${q}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as App[];
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async (data: any) => {
      if (data.id) {
        const { error } = await supabase.from("apps").update(data).eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("apps").insert([data]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-apps"] });
      toast.success("App saved successfully");
      setEditing(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to save app");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("apps").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-apps"] });
      toast.success("App deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete app");
    },
  });

  const handleSave = () => {
    if (!formData.name || !formData.slug) {
      toast.error("Name and slug are required");
      return;
    }
    upsertMutation.mutate({
      ...formData,
      id: editing?.id,
    });
  };

  const handleEdit = (app: App) => {
    setFormData({
      name: app.name,
      slug: app.slug,
      description: app.description || "",
      version: app.version,
      developer: app.developer || "",
      category: app.category || "",
      icon_url: app.icon_url || "",
      is_published: app.is_published,
      is_featured: app.is_featured,
    });
    setEditing({ id: app.id });
  };

  const handleNew = () => {
    setFormData({
      name: "",
      slug: "",
      description: "",
      version: "1.0.0",
      developer: "",
      category: "",
      icon_url: "",
      is_published: false,
      is_featured: false,
    });
    setEditing({});
  };

  return (
    <AdminPage title="Apps" description="Manage downloadable applications." actions={
      <button onClick={handleNew} className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">
        <Plus className="h-4 w-4" /> New App
      </button>
    }>
      <div className="mb-4 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search apps…" className="w-full rounded-md border border-border bg-card px-9 py-2 text-sm" />
      </div>
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-2.5">App</th>
              <th className="text-left px-4 py-2.5">Version</th>
              <th className="text-left px-4 py-2.5">Developer</th>
              <th className="text-left px-4 py-2.5">Downloads</th>
              <th className="text-left px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Loading…</td></tr>}
            {!isLoading && apps?.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No apps.</td></tr>}
            {apps?.map((app) => (
              <tr key={app.id} className="border-t border-border">
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    {app.icon_url && <img src={app.icon_url} alt="" className="h-8 w-8 rounded object-cover" />}
                    <div>
                      <div className="font-medium">{app.name}</div>
                      <div className="text-xs text-muted-foreground">/{app.slug}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-2.5">{app.version}</td>
                <td className="px-4 py-2.5">{app.developer || "—"}</td>
                <td className="px-4 py-2.5">{app.download_count.toLocaleString()}</td>
                <td className="px-4 py-2.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${app.is_published ? "bg-emerald-500/15 text-emerald-300" : "bg-yellow-500/15 text-yellow-300"}`}>
                    {app.is_published ? "Published" : "Draft"}
                  </span>
                  {app.is_featured && <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary">Featured</span>}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <Link to="/admin/apps/$id" params={{ id: app.id }} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mr-3">
                    <Package className="h-3 w-3" /> Platforms
                  </Link>
                  <button onClick={() => handleEdit(app)} className="p-1.5 rounded hover:bg-secondary"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => { if (confirm(`Delete "${app.name}"?`)) deleteMutation.mutate(app.id); }} className="p-1.5 rounded hover:bg-destructive/20 text-destructive"><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit App" : "New App"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="App name" />
              </div>
              <div>
                <Label htmlFor="slug">Slug *</Label>
                <Input id="slug" value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })} placeholder="app-slug" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="version">Version</Label>
                <Input id="version" value={formData.version} onChange={(e) => setFormData({ ...formData, version: e.target.value })} placeholder="1.0.0" />
              </div>
              <div>
                <Label htmlFor="developer">Developer</Label>
                <Input id="developer" value={formData.developer} onChange={(e) => setFormData({ ...formData, developer: e.target.value })} placeholder="Developer name" />
              </div>
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Input id="category" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} placeholder="Entertainment, Productivity, etc." />
            </div>
            <div>
              <Label htmlFor="icon_url">Icon URL</Label>
              <Input id="icon_url" value={formData.icon_url} onChange={(e) => setFormData({ ...formData, icon_url: e.target.value })} placeholder="https://example.com/icon.png" />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="App description" rows={4} />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Checkbox id="is_published" checked={formData.is_published} onCheckedChange={(checked) => setFormData({ ...formData, is_published: checked as boolean })} />
                <Label htmlFor="is_published">Published</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="is_featured" checked={formData.is_featured} onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked as boolean })} />
                <Label htmlFor="is_featured">Featured</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={upsertMutation.isPending}>
              {upsertMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
}
