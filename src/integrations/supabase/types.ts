export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      account_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          is_kids: boolean
          name: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          is_kids?: boolean
          name: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          is_kids?: boolean
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      app_downloads: {
        Row: {
          app_id: string
          device_fingerprint: string | null
          downloaded_at: string
          id: string
          platform_id: string
          user_id: string
        }
        Insert: {
          app_id: string
          device_fingerprint?: string | null
          downloaded_at?: string
          id?: string
          platform_id: string
          user_id: string
        }
        Update: {
          app_id?: string
          device_fingerprint?: string | null
          downloaded_at?: string
          id?: string
          platform_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_downloads_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_downloads_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "app_platforms"
            referencedColumns: ["id"]
          },
        ]
      }
      app_platforms: {
        Row: {
          app_id: string
          changelog: string | null
          created_at: string
          file_name: string
          file_size: string
          file_url: string
          id: string
          is_active: boolean
          min_os_version: string | null
          platform: Database["public"]["Enums"]["app_platform"]
          version: string
        }
        Insert: {
          app_id: string
          changelog?: string | null
          created_at?: string
          file_name: string
          file_size: string
          file_url: string
          id?: string
          is_active?: boolean
          min_os_version?: string | null
          platform: Database["public"]["Enums"]["app_platform"]
          version: string
        }
        Update: {
          app_id?: string
          changelog?: string | null
          created_at?: string
          file_name?: string
          file_size?: string
          file_url?: string
          id?: string
          is_active?: boolean
          min_os_version?: string | null
          platform?: Database["public"]["Enums"]["app_platform"]
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_platforms_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
        ]
      }
      apps: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          developer: string | null
          download_count: number
          icon_url: string | null
          id: string
          is_featured: boolean
          is_published: boolean
          name: string
          rating: number | null
          slug: string
          updated_at: string
          version: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          developer?: string | null
          download_count?: number
          icon_url?: string | null
          id?: string
          is_featured?: boolean
          is_published?: boolean
          name: string
          rating?: number | null
          slug: string
          updated_at?: string
          version?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          developer?: string | null
          download_count?: number
          icon_url?: string | null
          id?: string
          is_featured?: boolean
          is_published?: boolean
          name?: string
          rating?: number | null
          slug?: string
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          payload: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          payload?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          payload?: Json | null
        }
        Relationships: []
      }
      banners: {
        Row: {
          created_at: string
          cta_href: string | null
          cta_label: string | null
          display_order: number
          ends_at: string | null
          headline: string
          id: string
          image_url: string
          is_active: boolean
          starts_at: string | null
          subhead: string | null
          title_id: string | null
        }
        Insert: {
          created_at?: string
          cta_href?: string | null
          cta_label?: string | null
          display_order?: number
          ends_at?: string | null
          headline: string
          id?: string
          image_url: string
          is_active?: boolean
          starts_at?: string | null
          subhead?: string | null
          title_id?: string | null
        }
        Update: {
          created_at?: string
          cta_href?: string | null
          cta_label?: string | null
          display_order?: number
          ends_at?: string | null
          headline?: string
          id?: string
          image_url?: string
          is_active?: boolean
          starts_at?: string | null
          subhead?: string | null
          title_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "banners_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: false
            referencedRelation: "titles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      devices: {
        Row: {
          created_at: string
          device_label: string
          id: string
          ip: string | null
          last_seen_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          device_label: string
          id?: string
          ip?: string | null
          last_seen_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          device_label?: string
          id?: string
          ip?: string | null
          last_seen_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      downloads: {
        Row: {
          checksum: string | null
          created_at: string
          downloads_count: number
          filename: string
          filesize: number | null
          id: string
          is_active: boolean
          platform: Database["public"]["Enums"]["download_platform"]
          release_date: string
          release_notes: string | null
          storage_path: string | null
          updated_at: string
          url: string
          version: string
        }
        Insert: {
          checksum?: string | null
          created_at?: string
          downloads_count?: number
          filename: string
          filesize?: number | null
          id?: string
          is_active?: boolean
          platform: Database["public"]["Enums"]["download_platform"]
          release_date?: string
          release_notes?: string | null
          storage_path?: string | null
          updated_at?: string
          url: string
          version: string
        }
        Update: {
          checksum?: string | null
          created_at?: string
          downloads_count?: number
          filename?: string
          filesize?: number | null
          id?: string
          is_active?: boolean
          platform?: Database["public"]["Enums"]["download_platform"]
          release_date?: string
          release_notes?: string | null
          storage_path?: string | null
          updated_at?: string
          url?: string
          version?: string
        }
        Relationships: []
      }
      episodes: {
        Row: {
          air_date: string | null
          created_at: string
          episode_number: number
          id: string
          runtime_minutes: number | null
          season_id: string
          synopsis: string | null
          thumbnail_url: string | null
          title: string
          video_url: string | null
        }
        Insert: {
          air_date?: string | null
          created_at?: string
          episode_number: number
          id?: string
          runtime_minutes?: number | null
          season_id: string
          synopsis?: string | null
          thumbnail_url?: string | null
          title: string
          video_url?: string | null
        }
        Update: {
          air_date?: string | null
          created_at?: string
          episode_number?: number
          id?: string
          runtime_minutes?: number | null
          season_id?: string
          synopsis?: string | null
          thumbnail_url?: string | null
          title?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "episodes_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      genres: {
        Row: {
          id: string
          name: string
          slug: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      licenses: {
        Row: {
          agreement_ref: string | null
          created_at: string
          ends_at: string | null
          id: string
          licensor: string
          notes: string | null
          starts_at: string
          territory_codes: string[]
          title_id: string
        }
        Insert: {
          agreement_ref?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          licensor: string
          notes?: string | null
          starts_at?: string
          territory_codes?: string[]
          title_id: string
        }
        Update: {
          agreement_ref?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          licensor?: string
          notes?: string | null
          starts_at?: string
          territory_codes?: string[]
          title_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "licenses_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: false
            referencedRelation: "titles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          kind: string
          link_href: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          kind: string
          link_href?: string | null
          title: string
          user_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          kind?: string
          link_href?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          country: string | null
          created_at: string
          device_fingerprint: string | null
          display_name: string | null
          email: string | null
          id: string
          is_primary_device: boolean
          stripe_customer_id: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          device_fingerprint?: string | null
          display_name?: string | null
          email?: string | null
          id: string
          is_primary_device?: boolean
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          device_fingerprint?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          is_primary_device?: boolean
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_approved: boolean
          rating: number
          title_id: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_approved?: boolean
          rating: number
          title_id: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_approved?: boolean
          rating?: number
          title_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: false
            referencedRelation: "titles"
            referencedColumns: ["id"]
          },
        ]
      }
      seasons: {
        Row: {
          created_at: string
          id: string
          name: string | null
          poster_url: string | null
          release_year: number | null
          season_number: number
          title_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string | null
          poster_url?: string | null
          release_year?: number | null
          season_number: number
          title_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string | null
          poster_url?: string | null
          release_year?: number | null
          season_number?: number
          title_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seasons_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: false
            referencedRelation: "titles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          created_at: string
          currency: string
          features: Json
          id: string
          interval: Database["public"]["Enums"]["plan_interval"]
          is_active: boolean
          max_quality: string
          max_screens: number
          name: string
          price_cents: number
          stripe_price_id: string | null
          tier: Database["public"]["Enums"]["plan_tier"]
          trial_days: number
        }
        Insert: {
          created_at?: string
          currency?: string
          features?: Json
          id?: string
          interval: Database["public"]["Enums"]["plan_interval"]
          is_active?: boolean
          max_quality?: string
          max_screens?: number
          name: string
          price_cents: number
          stripe_price_id?: string | null
          tier: Database["public"]["Enums"]["plan_tier"]
          trial_days?: number
        }
        Update: {
          created_at?: string
          currency?: string
          features?: Json
          id?: string
          interval?: Database["public"]["Enums"]["plan_interval"]
          is_active?: boolean
          max_quality?: string
          max_screens?: number
          name?: string
          price_cents?: number
          stripe_price_id?: string | null
          tier?: Database["public"]["Enums"]["plan_tier"]
          trial_days?: number
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string
          current_period_start: string
          id: string
          plan_id: string
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          id?: string
          plan_id: string
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          id?: string
          plan_id?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      territories: {
        Row: {
          code: string
          name: string
        }
        Insert: {
          code: string
          name: string
        }
        Update: {
          code?: string
          name?: string
        }
        Relationships: []
      }
      title_genres: {
        Row: {
          genre_id: string
          title_id: string
        }
        Insert: {
          genre_id: string
          title_id: string
        }
        Update: {
          genre_id?: string
          title_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "title_genres_genre_id_fkey"
            columns: ["genre_id"]
            isOneToOne: false
            referencedRelation: "genres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "title_genres_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: false
            referencedRelation: "titles"
            referencedColumns: ["id"]
          },
        ]
      }
      titles: {
        Row: {
          age_rating: string | null
          avg_rating: number | null
          backdrop_url: string | null
          cast_list: string[] | null
          category_id: string | null
          created_at: string
          directors: string[] | null
          id: string
          is_coming_soon: boolean
          is_featured: boolean
          is_premium: boolean
          is_published: boolean
          is_trending: boolean
          kind: Database["public"]["Enums"]["title_kind"]
          poster_url: string | null
          rating_count: number
          release_date: string | null
          release_year: number | null
          review_state: Database["public"]["Enums"]["review_state"]
          runtime_minutes: number | null
          search_tsv: unknown
          slug: string
          synopsis: string | null
          tagline: string | null
          title: string
          trailer_url: string | null
          updated_at: string
          video_url: string | null
          view_count: number
        }
        Insert: {
          age_rating?: string | null
          avg_rating?: number | null
          backdrop_url?: string | null
          cast_list?: string[] | null
          category_id?: string | null
          created_at?: string
          directors?: string[] | null
          id?: string
          is_coming_soon?: boolean
          is_featured?: boolean
          is_premium?: boolean
          is_published?: boolean
          is_trending?: boolean
          kind: Database["public"]["Enums"]["title_kind"]
          poster_url?: string | null
          rating_count?: number
          release_date?: string | null
          release_year?: number | null
          review_state?: Database["public"]["Enums"]["review_state"]
          runtime_minutes?: number | null
          search_tsv?: unknown
          slug: string
          synopsis?: string | null
          tagline?: string | null
          title: string
          trailer_url?: string | null
          updated_at?: string
          video_url?: string | null
          view_count?: number
        }
        Update: {
          age_rating?: string | null
          avg_rating?: number | null
          backdrop_url?: string | null
          cast_list?: string[] | null
          category_id?: string | null
          created_at?: string
          directors?: string[] | null
          id?: string
          is_coming_soon?: boolean
          is_featured?: boolean
          is_premium?: boolean
          is_published?: boolean
          is_trending?: boolean
          kind?: Database["public"]["Enums"]["title_kind"]
          poster_url?: string | null
          rating_count?: number
          release_date?: string | null
          release_year?: number | null
          review_state?: Database["public"]["Enums"]["review_state"]
          runtime_minutes?: number | null
          search_tsv?: unknown
          slug?: string
          synopsis?: string | null
          tagline?: string | null
          title?: string
          trailer_url?: string | null
          updated_at?: string
          video_url?: string | null
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "titles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      watch_history: {
        Row: {
          completed: boolean
          duration_seconds: number | null
          episode_id: string | null
          id: string
          position_seconds: number
          title_id: string
          user_id: string
          watched_at: string
        }
        Insert: {
          completed?: boolean
          duration_seconds?: number | null
          episode_id?: string | null
          id?: string
          position_seconds?: number
          title_id: string
          user_id: string
          watched_at?: string
        }
        Update: {
          completed?: boolean
          duration_seconds?: number | null
          episode_id?: string | null
          id?: string
          position_seconds?: number
          title_id?: string
          user_id?: string
          watched_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "watch_history_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watch_history_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: false
            referencedRelation: "titles"
            referencedColumns: ["id"]
          },
        ]
      }
      watchlist: {
        Row: {
          created_at: string
          id: string
          title_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watchlist_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: false
            referencedRelation: "titles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_app_download: { Args: { _app_id: string }; Returns: undefined }
      increment_download_count: { Args: { _id: string }; Returns: undefined }
      recompute_title_rating: {
        Args: { _title_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_platform:
        | "android"
        | "windows"
        | "macos"
        | "linux"
        | "ios"
        | "smart_tv"
      app_role:
        | "super_admin"
        | "content_manager"
        | "moderator"
        | "finance_manager"
        | "support_agent"
        | "analytics_manager"
        | "user"
      download_platform:
        | "windows"
        | "macos"
        | "linux"
        | "android"
        | "ios"
        | "android_tv"
        | "smart_tv"
      plan_interval: "monthly" | "yearly"
      plan_tier: "basic" | "standard" | "premium" | "family"
      review_state: "draft" | "pending" | "approved" | "published" | "rejected"
      subscription_status:
        | "trialing"
        | "active"
        | "past_due"
        | "canceled"
        | "paused"
      title_kind: "movie" | "series" | "drama" | "cartoon" | "documentary"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_platform: ["android", "windows", "macos", "linux", "ios", "smart_tv"],
      app_role: [
        "super_admin",
        "content_manager",
        "moderator",
        "finance_manager",
        "support_agent",
        "analytics_manager",
        "user",
      ],
      download_platform: [
        "windows",
        "macos",
        "linux",
        "android",
        "ios",
        "android_tv",
        "smart_tv",
      ],
      plan_interval: ["monthly", "yearly"],
      plan_tier: ["basic", "standard", "premium", "family"],
      review_state: ["draft", "pending", "approved", "published", "rejected"],
      subscription_status: [
        "trialing",
        "active",
        "past_due",
        "canceled",
        "paused",
      ],
      title_kind: ["movie", "series", "drama", "cartoon", "documentary"],
    },
  },
} as const
