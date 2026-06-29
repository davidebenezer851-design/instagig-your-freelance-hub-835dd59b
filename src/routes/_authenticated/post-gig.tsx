import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileUploader, type Attachment } from "@/components/FileUploader";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/post-gig")({
  head: () => ({ meta: [{ title: "Post a Gig — InstaGIG" }] }),
  component: PostGig,
});

function PostGig() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [days, setDays] = useState("7");
  const [categoryId, setCategoryId] = useState<string>("");
  const [tags, setTags] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(false);

  const { data: cats } = useQuery({ queryKey: ["categories"], queryFn: async () => (await supabase.from("categories").select("*").order("name")).data ?? [] });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-2xl px-4 py-10 md:px-6">
        <h1 className="font-display text-3xl font-bold">Post a gig</h1>
        <p className="mt-1 text-sm text-muted-foreground">Show off what you're great at.</p>
        <form
          className="mt-8 space-y-5"
          onSubmit={async (e) => {
            e.preventDefault();
            setLoading(true);
            // Ensure profile exists (FK target) + freelancer role
            await supabase.from("profiles").upsert(
              { id: user!.id, display_name: user!.email?.split("@")[0] ?? "User" },
              { onConflict: "id", ignoreDuplicates: true },
            );
            await supabase.from("user_roles").upsert({ user_id: user!.id, role: "freelancer" }, { onConflict: "user_id,role" });
            const cover = attachments.find((a) => a.is_cover);
            const { data, error } = await supabase.from("gigs").insert({
              freelancer_id: user!.id,
              title, description,
              starting_price: parseFloat(price),
              delivery_days: parseInt(days, 10),
              category_id: categoryId || null,
              tags: tags.split(",").map(t => t.trim()).filter(Boolean),
              cover_url: cover?.url ?? null,
              attachments: attachments as never,
            }).select("id").single();
            setLoading(false);
            if (error) return toast.error(error.message);
            toast.success("Gig published!");
            navigate({ to: "/gigs/$id", params: { id: data!.id } });
          }}
        >
          <div className="space-y-2"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="I will design a modern logo for your brand" /></div>
          <div className="space-y-2"><Label>Description</Label><Textarea rows={6} value={description} onChange={(e) => setDescription(e.target.value)} required /></div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2"><Label>Starting price ($)</Label><Input type="number" min="5" required value={price} onChange={(e) => setPrice(e.target.value)} /></div>
            <div className="space-y-2"><Label>Delivery (days)</Label><Input type="number" min="1" required value={days} onChange={(e) => setDays(e.target.value)} /></div>
            <div className="space-y-2"><Label>Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger><SelectValue placeholder="Choose…" /></SelectTrigger>
                <SelectContent>
                  {cats?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2"><Label>Tags (comma-separated)</Label><Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="logo, branding, vector" /></div>
          <div className="space-y-2">
            <Label>Gallery & cover image</Label>
            <p className="text-xs text-muted-foreground">The image marked <span className="text-primary">Cover</span> becomes the gig thumbnail.</p>
            <FileUploader value={attachments} onChange={setAttachments} folder="gigs" />
          </div>
          <Button type="submit" className="w-full font-semibold" disabled={loading}>{loading ? "Publishing…" : "Publish gig"}</Button>
        </form>
      </div>
      <Footer />
    </div>
  );
}
