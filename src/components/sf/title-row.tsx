import type { Title } from "@/lib/types";
import { TitleCard } from "./title-card";
import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function TitleRow({ heading, titles, loading }: { heading: string; titles: Title[]; loading?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  if (!loading && !titles?.length) return null;
  const scroll = (dir: number) => ref.current?.scrollBy({ left: dir * 600, behavior: "smooth" });
  return (
    <section className="px-4 md:px-8 mt-10">
      <h2 className="mb-3 text-lg md:text-xl font-bold tracking-tight text-foreground">{heading}</h2>
      <div className="group relative">
        <button
          onClick={() => scroll(-1)}
          className="absolute left-0 top-1/2 z-10 -translate-y-1/2 hidden md:flex h-12 w-9 items-center justify-center rounded-r-md bg-black/70 text-white opacity-0 group-hover:opacity-100 transition"
          aria-label="Scroll left"
        ><ChevronLeft /></button>
        <div ref={ref} className="sf-row flex gap-3 overflow-x-auto scroll-smooth pb-2">
          {loading
            ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="w-[160px] sm:w-[180px] md:w-[200px] shrink-0">
                  <Skeleton className="aspect-[2/3] w-full rounded-lg" />
                  <Skeleton className="mt-2 h-4 w-3/4" />
                </div>
              ))
            : titles.map((t) => <TitleCard key={t.id} t={t} />)}
        </div>
        <button
          onClick={() => scroll(1)}
          className="absolute right-0 top-1/2 z-10 -translate-y-1/2 hidden md:flex h-12 w-9 items-center justify-center rounded-l-md bg-black/70 text-white opacity-0 group-hover:opacity-100 transition"
          aria-label="Scroll right"
        ><ChevronRight /></button>
      </div>
    </section>
  );
}