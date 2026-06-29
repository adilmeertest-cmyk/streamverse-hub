import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useDeferredValue } from "react";
import { searchTitles } from "@/lib/catalog";
import { Shell } from "@/components/sf/shell";
import { TitleCard } from "@/components/sf/title-card";
import { Search as SearchIcon } from "lucide-react";

export const Route = createFileRoute("/search")({
  head: () => ({ meta: [{ title: "Search — StreamFlix" }, { name: "description", content: "Search the StreamFlix catalog." }] }),
  component: SearchPage,
  errorComponent: ({ error }) => <Shell><div className="p-12">{error.message}</div></Shell>,
  notFoundComponent: () => <Shell><div className="p-12">Not found</div></Shell>,
});

function SearchPage() {
  const [q, setQ] = useState("");
  const dq = useDeferredValue(q);
  const { data, isFetching } = useQuery({
    queryKey: ["search", dq],
    queryFn: () => searchTitles(dq),
    enabled: dq.trim().length > 1,
  });
  return (
    <Shell>
      <div className="mx-auto max-w-[1200px] px-4 md:px-8 py-10">
        <h1 className="text-3xl md:text-4xl font-black tracking-tight">Search</h1>
        <div className="mt-6 flex items-center gap-3 rounded-lg bg-card border border-border px-4 py-3">
          <SearchIcon className="h-5 w-5 text-muted-foreground" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Search movies, series, dramas, actors…"
            className="w-full bg-transparent outline-none text-lg" />
          {isFetching && <span className="text-xs text-muted-foreground">Searching…</span>}
        </div>
        {dq.trim().length > 1 && (
          <div className="mt-8">
            {data?.length ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {data.map((t) => <TitleCard key={t.id} t={t} />)}
              </div>
            ) : (
              !isFetching && <p className="text-muted-foreground">No results for "{dq}".</p>
            )}
          </div>
        )}
      </div>
    </Shell>
  );
}