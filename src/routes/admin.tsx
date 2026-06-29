import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin")({
  beforeLoad: async () => {
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw redirect({ to: "/auth", search: { redirect: "/admin" } });
    }

    // Check if user has admin role
    const { data: roles, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["super_admin", "content_manager", "moderator", "finance_manager", "support_agent", "analytics_manager"]);

    if (roleError || !roles || roles.length === 0) {
      // User is authenticated but not an admin
      throw redirect({ to: "/" });
    }

    return { user, roles: roles.map(r => r.role) };
  },
  loader: async () => {
    throw redirect({ to: "/_authenticated/admin" });
  },
});
