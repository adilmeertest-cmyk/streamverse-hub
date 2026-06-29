import { createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Shell } from "@/components/sf/shell";

export const Route = createFileRoute("/auth/callback")({
  ssr: false,
  head: () => ({ meta: [{ title: "Signing you in — StreamFlix" }] }),
  component: CallbackPage,
});

function CallbackPage() {
  const navigate = useNavigate();
  const search = useRouterState({ select: (s) => s.location.search as { next?: string; code?: string; error_description?: string } });
  const [msg, setMsg] = useState("Finishing sign-in…");

  useEffect(() => {
    (async () => {
      try {
        if (search?.error_description) throw new Error(search.error_description);
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        const hash = url.hash.startsWith("#") ? url.hash.slice(1) : "";
        const hashParams = new URLSearchParams(hash);
        const type = hashParams.get("type") ?? url.searchParams.get("type");

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }
        // Recovery flow: send user to reset-password
        if (type === "recovery" || search?.next === "/reset-password") {
          navigate({ to: "/reset-password", replace: true });
          return;
        }
        // Email verification success → back to sign-in (or home if a session exists)
        const { data } = await supabase.auth.getUser();
        if (data.user) {
          navigate({ to: "/", replace: true });
        } else {
          navigate({ to: "/auth", search: { verified: "1" } as never, replace: true });
        }
      } catch (e: any) {
        setMsg(e?.message ?? "Authentication failed. Please try again.");
      }
    })();
  }, [navigate, search]);

  return (
    <Shell>
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-muted-foreground">{msg}</p>
      </div>
    </Shell>
  );
}