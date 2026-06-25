import { createFileRoute } from "@tanstack/react-router";
import { useQuery, queryOptions } from "@tanstack/react-query";
import { Shell } from "@/components/sf/shell";
import { Hero } from "@/components/sf/hero";
import { TitleRow } from "@/components/sf/title-row";
import {
  fetchBanners,
  fetchTitlesByKind,
  fetchTrending,
  fetchComingSoon,
} from "@/lib/catalog";

const bannersOpts = queryOptions({ queryKey: ["banners"], queryFn: fetchBanners });
const trendingOpts = queryOptions({ queryKey: ["titles", "trending"], queryFn: () => fetchTrending(20) });
const moviesOpts = queryOptions({ queryKey: ["titles", "movie"], queryFn: () => fetchTitlesByKind("movie") });
const seriesOpts = queryOptions({ queryKey: ["titles", "series"], queryFn: () => fetchTitlesByKind("series") });
const dramasOpts = queryOptions({ queryKey: ["titles", "drama"], queryFn: () => fetchTitlesByKind("drama") });
const cartoonsOpts = queryOptions({ queryKey: ["titles", "cartoon"], queryFn: () => fetchTitlesByKind("cartoon") });
const docsOpts = queryOptions({ queryKey: ["titles", "documentary"], queryFn: () => fetchTitlesByKind("documentary") });
const comingOpts = queryOptions({ queryKey: ["titles", "coming"], queryFn: () => fetchComingSoon() });

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "StreamFlix — Movies, series, dramas, kids and documentaries" },
      { name: "description", content: "Stream thousands of movies, series, dramas, kids shows and documentaries on StreamFlix. Watch on any device. 14-day free trial." },
      { property: "og:title", content: "StreamFlix — Stream what matters" },
      { property: "og:description", content: "Movies, series, dramas, kids and documentaries. 14-day free trial." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
  errorComponent: ({ error }) => (
    <Shell><div className="p-12 text-center text-muted-foreground">Couldn't load the catalog: {error.message}</div></Shell>
  ),
  notFoundComponent: () => <Shell><div className="p-12 text-center">Not found</div></Shell>,
});

function HomePage() {
  const { data: banners = [] } = useQuery(bannersOpts);
  const { data: trending = [] } = useQuery(trendingOpts);
  const { data: movies = [] } = useQuery(moviesOpts);
  const { data: series = [] } = useQuery(seriesOpts);
  const { data: dramas = [] } = useQuery(dramasOpts);
  const { data: cartoons = [] } = useQuery(cartoonsOpts);
  const { data: docs = [] } = useQuery(docsOpts);
  const { data: coming = [] } = useQuery(comingOpts);
  return (
    <Shell transparentHeader>
      <Hero banners={banners} />
      <div className="mx-auto max-w-[1480px]">
        <TitleRow heading="Trending now" titles={trending} />
        <TitleRow heading="Movies" titles={movies} />
        <TitleRow heading="Series" titles={series} />
        <TitleRow heading="Dramas" titles={dramas} />
        <TitleRow heading="Kids & Cartoons" titles={cartoons} />
        <TitleRow heading="Documentaries" titles={docs} />
        <TitleRow heading="Coming soon" titles={coming} />
      </div>
    </Shell>
  );
}
