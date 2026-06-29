import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getTitleAdmin, upsertSeason, deleteSeason, upsertEpisode, deleteEpisode } from "@/lib/cms.functions";
import { AdminPage } from "@/components/sf/admin-shell";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/titles/$id")({
  component: TitleDetail,
  errorComponent: ({ error }) => <div className="p-12">{error.message}</div>,
  notFoundComponent: () => <div className="p-12">Not found</div>,
});

function TitleDetail() {
  const { id } = Route.useParams();
  const get = useServerFn(getTitleAdmin);
  const upsertS = useServerFn(upsertSeason);
  const delS = useServerFn(deleteSeason);
  const upsertE = useServerFn(upsertEpisode);
  const delE = useServerFn(deleteEpisode);
  const qc = useQueryClient();

  const { data } = useQuery({ queryKey: ["admin-title-detail", id], queryFn: () => get({ data: { id } } as never) as never });

  const d = data as { title: { id: string; title: string; kind: string } | null; seasons: Array<{ id: string; season_number: number; name: string | null; release_year: number | null }>; episodes: Array<{ id: string; season_id: string; episode_number: number; title: string; video_url: string | null; runtime_minutes: number | null }> } | undefined;

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-title-detail", id] });
  const addSeason = async () => { const n = (d?.seasons.length ?? 0) + 1; await upsertS({ data: { title_id: id, season_number: n, name: `Season ${n}` } } as never); refresh(); };

  const [editingEp, setEditingEp] = useState<{ season_id: string } | null>(null);
  const [epForm, setEpForm] = useState<{ id?: string; season_id: string; episode_number: number; title: string; video_url: string; runtime_minutes: number | null }>({ season_id: "", episode_number: 1, title: "", video_url: "", runtime_minutes: null });

  function startNewEp(season_id: string, next: number) {
    setEpForm({ season_id, episode_number: next, title: "", video_url: "", runtime_minutes: null });
    setEditingEp({ season_id });
  }

  return (
    <AdminPage title={d?.title?.title ?? "Title"} description={`Seasons & episodes (${d?.title?.kind ?? "—"})`} actions={
      <Link to="/admin/titles" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back</Link>
    }>
      <div className="mb-4 flex justify-end"><button onClick={addSeason} className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"><Plus className="h-4 w-4" /> Add season</button></div>
      <div className="space-y-6">
        {(d?.seasons ?? []).map((s) => {
          const eps = (d?.episodes ?? []).filter((e) => e.season_id === s.id);
          return (
            <div key={s.id} className="rounded-lg border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div className="font-semibold">Season {s.season_number} {s.name && `· ${s.name}`}</div>
                <div className="flex items-center gap-2">
                  <button onClick={() => startNewEp(s.id, eps.length + 1)} className="text-xs rounded-md bg-secondary px-3 py-1.5 font-medium">+ Add episode</button>
                  <button onClick={async () => { if (confirm("Delete season + episodes?")) { await delS({ data: { id: s.id } } as never); refresh(); } }} className="p-1.5 rounded hover:bg-destructive/20 text-destructive"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              <table className="w-full text-sm">
                <thead className="text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="text-left px-4 py-2">#</th><th className="text-left px-4 py-2">Title</th><th className="text-left px-4 py-2">Runtime</th><th className="text-left px-4 py-2">Video</th><th className="px-4 py-2"></th></tr></thead>
                <tbody>
                  {eps.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">No episodes yet.</td></tr>}
                  {eps.map((e) => (
                    <tr key={e.id} className="border-t border-border">
                      <td className="px-4 py-2">{e.episode_number}</td>
                      <td className="px-4 py-2">{e.title}</td>
                      <td className="px-4 py-2">{e.runtime_minutes ?? "—"}</td>
                      <td className="px-4 py-2 truncate max-w-[280px] text-xs text-muted-foreground">{e.video_url ?? "—"}</td>
                      <td className="px-4 py-2 text-right">
                        <button onClick={() => { setEpForm({ ...e, video_url: e.video_url ?? "", runtime_minutes: e.runtime_minutes }); setEditingEp({ season_id: s.id }); }} className="text-xs underline mr-3">Edit</button>
                        <button onClick={async () => { if (confirm("Delete episode?")) { await delE({ data: { id: e.id } } as never); refresh(); } }} className="p-1 rounded hover:bg-destructive/20 text-destructive inline-flex"><Trash2 className="h-3.5 w-3.5" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>

      {editingEp && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setEditingEp(null)}>
          <div className="bg-background rounded-lg border border-border w-full max-w-lg p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="text-lg font-semibold">{epForm.id ? "Edit episode" : "New episode"}</div>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">Episode #<input type="number" value={epForm.episode_number} onChange={(e) => setEpForm({ ...epForm, episode_number: Number(e.target.value) })} className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm" /></label>
              <label className="text-sm">Runtime<input type="number" value={epForm.runtime_minutes ?? ""} onChange={(e) => setEpForm({ ...epForm, runtime_minutes: e.target.value ? Number(e.target.value) : null })} className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm" /></label>
            </div>
            <label className="block text-sm">Title<input value={epForm.title} onChange={(e) => setEpForm({ ...epForm, title: e.target.value })} className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm" /></label>
            <label className="block text-sm">Video URL<input value={epForm.video_url} onChange={(e) => setEpForm({ ...epForm, video_url: e.target.value })} className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm" /></label>
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditingEp(null)} className="px-3 py-2 rounded-md bg-secondary text-sm">Cancel</button>
              <button onClick={async () => {
                const payload: Record<string, unknown> = { season_id: epForm.season_id, episode_number: epForm.episode_number, title: epForm.title };
                if (epForm.video_url) payload.video_url = epForm.video_url;
                if (epForm.runtime_minutes) payload.runtime_minutes = epForm.runtime_minutes;
                if (epForm.id) payload.id = epForm.id;
                await upsertE({ data: payload } as never); setEditingEp(null); refresh();
              }} className="px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold">Save</button>
            </div>
          </div>
        </div>
      )}
    </AdminPage>
  );
}