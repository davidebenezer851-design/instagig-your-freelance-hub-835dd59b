import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Bookmark, Briefcase, MessageCircle, Plus, Search, Sparkles, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/_authenticated/freelancer")({
  head: () => ({ meta: [{ title: "Freelancer Dashboard — InstaGIG" }] }),
  component: FreelancerDashboard,
});

function FreelancerDashboard() {
  const { user } = useAuth();
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => user ? (await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle()).data : null,
    enabled: !!user,
  });
  const { data: myGigs } = useQuery({
    queryKey: ["my-gigs", user?.id],
    queryFn: async () => user ? (await supabase.from("gigs").select("*").eq("freelancer_id", user.id).order("created_at", { ascending: false })).data ?? [] : [],
    enabled: !!user,
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wide text-primary">Freelancer</div>
            <h1 className="font-display text-3xl font-bold md:text-4xl">Hey {profile?.display_name ?? "there"} 👋</h1>
            <p className="mt-1 text-sm text-muted-foreground">Sell your skills. Track your gigs. Land new work.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/post-gig"><Button className="font-semibold"><Plus className="mr-1 h-4 w-4" />Post a gig</Button></Link>
            <Link to="/jobs"><Button variant="secondary"><Search className="mr-1 h-4 w-4" />Find work</Button></Link>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <TrendingUp className="h-5 w-5 text-primary" />
            <div className="mt-3 text-2xl font-display font-bold">{myGigs?.length ?? 0}</div>
            <div className="text-xs text-muted-foreground">Active gigs</div>
          </div>
          <Link to="/messages" className="group rounded-2xl border border-border bg-card p-5 hover:border-primary/40">
            <MessageCircle className="h-5 w-5 text-primary" />
            <div className="mt-3 font-display font-semibold group-hover:text-primary">Messages</div>
            <div className="text-xs text-muted-foreground">Talk to clients</div>
          </Link>
          <Link to="/saved" className="group rounded-2xl border border-border bg-card p-5 hover:border-primary/40">
            <Bookmark className="h-5 w-5 text-primary" />
            <div className="mt-3 font-display font-semibold group-hover:text-primary">Saved jobs</div>
            <div className="text-xs text-muted-foreground">Your shortlist</div>
          </Link>
          <Link to="/jobs" className="group rounded-2xl border border-border bg-card p-5 hover:border-primary/40">
            <Briefcase className="h-5 w-5 text-primary" />
            <div className="mt-3 font-display font-semibold group-hover:text-primary">Browse jobs</div>
            <div className="text-xs text-muted-foreground">Newest first</div>
          </Link>
        </div>

        <div className="mt-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl font-bold">Your gigs</h2>
            <Link to="/post-gig" className="text-sm text-primary hover:underline">+ New gig</Link>
          </div>
          {myGigs && myGigs.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {myGigs.map((g) => (
                <Link key={g.id} to="/gigs/$id" params={{ id: g.id }} className="rounded-xl border border-border bg-card p-4 hover:border-primary/40">
                  <div className="font-semibold">{g.title}</div>
                  <div className="mt-1 text-sm text-muted-foreground">From ${g.starting_price} · {g.delivery_days}d</div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-8 text-center">
              <Sparkles className="mx-auto h-8 w-8 text-primary" />
              <h3 className="mt-3 font-display text-lg font-semibold">No gigs yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">Post your first gig and start earning.</p>
              <Link to="/post-gig"><Button className="mt-4 font-semibold">Post a gig</Button></Link>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
