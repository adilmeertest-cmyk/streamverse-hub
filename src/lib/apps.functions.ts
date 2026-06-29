import { supabase } from "@/integrations/supabase/client";
import type { App, AppPlatform, AppPlatformFile, AppDownload } from "./types";

export async function fetchApps(platform?: AppPlatform): Promise<App[]> {
  let query = supabase
    .from("apps")
    .select("*")
    .eq("is_published", true)
    .order("is_featured", { ascending: false })
    .order("download_count", { ascending: false });

  if (platform) {
    // Filter apps that have the specified platform available
    const { data: platformApps } = await supabase
      .from("app_platforms")
      .select("app_id")
      .eq("platform", platform)
      .eq("is_active", true);

    if (platformApps && platformApps.length > 0) {
      const appIds = platformApps.map((p: { app_id: string }) => p.app_id);
      query = query.in("id", appIds);
    } else {
      return [];
    }
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function fetchAppBySlug(slug: string): Promise<App | null> {
  const { data, error } = await supabase
    .from("apps")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data;
}

export async function fetchAppPlatforms(appId: string): Promise<AppPlatformFile[]> {
  const { data, error } = await supabase
    .from("app_platforms")
    .select("*")
    .eq("app_id", appId)
    .eq("is_active", true)
    .order("platform");

  if (error) throw error;
  return data || [];
}

export async function fetchFeaturedApps(): Promise<App[]> {
  const { data, error } = await supabase
    .from("apps")
    .select("*")
    .eq("is_published", true)
    .eq("is_featured", true)
    .order("download_count", { ascending: false })
    .limit(6);

  if (error) throw error;
  return data || [];
}

export async function recordDownload(
  userId: string,
  appId: string,
  platformId: string,
  deviceFingerprint?: string
): Promise<void> {
  // Insert download record
  const { error: insertError } = await supabase
    .from("app_downloads")
    .upsert(
      {
        user_id: userId,
        app_id: appId,
        platform_id: platformId,
        device_fingerprint: deviceFingerprint,
        downloaded_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,app_id,platform_id",
      }
    );

  if (insertError) throw insertError;

  // Increment download count
  const { error: incrementError } = await supabase.rpc("increment_app_download", {
    _app_id: appId,
  });

  if (incrementError) throw incrementError;
}

export async function fetchUserDownloads(userId: string): Promise<AppDownload[]> {
  const { data, error } = await supabase
    .from("app_downloads")
    .select("*, apps(*), app_platforms(*)")
    .eq("user_id", userId)
    .order("downloaded_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function generateDeviceFingerprint(): Promise<string> {
  // Generate a unique device fingerprint using browser characteristics
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return Math.random().toString(36).substring(7);

  ctx.textBaseline = "top";
  ctx.font = "14px 'Arial'";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#f60";
  ctx.fillRect(125, 1, 62, 20);
  ctx.fillStyle = "#069";
  ctx.fillText("Device Fingerprint", 2, 15);
  ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
  ctx.fillText("Device Fingerprint", 4, 17);

  const canvasData = canvas.toDataURL();
  const screenInfo = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const language = navigator.language;
  const platform = navigator.platform;

  const fingerprint = btoa(
    `${canvasData}-${screenInfo}-${timezone}-${language}-${platform}-${Date.now()}`
  );

  return fingerprint.substring(0, 64); // Limit length
}

export async function checkDeviceRegistration(email: string, deviceFingerprint: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, device_fingerprint, is_primary_device")
    .eq("email", email)
    .eq("device_fingerprint", deviceFingerprint)
    .eq("is_primary_device", true)
    .single();

  if (error) {
    if (error.code === "PGRST116") return false;
    throw error;
  }

  return !!data;
}

export async function checkEmailExists(email: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("profiles")
    .select("email")
    .eq("email", email)
    .single();

  if (error) {
    if (error.code === "PGRST116") return false;
    throw error;
  }

  return !!data;
}
