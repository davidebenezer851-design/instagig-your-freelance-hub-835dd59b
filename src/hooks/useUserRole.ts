import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useUserRole() {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["user-role", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
      return (data?.role ?? null) as "freelancer" | "client" | null;
    },
    enabled: !!user,
  });
  return data ?? null;
}
