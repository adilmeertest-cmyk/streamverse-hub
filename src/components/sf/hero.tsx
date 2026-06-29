import { Link } from "@tanstack/react-router";
import { Play, Info } from "lucide-react";
import type { Banner } from "@/lib/types";
import { useEffect, useState } from "react";

export function Hero({ banners }: { banners: Banner[] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (banners.length <= 1) return;
    const id = setInterval(() => setI((x) => (x + 1) % banners.length), 7000);
    return () => clearInterval(id);
  }, [banners.length]);
  if (!banners.length) {
    return (
      <div className="relative h-[60vh] min-h-[420px] sf-gradient flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground text-lg">No banners available</p>
        </div>
      </div>
    );
  }
  const b = banners[i];
  return (
    <div className="relative h-[78vh] min-h-[520px] w-full overflow-hidden">
      <img key={b.id} src={b.image_url} alt="" className="absolute inset-0 h-full w-full object-cover animate-in fade-in duration-700" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/40 to-transparent" />
      <div className="relative h-full flex items-end">
        <div className="px-4 md:px-12 pb-20 max-w-3xl">
          <h1 className="text-4xl md:text-6xl font-black tracking-tight drop-shadow-lg">{b.headline}</h1>
          {b.subhead && <p className="mt-4 text-base md:text-lg text-foreground/85 max-w-xl">{b.subhead}</p>}
          <div className="mt-6 flex flex-wrap gap-3">
            {b.cta_href && (
              <Link to={b.cta_href} className="inline-flex items-center gap-2 rounded-md bg-white px-5 py-2.5 text-sm font-bold text-black hover:bg-white/90">
                <Play className="h-4 w-4 fill-current" /> {b.cta_label ?? "Watch"}
              </Link>
            )}
            {b.cta_href && (
              <Link to={b.cta_href} className="inline-flex items-center gap-2 rounded-md bg-white/15 backdrop-blur px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/25">
                <Info className="h-4 w-4" /> More info
              </Link>
            )}
          </div>
        </div>
      </div>
      {banners.length > 1 && (
        <div className="absolute bottom-6 right-6 flex gap-1.5">
          {banners.map((_, idx) => (
            <button key={idx} onClick={() => setI(idx)} aria-label={`Banner ${idx + 1}`}
              className={`h-1.5 rounded-full transition-all ${idx === i ? "w-8 bg-primary" : "w-4 bg-white/40"}`} />
          ))}
        </div>
      )}
    </div>
  );
}