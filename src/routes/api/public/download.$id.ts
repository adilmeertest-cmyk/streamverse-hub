import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/download/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const id = params.id;
        if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Not found", { status: 404 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: row, error } = await supabaseAdmin
          .from("downloads")
          .select("id,url,storage_path,filename,is_active")
          .eq("id", id)
          .maybeSingle();
        if (error || !row || !row.is_active) return new Response("Not found", { status: 404 });

        // Fire-and-forget counter
        await supabaseAdmin.rpc("increment_download_count", { _id: id });

        let target = row.url;
        if (row.storage_path) {
          const { data: signed } = await supabaseAdmin.storage
            .from("app-downloads")
            .createSignedUrl(row.storage_path, 60 * 10, { download: row.filename ?? undefined });
          if (signed?.signedUrl) target = signed.signedUrl;
        }
        return Response.redirect(target, 302);
      },
    },
  },
});