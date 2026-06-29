import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Bookmark, Clock, DollarSign, Download, FileText, Heart, MapPin } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { Reviews } from "@/components/Reviews";
import { isImage, type Attachment } from "@/components/FileUploader";

export const Route = createFileRoute("/jobs/$id")({
  component: JobDetail,
  notFoundComponent: () => <div className="p-10 text-center">Job not found.</div>,
  errorComponent: ({ error }) => <div className="p-10 text-center text-destructive">{error.message}</div>,
});

function JobDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: job } = useQuery({
    queryKey: ["job", id],
    queryFn: async () => (await supabase.from("jobs").select("*,profiles(id,display_name,location)").eq("id", id).maybeSingle()).data,
  });
  const { data: liked } = useQuery({
    queryKey: ["job-like", id, user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase.from("job_likes").select("job_id").eq("job_id", id).eq("user_id", user.id).maybeSingle();
      return !!data;
    },
    enabled: !!user,
  });
  const { data: saved } = useQuery({
    queryKey: ["job-save", id, user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase.from("job_saves").select("job_id").eq("job_id", id).eq("user_id", user.id).maybeSingle();
      return !!data;
    },
    enabled: !!user,
  });
  const toggleLike = useMutation({
    mutationFn: async () => {
      if (!user) { navigate({ to: "/auth" }); return; }
      if (liked) await supabase.from("job_likes").delete().eq("job_id", id).eq("user_id", user.id);
      else await supabase.from("job_likes").insert({ job_id: id, user_id: user.id });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["job", id] }); qc.invalidateQueries({ queryKey: ["job-like", id] }); },
  });
  const toggleSave = useMutation({
    mutationFn: async () => {
      if (!user) { navigate({ to: "/auth" }); return; }
      if (saved) await supabase.from("job_saves").delete().eq("job_id", id).eq("user_id", user.id);
      else await supabase.from("job_saves").insert({ job_id: id, user_id: user.id });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["job", id] }); qc.invalidateQueries({ queryKey: ["job-save", id] }); },
  });

  if (!job) return <div className="min-h-screen bg-background"><Navbar /><div className="p-10 text-center text-muted-foreground">Loading…</div></div>;

  async function apply() {
    if (!user) { navigate({ to: "/auth" }); return; }
    const a = user.id < job!.client_id ? user.id : job!.client_id;
    const b = user.id < job!.client_id ? job!.client_id : user.id;
    const existing = await supabase.from("conversations").select("id").eq("user_a", a).eq("user_b", b).maybeSingle();
    let convId = existing.data?.id;
    if (!convId) {
      const inserted = await supabase.from("conversations").insert({ user_a: a, user_b: b }).select("id").single();
      convId = inserted.data?.id;
    }
    navigate({ to: "/messages", search: { c: convId } as never });
  }

  const budget = job.budget_min && job.budget_max ? `$${job.budget_min} – $${job.budget_max}${job.is_hourly ? "/hr" : ""}` : "Negotiable";
  const attachments = (job.attachments as unknown as Attachment[] | null) ?? [];
  const gallery = attachments.filter((a) => isImage(a.type));
  const docs = attachments.filter((a) => !isImage(a.type));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-4xl px-4 py-10 md:px-6">
        <Link to="/jobs" className="text-xs text-muted-foreground hover:text-primary">← Back to jobs</Link>
        <div className="mt-2 flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold md:text-4xl">{job.title}</h1>
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}</span>
              <span className="flex items-center gap-1"><DollarSign className="h-4 w-4" /> {budget}</span>
              {job.profiles?.location && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {job.profiles.location}</span>}
              {job.experience_level && <span className="capitalize">{job.experience_level} level</span>}
              <span className="flex items-center gap-1"><Heart className="h-4 w-4" /> {job.likes_count ?? 0}</span>
              <span className="flex items-center gap-1"><Bookmark className="h-4 w-4" /> {job.saves_count ?? 0}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="icon" variant="secondary" onClick={() => toggleLike.mutate()} aria-label="Like">
              <Heart className={`h-4 w-4 ${liked ? "fill-primary text-primary" : ""}`} />
            </Button>
            <Button size="icon" variant="secondary" onClick={() => toggleSave.mutate()} aria-label="Save">
              <Bookmark className={`h-4 w-4 ${saved ? "fill-primary text-primary" : ""}`} />
            </Button>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display text-lg font-semibold">Project description</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{job.description}</p>
          {job.skills && job.skills.length > 0 && (
            <>
              <h3 className="mt-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Skills</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {job.skills.map((s) => <span key={s} className="rounded-full border border-border bg-secondary px-3 py-1 text-xs">{s}</span>)}
              </div>
            </>
          )}
          {(gallery.length > 0 || docs.length > 0) && (
            <>
              <h3 className="mt-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Attachments</h3>
              {gallery.length > 0 && (
                <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {gallery.map((g) => (
                    <a key={g.path} href={g.url} target="_blank" rel="noreferrer" className="aspect-square overflow-hidden rounded-md border border-border bg-secondary">
                      <img src={g.url} alt={g.name} className="h-full w-full object-cover" />
                    </a>
                  ))}
                </div>
              )}
              {docs.length > 0 && (
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {docs.map((d) => (
                    <a key={d.path} href={d.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 hover:border-primary/50">
                      <FileText className="h-5 w-5 text-primary" />
                      <span className="flex-1 truncate text-sm">{d.name}</span>
                      <Download className="h-4 w-4 text-muted-foreground" />
                    </a>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={apply} className="font-semibold">Submit a proposal</Button>
          <Button onClick={apply} variant="secondary">Message client</Button>
        </div>

        <div className="mt-10 border-t border-border pt-8">
          <Reviews subjectId={job.client_id} jobId={job.id} title="Client reviews" />
        </div>
      </div>
      <Footer />
    </div>
  );
}
