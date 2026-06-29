import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bookmark, Clock, DollarSign, ExternalLink, Heart, MapPin, MessageCircle, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Comments } from "@/components/Comments";
import { UserAvatar } from "@/components/UserAvatar";
import { toast } from "sonner";

type Kind = "gig" | "job";

export function PostPreviewSheet({
  kind, id, open, onOpenChange,
}: {
  kind: Kind;
  id: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const table = kind === "gig" ? "gigs" : "jobs";
  const likesT = kind === "gig" ? "gig_likes" : "job_likes";
  const savesT = kind === "gig" ? "gig_saves" : "job_saves";
  const fk = kind === "gig" ? "gig_id" : "job_id";

  const { data: post } = useQuery({
    queryKey: [kind, id],
    queryFn: async () => {
      if (!id) return null;
      const { data } = await supabase.from(table).select("*,profiles(id,display_name,avatar_url,location,headline)").eq("id", id).maybeSingle();
      return data;
    },
    enabled: !!id && open,
  });

  const { data: liked } = useQuery({
    queryKey: [`${kind}-like`, id, user?.id],
    queryFn: async () => {
      if (!user || !id) return false;
      const col = fk as "gig_id";
      const { data } = await supabase.from(likesT as "gig_likes").select(col).eq(col, id).eq("user_id", user.id).maybeSingle();
      return !!data;
    },
    enabled: !!user && !!id && open,
  });
  const { data: saved } = useQuery({
    queryKey: [`${kind}-save`, id, user?.id],
    queryFn: async () => {
      if (!user || !id) return false;
      const col = fk as "gig_id";
      const { data } = await supabase.from(savesT as "gig_saves").select(col).eq(col, id).eq("user_id", user.id).maybeSingle();
      return !!data;
    },
    enabled: !!user && !!id && open,
  });

  const toggleLike = useMutation({
    mutationFn: async () => {
      if (!user) { navigate({ to: "/auth" }); return; }
      if (!id) return;
      const col = fk as "gig_id";
      if (liked) await supabase.from(likesT as "gig_likes").delete().eq(col, id).eq("user_id", user.id);
      else await supabase.from(likesT as "gig_likes").insert({ [col]: id, user_id: user.id } as never);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [kind, id] }); qc.invalidateQueries({ queryKey: [`${kind}-like`, id] }); qc.invalidateQueries({ queryKey: [kind + "s"] }); },
  });
  const toggleSave = useMutation({
    mutationFn: async () => {
      if (!user) { navigate({ to: "/auth" }); return; }
      if (!id) return;
      const col = fk as "gig_id";
      if (saved) { await supabase.from(savesT as "gig_saves").delete().eq(col, id).eq("user_id", user.id); toast("Removed from saved"); }
      else { await supabase.from(savesT as "gig_saves").insert({ [col]: id, user_id: user.id } as never); toast("Saved"); }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [kind, id] }); qc.invalidateQueries({ queryKey: [`${kind}-save`, id] }); qc.invalidateQueries({ queryKey: [kind + "s"] }); },
  });

  async function openMessage() {
    if (!post) return;
    if (!user) { navigate({ to: "/auth" }); return; }
    const otherId = (kind === "gig" ? (post as { freelancer_id: string }).freelancer_id : (post as { client_id: string }).client_id);
    if (user.id === otherId) { toast("That's your own post"); return; }
    const a = user.id < otherId ? user.id : otherId;
    const b = user.id < otherId ? otherId : user.id;
    const existing = await supabase.from("conversations").select("id").eq("user_a", a).eq("user_b", b).maybeSingle();
    let convId = existing.data?.id;
    if (!convId) {
      const inserted = await supabase.from("conversations").insert({ user_a: a, user_b: b }).select("id").single();
      convId = inserted.data?.id;
    }
    onOpenChange(false);
    navigate({ to: "/messages", search: { c: convId } as never });
  }

  const p = post as Record<string, unknown> | null | undefined;
  const profiles = (p?.profiles ?? null) as { id: string; display_name: string | null; avatar_url: string | null; location: string | null; headline: string | null } | null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-2xl">
        {!p ? (
          <div className="grid h-full place-items-center p-10 text-sm text-muted-foreground">Loading…</div>
        ) : (
          <div className="flex flex-col">
            {/* Header / cover */}
            {kind === "gig" && (
              <div className="relative aspect-[16/9] w-full overflow-hidden bg-secondary">
                {p.cover_url ? (
                  <img src={p.cover_url as string} alt={p.title as string} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center grain-bg">
                    <span className="font-display text-5xl font-bold text-primary/40">iG</span>
                  </div>
                )}
              </div>
            )}

            <div className="p-6">
              <SheetHeader className="space-y-2 text-left">
                <SheetTitle className="font-display text-2xl">{p.title as string}</SheetTitle>
                <SheetDescription className="flex flex-wrap items-center gap-3">
                  <span className="flex items-center gap-2">
                    <UserAvatar userId={profiles?.id} name={profiles?.display_name} avatarUrl={profiles?.avatar_url} size={28} />
                    <span className="font-medium text-foreground">{profiles?.display_name ?? (kind === "gig" ? "Freelancer" : "Client")}</span>
                  </span>
                  {profiles?.location && <span className="flex items-center gap-1 text-xs"><MapPin className="h-3 w-3" /> {profiles.location}</span>}
                  {typeof p.rating === "number" && (
                    <span className="flex items-center gap-1 text-xs"><Star className="h-3.5 w-3.5 fill-primary text-primary" /> {(p.rating as number).toFixed(1)} ({(p.reviews_count as number) ?? 0})</span>
                  )}
                </SheetDescription>
              </SheetHeader>

              {/* Quick stats */}
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {kind === "gig" ? (
                  <>
                    <Stat label="From" value={`$${p.starting_price}`} />
                    <Stat label="Delivery" value={`${p.delivery_days}d`} icon={<Clock className="h-3.5 w-3.5" />} />
                    <Stat label="Likes" value={String(p.likes_count ?? 0)} icon={<Heart className="h-3.5 w-3.5" />} />
                  </>
                ) : (
                  <>
                    <Stat label="Budget" value={p.budget_min && p.budget_max ? `$${p.budget_min}–${p.budget_max}` : "Negotiable"} icon={<DollarSign className="h-3.5 w-3.5" />} />
                    <Stat label="Type" value={p.is_hourly ? "Hourly" : "Fixed"} />
                    <Stat label="Proposals" value={String(p.proposals_count ?? 0)} />
                  </>
                )}
              </div>

              <p className="mt-5 whitespace-pre-wrap text-sm text-muted-foreground line-clamp-[12]">{p.description as string}</p>

              {Array.isArray(p.tags) && (p.tags as string[]).length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {(p.tags as string[]).slice(0, 8).map((t) => (
                    <span key={t} className="rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs">{t}</span>
                  ))}
                </div>
              )}
              {Array.isArray(p.skills) && (p.skills as string[]).length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {(p.skills as string[]).slice(0, 8).map((t) => (
                    <span key={t} className="rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs">{t}</span>
                  ))}
                </div>
              )}

              {/* Action bar */}
              <div className="mt-6 grid grid-cols-2 gap-2">
                <Button className="font-semibold" onClick={openMessage}>
                  <MessageCircle className="mr-2 h-4 w-4" /> Message
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => { onOpenChange(false); navigate({ to: kind === "gig" ? "/gigs/$id" : "/jobs/$id", params: { id: id! } }); }}
                >
                  <ExternalLink className="mr-2 h-4 w-4" /> Open full page
                </Button>
              </div>

              {/* Like / Save with pop animations */}
              <div className="mt-3 flex items-center gap-2">
                <Button variant="outline" size="sm" className="flex-1 group" onClick={() => toggleLike.mutate()}>
                  <Heart className={`mr-1.5 h-4 w-4 transition-all duration-300 group-active:scale-125 ${liked ? "fill-primary text-primary animate-heart-pop" : ""}`} />
                  {liked ? "Liked" : "Like"} · {(p.likes_count as number) ?? 0}
                </Button>
                <Button variant="outline" size="sm" className="flex-1 group" onClick={() => toggleSave.mutate()}>
                  <Bookmark className={`mr-1.5 h-4 w-4 transition-all duration-300 group-active:scale-125 ${saved ? "fill-primary text-primary animate-heart-pop" : ""}`} />
                  {saved ? "Saved" : "Save"} · {(p.saves_count as number) ?? 0}
                </Button>
              </div>

              <div className="mt-8 border-t border-border pt-6">
                <Comments gigId={kind === "gig" ? id! : undefined} jobId={kind === "job" ? id! : undefined} />
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card/60 p-2.5">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">{icon}{label}</div>
      <div className="mt-0.5 font-display text-base font-semibold">{value}</div>
    </div>
  );
}
