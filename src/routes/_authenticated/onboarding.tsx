import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Briefcase, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Pick your role — InstaGIG" }] }),
  component: Onboarding,
});

function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<string | null>(null);

  async function pick(role: "freelancer" | "client") {
    if (!user) return;
    setLoading(role);
    await supabase.from("user_roles").upsert({ user_id: user.id, role }, { onConflict: "user_id,role" });
    navigate({ to: role === "freelancer" ? "/freelancer" : "/client", replace: true });
  }

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <div className="w-full max-w-xl text-center">
        <div className="text-xs uppercase tracking-wide text-primary">One last step</div>
        <h1 className="mt-2 font-display text-3xl font-bold md:text-4xl">How will you use InstaGIG?</h1>
        <p className="mt-2 text-sm text-muted-foreground">You can switch later in your profile.</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <button onClick={() => pick("freelancer")} disabled={!!loading} className="group rounded-2xl border border-border bg-card p-6 text-left transition hover:border-primary/60">
            <Sparkles className="h-6 w-6 text-primary" />
            <div className="mt-3 font-display text-lg font-semibold">I'm a freelancer</div>
            <p className="mt-1 text-sm text-muted-foreground">Sell my skills and land gigs.</p>
            <Button className="mt-4 w-full" disabled={loading === "freelancer"}>{loading === "freelancer" ? "Setting up…" : "Continue"}</Button>
          </button>
          <button onClick={() => pick("client")} disabled={!!loading} className="group rounded-2xl border border-border bg-card p-6 text-left transition hover:border-primary/60">
            <Briefcase className="h-6 w-6 text-primary" />
            <div className="mt-3 font-display text-lg font-semibold">I'm a client</div>
            <p className="mt-1 text-sm text-muted-foreground">Hire talent for my projects.</p>
            <Button className="mt-4 w-full" disabled={loading === "client"}>{loading === "client" ? "Setting up…" : "Continue"}</Button>
          </button>
        </div>
      </div>
    </div>
  );
}
