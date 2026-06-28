import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  PLATFORMS,
  type DownloadPlatform,
  listAllDownloads,
  upsertDownload,
  deleteDownload,
  createUploadUrl,
  getDownloadStats,
} from "@/lib/downloads.functions";
import { AdminPage } from "@/components/sf/admin-shell";
import { Trash2, Upload, Plus, Power } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/downloads")({
  component: DownloadsAdmin,
  errorComponent: ({ error }) => <div className="p-12">{error.message}</div>,
  notFoundComponent: () => <div className="p-12">Not found</div>,
});

type Row = {
  id: string;
  platform: DownloadPlatform;
  version: string;
  filename: string;
  filesize: number | null;
  url: string;
  storage_path: string | null;
  checksum: string | null;
  release_date: string;
  release_notes: string | null;
  downloads_count: number;
  is_active: boolean;
};

const PLATFORM_LABEL: Record<DownloadPlatform, string> = {
  windows: "Windows",
  macos: "macOS",
  linux: "Linux",
  android: "Android",
  ios: "iOS / App Store",
  android_tv: "Android TV",
  smart_tv: "Smart TV",
};

function fmtBytes(n: number | null | undefined) {
  if (!n) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v < 10 ? 1 : 0)} ${units[i]}`;
}

function DownloadsAdmin() {
  const list = useServerFn(listAllDownloads);
  const stats = useServerFn(getDownloadStats);
  const del = useServerFn(deleteDownload);
  const upsert = useServerFn(upsertDownload);
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Row> | null>(null);

  const { data: rows, isLoading } = useQuery({
    queryKey: ["admin-downloads"],
    queryFn: () => list() as unknown as Promise<Row[]>,
  });
  const { data: statsData } = useQuery({ queryKey: ["admin-downloads-stats"], queryFn: () => stats() as unknown as Promise<{ total: number; byPlatform: Record<string, number>; count: number }> });

  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } } as never),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-downloads"] }); qc.invalidateQueries({ queryKey: ["admin-downloads-stats"] }); },
  });
  const toggleMut = useMutation({
    mutationFn: (r: Row) => upsert({ data: { id: r.id, platform: r.platform, version: r.version, filename: r.filename, url: r.url, storage_path: r.storage_path, checksum: r.checksum, release_notes: r.release_notes, filesize: r.filesize, is_active: !r.is_active } } as never),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-downloads"] }),
  });

  return (
    <AdminPage
      title="App Downloads"
      description="Upload and manage installer files for every platform. Every button on the public /download page is wired to these records."
      actions={
        <button onClick={() => setEditing({ platform: "windows", version: "1.0.0", is_active: true })} className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">
          <Plus className="h-4 w-4" /> New release
        </button>
      }
    >
      <div className="grid gap-3 sm:grid-cols-3 mb-6">
        <StatCard label="Total downloads" value={statsData?.total ?? 0} />
        <StatCard label="Active builds" value={statsData?.count ?? 0} />
        <StatCard label="Platforms covered" value={Object.keys(statsData?.byPlatform ?? {}).length} />
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-2.5">Platform</th>
              <th className="text-left px-4 py-2.5">Version</th>
              <th className="text-left px-4 py-2.5">File</th>
              <th className="text-left px-4 py-2.5">Size</th>
              <th className="text-left px-4 py-2.5">Downloads</th>
              <th className="text-left px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Loading…</td></tr>}
            {!isLoading && (rows ?? []).length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No builds yet. Click “New release” to upload your first installer.</td></tr>}
            {(rows ?? []).map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-4 py-2.5 font-medium">{PLATFORM_LABEL[r.platform]}</td>
                <td className="px-4 py-2.5">{r.version}</td>
                <td className="px-4 py-2.5"><div className="truncate max-w-[260px]">{r.filename}</div><a href={`/api/public/download/${r.id}`} className="text-xs text-primary hover:underline">Test download</a></td>
                <td className="px-4 py-2.5">{fmtBytes(r.filesize)}</td>
                <td className="px-4 py-2.5">{r.downloads_count}</td>
                <td className="px-4 py-2.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${r.is_active ? "bg-emerald-500/15 text-emerald-300" : "bg-yellow-500/15 text-yellow-300"}`}>{r.is_active ? "Active" : "Disabled"}</span>
                </td>
                <td className="px-4 py-2.5 text-right whitespace-nowrap">
                  <button onClick={() => toggleMut.mutate(r)} className="p-1.5 rounded hover:bg-secondary" title={r.is_active ? "Disable" : "Enable"}><Power className="h-4 w-4" /></button>
                  <button onClick={() => setEditing(r)} className="p-1.5 rounded hover:bg-secondary text-xs">Edit</button>
                  <button onClick={() => { if (confirm(`Delete ${PLATFORM_LABEL[r.platform]} ${r.version}?`)) delMut.mutate(r.id); }} className="p-1.5 rounded hover:bg-destructive/20 text-destructive"><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <DownloadEditor
          row={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); qc.invalidateQueries({ queryKey: ["admin-downloads"] }); qc.invalidateQueries({ queryKey: ["admin-downloads-stats"] }); }}
        />
      )}
    </AdminPage>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value.toLocaleString()}</div>
    </div>
  );
}

function DownloadEditor({ row, onClose, onSaved }: { row: Partial<Row>; onClose: () => void; onSaved: () => void }) {
  const upsert = useServerFn(upsertDownload);
  const createUrl = useServerFn(createUploadUrl);
  const [form, setForm] = useState<Partial<Row>>(row);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      let url = form.url ?? "";
      let storage_path = form.storage_path ?? null;
      let filename = form.filename ?? file?.name ?? "";
      let filesize: number | null = form.filesize ?? null;

      if (file) {
        const signed = (await createUrl({ data: { platform: form.platform as DownloadPlatform, version: form.version!, filename: file.name } } as never)) as unknown as { path: string; token: string };
        const { error: upErr } = await supabase.storage
          .from("app-downloads")
          .uploadToSignedUrl(signed.path, signed.token, file, { upsert: true, contentType: file.type || "application/octet-stream" });
        if (upErr) throw upErr;
        storage_path = signed.path;
        filename = file.name;
        filesize = file.size;
        url = `https://placeholder/${signed.path}`; // not used — redirect serves a signed URL from storage_path
      }
      if (!url) throw new Error("Provide an external URL or upload a file.");

      await upsert({
        data: {
          id: form.id,
          platform: form.platform as DownloadPlatform,
          version: form.version!,
          filename,
          filesize,
          url,
          storage_path,
          checksum: form.checksum ?? null,
          release_notes: form.release_notes ?? null,
          is_active: form.is_active ?? true,
        },
      } as never);
      onSaved();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Failed to save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 backdrop-blur-sm p-4" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit} className="w-full max-w-lg rounded-xl border border-border bg-card p-6 space-y-4">
        <h3 className="text-lg font-bold">{form.id ? "Edit release" : "New release"}</h3>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Platform">
            <select value={form.platform ?? "windows"} onChange={(e) => setForm({ ...form, platform: e.target.value as DownloadPlatform })} className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm">
              {PLATFORMS.map((p) => <option key={p} value={p}>{PLATFORM_LABEL[p]}</option>)}
            </select>
          </Field>
          <Field label="Version"><Input value={form.version ?? ""} onChange={(v) => setForm({ ...form, version: v })} required /></Field>
        </div>
        <Field label="Upload installer (optional — leave empty to use external URL)">
          <label className="flex items-center gap-2 rounded-md border border-dashed border-border px-3 py-3 text-sm cursor-pointer hover:bg-secondary/40">
            <Upload className="h-4 w-4" />
            <span className="truncate">{file?.name ?? "Choose file…"}</span>
            <input type="file" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
        </Field>
        <Field label="External download URL (used if no file uploaded — e.g. App Store link for iOS)">
          <Input value={form.url ?? ""} onChange={(v) => setForm({ ...form, url: v })} placeholder="https://apps.apple.com/app/idXXXXXXX" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Filename"><Input value={form.filename ?? ""} onChange={(v) => setForm({ ...form, filename: v })} placeholder="StreamFlix-Setup.exe" /></Field>
          <Field label="Checksum (SHA-256, optional)"><Input value={form.checksum ?? ""} onChange={(v) => setForm({ ...form, checksum: v })} /></Field>
        </div>
        <Field label="Release notes">
          <textarea value={form.release_notes ?? ""} onChange={(e) => setForm({ ...form, release_notes: e.target.value })} rows={4} className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm" />
        </Field>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active ?? true} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Active</label>
        {err && <div className="text-sm text-destructive">{err}</div>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-md px-3 py-2 text-sm hover:bg-secondary">Cancel</button>
          <button type="submit" disabled={busy} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">{busy ? "Saving…" : "Save release"}</button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
function Input({ value, onChange, ...rest }: { value: string; onChange: (v: string) => void } & React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...rest} value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm" />;
}