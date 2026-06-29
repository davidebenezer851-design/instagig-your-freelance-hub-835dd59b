import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Smile, Send, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/UserAvatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

const EMOJIS = ["😀","😂","🥰","😍","😎","🤩","🙌","👏","🔥","💯","✨","🎉","❤️","💛","💚","👍","👎","🙏","💪","🚀","💸","💼","⭐","✅"];
const STICKERS = ["🎨","📸","💻","🎬","🎵","📝","🛠️","⚡","🌟","🏆","🎯","💎"];

type CommentRow = {
  id: string;
  author_id: string;
  body: string;
  created_at: string;
  author?: { display_name: string | null; avatar_url: string | null } | null;
};

export function Comments({ gigId, jobId }: { gigId?: string; jobId?: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = ["comments", gigId ?? jobId];
  const [body, setBody] = useState("");

  const { data: comments = [] } = useQuery({
    queryKey: key,
    queryFn: async () => {
      let q = supabase
        .from("post_comments" as never)
        .select("id,author_id,body,created_at")
        .order("created_at", { ascending: false });
      if (gigId) q = q.eq("gig_id", gigId);
      if (jobId) q = q.eq("job_id", jobId);
      const { data } = await q;
      const rows = (data ?? []) as CommentRow[];
      const ids = Array.from(new Set(rows.map((r) => r.author_id)));
      if (!ids.length) return rows;
      const { data: profs } = await supabase.from("profiles").select("id,display_name,avatar_url").in("id", ids);
      const by = new Map((profs ?? []).map((p) => [p.id, p]));
      return rows.map((r) => ({ ...r, author: by.get(r.author_id) ?? null }));
    },
  });

  const post = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in to comment");
      if (!body.trim()) return;
      const payload: Record<string, unknown> = { author_id: user.id, body: body.trim() };
      if (gigId) payload.gig_id = gigId;
      if (jobId) payload.job_id = jobId;
      const { error } = await supabase.from("post_comments" as never).insert(payload as never);
      if (error) throw error;
    },
    onSuccess: () => { setBody(""); qc.invalidateQueries({ queryKey: key }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("post_comments" as never).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold">Comments <span className="text-muted-foreground text-sm font-normal">({comments.length})</span></h3>
      </div>

      {user ? (
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-start gap-2">
            <UserAvatar userId={user.id} size={32} />
            <div className="flex-1">
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Add a comment…"
                rows={2}
                className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              <div className="mt-2 flex items-center justify-between">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="ghost" size="sm" className="h-8 px-2">
                      <Smile className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent side="top" align="start" className="w-72 p-2">
                    <div className="text-[10px] font-semibold uppercase text-muted-foreground mb-1">Emojis</div>
                    <div className="grid grid-cols-8 gap-1">
                      {EMOJIS.map((e) => (
                        <button key={e} type="button" onClick={() => setBody((b) => b + e)} className="rounded p-1 text-lg hover:bg-secondary">{e}</button>
                      ))}
                    </div>
                    <div className="text-[10px] font-semibold uppercase text-muted-foreground mt-2 mb-1">Stickers</div>
                    <div className="grid grid-cols-6 gap-1">
                      {STICKERS.map((e) => (
                        <button key={e} type="button" onClick={() => setBody((b) => b + " " + e + " ")} className="rounded p-1 text-2xl hover:bg-secondary">{e}</button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
                <Button size="sm" onClick={() => post.mutate()} disabled={post.isPending || !body.trim()} className="font-semibold">
                  <Send className="mr-1 h-3.5 w-3.5" /> Post
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Sign in to leave a comment.</p>
      )}

      <div className="space-y-3">
        {comments.length === 0 && <p className="text-sm text-muted-foreground">Be the first to comment.</p>}
        {comments.map((c) => (
          <div key={c.id} className="flex items-start gap-2 animate-in fade-in slide-in-from-bottom-1">
            <UserAvatar userId={c.author_id} name={c.author?.display_name} avatarUrl={c.author?.avatar_url} size={32} />
            <div className="flex-1 rounded-2xl rounded-tl-sm bg-secondary/60 px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold">{c.author?.display_name ?? "User"}</span>
                <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
              </div>
              <p className="mt-0.5 whitespace-pre-wrap break-words text-sm">{c.body}</p>
            </div>
            {user?.id === c.author_id && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => del.mutate(c.id)} aria-label="Delete">
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
