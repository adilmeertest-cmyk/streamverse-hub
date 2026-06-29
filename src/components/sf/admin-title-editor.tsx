import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { getTitleAdmin, listCategoriesAdmin, listGenresAdmin, setTitleGenres } from "@/lib/cms.functions";
import { X } from "lucide-react";

type Props = {
  id?: string;
  onClose: () => void;
  onSaved: () => void;
  upsert: (args: { data: Record<string, unknown> }) => Promise<{ id: string }>;
};

const KINDS = ["movie", "series", "drama", "cartoon", "documentary"] as const;

export function TitleEditor({ id, onClose, onSaved, upsert }: Props) {
  const getTitle = useServerFn(getTitleAdmin);
  const listCats = useServerFn(listCategoriesAdmin);
  const listGenres = useServerFn(listGenresAdmin);
  const setGenresFn = useServerFn(setTitleGenres);

  const { data: existing } = useQuery({
    queryKey: ["admin-title", id],
    queryFn: () => id ? getTitle({ data: { id } } as never) : Promise.resolve(null) as never,
    enabled: Boolean(id),
  });
  const { data: cats } = useQuery({ queryKey: ["admin-cats-mini"], queryFn: () => listCats() as never });
  const { data: genres } = useQuery({ queryKey: ["admin-genres-mini"], queryFn: () => listGenres() as never });

  const [form, setForm] = useState<Record<string, unknown>>({
    slug: "", kind: "movie", title: "", tagline: "", synopsis: "",
    release_year: null, runtime_minutes: null, age_rating: "",
    poster_url: "", backdrop_url: "", trailer_url: "", video_url: "",
    is_premium: false, is_published: false, is_coming_soon: false, is_featured: false, is_trending: false,
    cast_list: [], directors: [], category_id: null,
  });
  const [genreIds, setGenreIds] = useState<string[]>([]);

  useEffect(() => {
    const t = (existing as { title?: Record<string, unknown> } | null)?.title;
    if (t) setForm({ ...t });
    const gids = (existing as { genreIds?: string[] } | null)?.genreIds;
    if (gids) setGenreIds(gids);
  }, [existing]);

  const mut = useMutation({
    mutationFn: async () => {
      const cleaned: Record<string, unknown> = {};
      const keep = ["id","slug","kind","title","tagline","synopsis","release_year","runtime_minutes","age_rating","poster_url","backdrop_url","trailer_url","video_url","is_premium","is_published","is_coming_soon","is_featured","is_trending","cast_list","directors","category_id"];
      for (const k of keep) {
        const v = (form as Record<string, unknown>)[k];
        if (v === "" || v === undefined) continue;
        cleaned[k] = v;
      }
      if (id) cleaned.id = id;
      const res = await upsert({ data: cleaned });
      await setGenresFn({ data: { titleId: res.id, genreIds } } as never);
      return res;
    },
    onSuccess: onSaved,
  });

  function update<K extends string>(k: K, v: unknown) { setForm((f) => ({ ...f, [k]: v })); }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-4">
      <div className="w-full max-w-3xl rounded-lg border border-border bg-background my-8">
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="text-lg font-semibold">{id ? "Edit title" : "New title"}</div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-secondary"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-5 grid gap-4 md:grid-cols-2">
          <Field label="Title"><input className={inputCls} value={form.title as string} onChange={(e) => update("title", e.target.value)} /></Field>
          <Field label="Slug"><input className={inputCls} value={form.slug as string} onChange={(e) => update("slug", e.target.value)} placeholder="my-movie" /></Field>
          <Field label="Kind"><select className={inputCls} value={form.kind as string} onChange={(e) => update("kind", e.target.value)}>{KINDS.map((k) => <option key={k} value={k}>{k}</option>)}</select></Field>
          <Field label="Category">
            <select className={inputCls} value={(form.category_id as string) ?? ""} onChange={(e) => update("category_id", e.target.value || null)}>
              <option value="">— None —</option>
              {(((cats as unknown) as Array<{ id: string; name: string }> | undefined) ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Tagline" wide><input className={inputCls} value={(form.tagline as string) ?? ""} onChange={(e) => update("tagline", e.target.value)} /></Field>
          <Field label="Synopsis" wide><textarea rows={4} className={inputCls} value={(form.synopsis as string) ?? ""} onChange={(e) => update("synopsis", e.target.value)} /></Field>
          <Field label="Release year"><input type="number" className={inputCls} value={(form.release_year as number) ?? ""} onChange={(e) => update("release_year", e.target.value ? Number(e.target.value) : null)} /></Field>
          <Field label="Runtime (min)"><input type="number" className={inputCls} value={(form.runtime_minutes as number) ?? ""} onChange={(e) => update("runtime_minutes", e.target.value ? Number(e.target.value) : null)} /></Field>
          <Field label="Age rating"><input className={inputCls} value={(form.age_rating as string) ?? ""} onChange={(e) => update("age_rating", e.target.value)} placeholder="PG-13" /></Field>
          <Field label="Poster URL"><input className={inputCls} value={(form.poster_url as string) ?? ""} onChange={(e) => update("poster_url", e.target.value)} /></Field>
          <Field label="Backdrop URL"><input className={inputCls} value={(form.backdrop_url as string) ?? ""} onChange={(e) => update("backdrop_url", e.target.value)} /></Field>
          <Field label="Trailer URL"><input className={inputCls} value={(form.trailer_url as string) ?? ""} onChange={(e) => update("trailer_url", e.target.value)} /></Field>
          <Field label="Video URL (mp4/m3u8)" wide><input className={inputCls} value={(form.video_url as string) ?? ""} onChange={(e) => update("video_url", e.target.value)} /></Field>
          <Field label="Cast (comma separated)" wide><input className={inputCls} value={Array.isArray(form.cast_list) ? (form.cast_list as string[]).join(", ") : ""} onChange={(e) => update("cast_list", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} /></Field>
          <Field label="Directors (comma separated)" wide><input className={inputCls} value={Array.isArray(form.directors) ? (form.directors as string[]).join(", ") : ""} onChange={(e) => update("directors", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} /></Field>
          <Field label="Genres" wide>
            <div className="flex flex-wrap gap-1.5">
              {(((genres as unknown) as Array<{ id: string; name: string }> | undefined) ?? []).map((g) => {
                const on = genreIds.includes(g.id);
                return <button type="button" key={g.id} onClick={() => setGenreIds((cur) => on ? cur.filter((x) => x !== g.id) : [...cur, g.id])} className={`text-xs px-2.5 py-1 rounded-full ${on ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>{g.name}</button>;
              })}
            </div>
          </Field>
          <Field label="Flags" wide>
            <div className="flex flex-wrap gap-3 text-sm">
              {[["is_published","Published"],["is_premium","Premium"],["is_coming_soon","Coming soon"],["is_featured","Featured"],["is_trending","Trending"]].map(([k,l]) => (
                <label key={k} className="inline-flex items-center gap-2"><input type="checkbox" checked={Boolean((form as Record<string, unknown>)[k])} onChange={(e) => update(k, e.target.checked)} /> {l}</label>
              ))}
            </div>
          </Field>
        </div>
        <div className="border-t border-border p-4 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-md bg-secondary text-sm font-medium">Cancel</button>
          <button disabled={mut.isPending} onClick={() => mut.mutate()} className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold">{mut.isPending ? "Saving…" : "Save"}</button>
        </div>
        {mut.error && <div className="px-5 pb-4 text-sm text-destructive">{(mut.error as Error).message}</div>}
      </div>
    </div>
  );
}

const inputCls = "w-full rounded-md border border-border bg-card px-3 py-2 text-sm";
function Field({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return <label className={`block ${wide ? "md:col-span-2" : ""}`}><div className="text-xs font-medium text-muted-foreground mb-1">{label}</div>{children}</label>;
}