import { TitleCard } from "./title-card";
import type { Title } from "@/lib/types";

export function BrowseGrid({ heading, titles }: { heading: string; titles: Title[] }) {
  return (
    <div className="mx-auto max-w-[1480px] px-4 md:px-8 py-10">
      <h1 className="text-3xl md:text-4xl font-black tracking-tight">{heading}</h1>
      <p className="mt-2 text-muted-foreground">{titles.length} titles</p>
      {titles.length === 0 ? (
        <div className="mt-16 text-center text-muted-foreground">Nothing here yet.</div>
      ) : (
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {titles.map((t) => <TitleCard key={t.id} t={t} />)}
        </div>
      )}
    </div>
  );
}