import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/dashboard")({
  ssr: false,
  beforeLoad: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw redirect({ to: "/auth" });
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    const r = roles?.map((x) => x.role) ?? [];
    if (r.includes("client") && !r.includes("freelancer")) throw redirect({ to: "/client" });
    if (r.includes("freelancer")) throw redirect({ to: "/freelancer" });
    throw redirect({ to: "/onboarding" });
  },
  component: () => null,
});
