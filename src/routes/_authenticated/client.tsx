import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Bookmark, MessageCircle, Plus, Search, Sparkles, Users, Briefcase } from "lucide-react";

export const Route = createFileRoute("/_authenticated/client")({
  head: () => ({ meta: [{ title: "Client Dashboard — InstaGIG" }] }),
  component: ClientDashboard,
});

function ClientDashboard() {
  const { user } = useAuth();
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => user ? (await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle()).data : null,
    enabled: !!user,
  });
  const { data: myJobs } = useQuery({
    queryKey: ["my-jobs", user?.id],
    queryFn: async () => user ? (await supabase.from("jobs").select("*").eq("client_id", user.id).order("created_at", { ascending: false })).data ?? [] : [],
    enabled: !!user,
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wide text-primary">Client</div>
            <h1 className="font-display text-3xl font-bold md:text-4xl">Welcome {profile?.display_name ?? "back"} 👋</h1>
            <p className="mt-1 text-sm text-muted-foreground">Hire talent. Manage jobs. Ship faster.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/post-job"><Button className="font-semibold"><Plus className="mr-1 h-4 w-4" />Post a job</Button></Link>
            <Link to="/gigs"><Button variant="secondary"><Search className="mr-1 h-4 w-4" />Browse talent</Button></Link>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <Briefcase className="h-5 w-5 text-primary" />
            <div className="mt-3 text-2xl font-display font-bold">{myJobs?.length ?? 0}</div>
            <div className="text-xs text-muted-foreground">Open jobs</div>
          </div>
          <Link to="/messages" className="group rounded-2xl border border-border bg-card p-5 hover:border-primary/40">
            <MessageCircle className="h-5 w-5 text-primary" />
            <div className="mt-3 font-display font-semibold group-hover:text-primary">Messages</div>
            <div className="text-xs text-muted-foreground">Talk to freelancers</div>
          </Link>
          <Link to="/saved" className="group rounded-2xl border border-border bg-card p-5 hover:border-primary/40">
            <Bookmark className="h-5 w-5 text-primary" />
            <div className="mt-3 font-display font-semibold group-hover:text-primary">Saved gigs</div>
            <div className="text-xs text-muted-foreground">Your shortlist</div>
          </Link>
          <Link to="/gigs" className="group rounded-2xl border border-border bg-card p-5 hover:border-primary/40">
            <Users className="h-5 w-5 text-primary" />
            <div className="mt-3 font-display font-semibold group-hover:text-primary">Find talent</div>
            <div className="text-xs text-muted-foreground">Top gigs</div>
          </Link>
        </div>

        <div className="mt-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl font-bold">Your jobs</h2>
            <Link to="/post-job" className="text-sm text-primary hover:underline">+ New job</Link>
          </div>
          {myJobs && myJobs.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {myJobs.map((j) => (
                <Link key={j.id} to="/jobs/$id" params={{ id: j.id }} className="rounded-xl border border-border bg-card p-4 hover:border-primary/40">
                  <div className="font-semibold">{j.title}</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {j.budget_min || j.budget_max ? `$${j.budget_min ?? "?"}–$${j.budget_max ?? "?"}` : "Budget TBD"}
                    {j.is_hourly ? " · hourly" : ""}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-8 text-center">
              <Sparkles className="mx-auto h-8 w-8 text-primary" />
              <h3 className="mt-3 font-display text-lg font-semibold">No jobs yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">Post your first job to find the right freelancer.</p>
              <Link to="/post-job"><Button className="mt-4 font-semibold">Post a job</Button></Link>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
