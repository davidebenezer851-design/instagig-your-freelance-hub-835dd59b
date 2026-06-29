import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, Lock, ShieldCheck, Wallet, Banknote, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

type Search = { gig?: string; job?: string };

export const Route = createFileRoute("/_authenticated/payments")({
  head: () => ({ meta: [{ title: "Checkout — InstaGIG" }] }),
  validateSearch: (s: Record<string, unknown>): Search => ({
    gig: typeof s.gig === "string" ? s.gig : undefined,
    job: typeof s.job === "string" ? s.job : undefined,
  }),
  component: Payments,
});

function Payments() {
  const { gig: gigId, job: jobId } = Route.useSearch();
  const navigate = useNavigate();
  const [method, setMethod] = useState("card");
  const [card, setCard] = useState({ number: "", name: "", exp: "", cvc: "" });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const { data: gig } = useQuery({
    queryKey: ["pay-gig", gigId],
    enabled: !!gigId,
    queryFn: async () => (await supabase.from("gigs").select("id,title,starting_price,cover_url,profiles(display_name)").eq("id", gigId!).maybeSingle()).data,
  });
  const { data: job } = useQuery({
    queryKey: ["pay-job", jobId],
    enabled: !!jobId,
    queryFn: async () => (await supabase.from("jobs").select("id,title,budget_min,budget_max,profiles(display_name)").eq("id", jobId!).maybeSingle()).data,
  });

  const amount = gig?.starting_price ?? job?.budget_min ?? 0;
  const fee = +(amount * 0.05).toFixed(2);
  const total = +(amount + fee).toFixed(2);

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1100));
    setLoading(false);
    setDone(true);
    toast.success("Payment successful (demo)");
  }

  if (done) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="mx-auto max-w-md px-4 py-20 text-center">
          <CheckCircle2 className="mx-auto h-16 w-16 text-primary" />
          <h1 className="mt-4 font-display text-3xl font-bold">Payment received</h1>
          <p className="mt-2 text-sm text-muted-foreground">Your funds are held in escrow until the work is delivered.</p>
          <div className="mt-6 flex gap-3">
            <Link to="/messages" className="flex-1"><Button className="w-full">Open messages</Button></Link>
            <Link to="/dashboard" className="flex-1"><Button variant="secondary" className="w-full">Dashboard</Button></Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-10 md:grid-cols-3 md:px-6">
        <div className="md:col-span-2">
          <h1 className="font-display text-3xl font-bold">Checkout</h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground"><Lock className="h-3.5 w-3.5" /> Secure escrow payment</p>

          <form onSubmit={pay} className="mt-8 space-y-6">
            <div className="space-y-2">
              <Label>Payment method</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="card"><span className="flex items-center gap-2"><CreditCard className="h-4 w-4" /> Credit / debit card</span></SelectItem>
                  <SelectItem value="paypal"><span className="flex items-center gap-2"><Wallet className="h-4 w-4" /> PayPal</span></SelectItem>
                  <SelectItem value="bank"><span className="flex items-center gap-2"><Banknote className="h-4 w-4" /> Bank transfer</span></SelectItem>
                </SelectContent>
              </Select>
            </div>

            {method === "card" && (
              <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
                <div className="space-y-2"><Label>Card number</Label><Input required inputMode="numeric" placeholder="4242 4242 4242 4242" value={card.number} onChange={(e) => setCard({ ...card, number: e.target.value })} /></div>
                <div className="space-y-2"><Label>Name on card</Label><Input required value={card.name} onChange={(e) => setCard({ ...card, name: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Expiry</Label><Input required placeholder="MM/YY" value={card.exp} onChange={(e) => setCard({ ...card, exp: e.target.value })} /></div>
                  <div className="space-y-2"><Label>CVC</Label><Input required placeholder="123" value={card.cvc} onChange={(e) => setCard({ ...card, cvc: e.target.value })} /></div>
                </div>
              </div>
            )}
            {method === "paypal" && <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">You'll be redirected to PayPal to complete payment.</div>}
            {method === "bank" && <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">We'll email wire instructions after confirming.</div>}

            <Button type="submit" disabled={loading || !amount} className="w-full font-semibold">
              {loading ? "Processing…" : `Pay $${total.toFixed(2)}`}
            </Button>
            <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5 text-primary" /> Demo checkout — no real charge is made.</p>
          </form>
        </div>

        <aside className="md:sticky md:top-24 md:self-start">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Order summary</div>
            {gig && (
              <div className="mt-3 flex gap-3">
                <div className="h-14 w-14 overflow-hidden rounded-md bg-secondary">{gig.cover_url && <img src={gig.cover_url} className="h-full w-full object-cover" alt="" />}</div>
                <div className="flex-1">
                  <div className="line-clamp-2 text-sm font-medium">{gig.title}</div>
                  <div className="text-xs text-muted-foreground">by {gig.profiles?.display_name}</div>
                </div>
              </div>
            )}
            {job && !gig && (
              <div className="mt-3">
                <div className="text-sm font-medium">{job.title}</div>
                <div className="text-xs text-muted-foreground">Client: {job.profiles?.display_name}</div>
              </div>
            )}
            {!gig && !job && <p className="mt-3 text-sm text-muted-foreground">No item selected. <Link to="/gigs" className="text-primary">Browse gigs</Link>.</p>}

            <div className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>${amount.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Service fee (5%)</span><span>${fee.toFixed(2)}</span></div>
              <div className="flex justify-between border-t border-border pt-2 font-semibold"><span>Total</span><span className="text-primary">${total.toFixed(2)}</span></div>
            </div>
          </div>
        </aside>
      </div>
      <Footer />
    </div>
  );
}