export type TitleKind = "movie" | "series" | "drama" | "cartoon" | "documentary";

export interface Title {
  id: string;
  slug: string;
  kind: TitleKind;
  title: string;
  tagline: string | null;
  synopsis: string | null;
  release_year: number | null;
  runtime_minutes: number | null;
  age_rating: string | null;
  poster_url: string | null;
  backdrop_url: string | null;
  is_premium: boolean;
  is_coming_soon: boolean;
  is_featured: boolean;
  is_trending: boolean;
  cast_list: string[] | null;
  directors: string[] | null;
}

export interface Banner {
  id: string;
  title_id: string | null;
  headline: string;
  subhead: string | null;
  image_url: string;
  cta_label: string | null;
  cta_href: string | null;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string | null;
}

export interface SubscriptionPlan {
  id: string;
  tier: "basic" | "standard" | "premium" | "family";
  interval: "monthly" | "yearly";
  name: string;
  price_cents: number;
  currency: string;
  max_screens: number;
  max_quality: string;
  features: string[];
  trial_days: number;
}