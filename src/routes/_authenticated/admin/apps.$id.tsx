import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminPage } from "@/components/sf/admin-shell";
import { Plus, Trash2, Pencil, Upload, ArrowLeft, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import type { AppPlatform, AppPlatformFile, App } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/admin/apps/$id")({
  component: AppPlatformsAdmin,
  errorComponent: ({ error }) => <div className="p-12">{error.message}</div>,
  notFoundComponent: () => <div className="p-12">App not found</div>,
});

function AppPlatformsAdmin() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<{ id?: string } | null>(null);
  const [formData, setFormData] = useState({
    platform: "android" as AppPlatform,
    file_url: "",
    file_size: "",
    file_name: "",
    version: "1.0.0",
    min_os_version: "",
    changelog: "",
    is_active: true,
  });

  const { data: app, isLoading: appLoading } = useQuery({
    queryKey: ["admin-app", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("apps").select("*").eq("id", id).single();
      if (error) throw error;
      return data as App;
    },
  });

  const { data: platforms, isLoading: platformsLoading } = useQuery({
    queryKey: ["admin-app-platforms", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("app_platforms").select("*").eq("app_id", id).order("platform");
      if (error) throw error;
      return data as AppPlatformFile[];
    },
    enabled: !!id,
  });

  const upsertMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        ...data,
        app_id: id,
      };
      if (data.id) {
        const { error } = await supabase.from("app_platforms").update(payload).eq("id", data.id);
        if (error) throw error;
      } else {
        delete payload.id;
        const { error } = await supabase.from("app_platforms").insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-app-platforms", id] });
      toast.success("Platform saved successfully");
      setEditing(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to save platform");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (platformId: string) => {
      const { error } = await supabase.from("app_platforms").delete().eq("id", platformId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-app-platforms", id] });
      toast.success("Platform deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete platform");
    },
  });

  const handleSave = () => {
    if (!formData.platform || !formData.file_url || !formData.file_size || !formData.file_name) {
      toast.error("All fields are required");
      return;
    }
    upsertMutation.mutate({
      ...formData,
      id: editing?.id,
    });
  };

  const handleEdit = (platform: AppPlatformFile) => {
    setFormData({
      platform: platform.platform,
      file_url: platform.file_url,
      file_size: platform.file_size,
      file_name: platform.file_name,
      version: platform.version,
      min_os_version: platform.min_os_version || "",
      changelog: platform.changelog || "",
      is_active: platform.is_active,
    });
    setEditing({ id: platform.id });
  };

  const handleNew = () => {
    setFormData({
      platform: "android",
      file_url: "",
      file_size: "",
      file_name: "",
      version: app?.version || "1.0.0",
      min_os_version: "",
      changelog: "",
      is_active: true,
    });
    setEditing({});
  };

  if (appLoading) {
    return <AdminPage title="Loading..." description="" actions={null}><div className="p-12">Loading...</div></AdminPage>;
  }

  const PLATFORM_OPTIONS: { value: AppPlatform; label: string }[] = [
    { value: "android", label: "Android (.apk)" },
    { value: "windows", label: "Windows (.exe)" },
    { value: "macos", label: "macOS (.dmg)" },
    { value: "linux", label: "Linux (.AppImage/.deb)" },
    { value: "ios", label: "iPhone/iPad (App Store)" },
    { value: "smart_tv", label: "Smart TV" },
  ];

  return (
    <AdminPage 
      title={`App Platforms: ${app?.name}`} 
      description="Manage platform-specific downloads for this app." 
      actions={
        <div className="flex gap-2">
          <Link to="/admin/apps" className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-semibold hover:bg-secondary">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <button onClick={handleNew} className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">
            <Plus className="h-4 w-4" /> Add Platform
          </button>
        </div>
      }
    >
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-2.5">Platform</th>
              <th className="text-left px-4 py-2.5">File</th>
              <th className="text-left px-4 py-2.5">Size</th>
              <th className="text-left px-4 py-2.5">Version</th>
              <th className="text-left px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {platformsLoading && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Loading…</td></tr>}
            {!platformsLoading && platforms?.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No platforms configured yet.</td></tr>}
            {platforms?.map((platform) => (
              <tr key={platform.id} className="border-t border-border">
                <td className="px-4 py-2.5 capitalize">{platform.platform}</td>
                <td className="px-4 py-2.5">
                  <div className="font-medium">{platform.file_name}</div>
                  <div className="text-xs text-muted-foreground truncate max-w-xs">{platform.file_url}</div>
                </td>
                <td className="px-4 py-2.5">{platform.file_size}</td>
                <td className="px-4 py-2.5">{platform.version}</td>
                <td className="px-4 py-2.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${platform.is_active ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"}`}>
                    {platform.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <button onClick={() => handleEdit(platform)} className="p-1.5 rounded hover:bg-secondary"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => { if (confirm(`Delete ${platform.platform} platform?`)) deleteMutation.mutate(platform.id); }} className="p-1.5 rounded hover:bg-destructive/20 text-destructive"><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit Platform" : "Add Platform"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="platform">Platform *</Label>
              <Select value={formData.platform} onValueChange={(value: AppPlatform) => setFormData({ ...formData, platform: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORM_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="file_url">File URL *</Label>
              <Input id="file_url" value={formData.file_url} onChange={(e) => setFormData({ ...formData, file_url: e.target.value })} placeholder="https://example.com/app.apk" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="file_name">File Name *</Label>
                <Input id="file_name" value={formData.file_name} onChange={(e) => setFormData({ ...formData, file_name: e.target.value })} placeholder="app-v1.0.0.apk" />
              </div>
              <div>
                <Label htmlFor="file_size">File Size *</Label>
                <Input id="file_size" value={formData.file_size} onChange={(e) => setFormData({ ...formData, file_size: e.target.value })} placeholder="42 MB" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="version">Version *</Label>
                <Input id="version" value={formData.version} onChange={(e) => setFormData({ ...formData, version: e.target.value })} placeholder="1.0.0" />
              </div>
              <div>
                <Label htmlFor="min_os_version">Min OS Version</Label>
                <Input id="min_os_version" value={formData.min_os_version} onChange={(e) => setFormData({ ...formData, min_os_version: e.target.value })} placeholder="Android 8.0+" />
              </div>
            </div>
            <div>
              <Label htmlFor="changelog">Changelog</Label>
              <Textarea id="changelog" value={formData.changelog} onChange={(e) => setFormData({ ...formData, changelog: e.target.value })} placeholder="What's new in this version" rows={4} />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="is_active" checked={formData.is_active} onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked as boolean })} />
              <Label htmlFor="is_active">Active</Label>
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
