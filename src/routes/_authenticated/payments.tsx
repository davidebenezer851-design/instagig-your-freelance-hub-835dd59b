import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Banknote, CheckCircle2, CreditCard, Lock, ShieldCheck, Star, Wallet, Zap } from "lucide-react";
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
  const [method, setMethod] = useState("card");
  const [card, setCard] = useState({ number: "", name: "", exp: "", cvc: "" });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [milestone, setMilestone] = useState<"full" | "milestone">("full");

  const { data: gig } = useQuery({
    queryKey: ["pay-gig", gigId],
    enabled: !!gigId,
    queryFn: async () => (await supabase.from("gigs").select("id,title,starting_price,delivery_days,cover_url,rating,reviews_count,profiles(display_name,avatar_url,headline,location)").eq("id", gigId!).maybeSingle()).data,
  });
  const { data: job } = useQuery({
    queryKey: ["pay-job", jobId],
    enabled: !!jobId,
    queryFn: async () => (await supabase.from("jobs").select("id,title,budget_min,budget_max,profiles(display_name)").eq("id", jobId!).maybeSingle()).data,
  });

  const amount = gig?.starting_price ?? job?.budget_min ?? 0;
  const fee = +(amount * 0.05).toFixed(2);
  const processing = +(amount * 0.029 + 0.30).toFixed(2);
  const total = +(amount + fee + processing).toFixed(2);
  const firstMilestone = +(amount * 0.5).toFixed(2);

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1100));
    setLoading(false);
    setDone(true);
    toast.success("Funds secured in escrow");
  }

  if (done) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-primary/10">
            <CheckCircle2 className="h-12 w-12 text-primary" />
          </div>
          <h1 className="mt-6 font-display text-3xl font-bold">You're hired-up!</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            ${total.toFixed(2)} is secured in escrow. The freelancer has been notified and can start work immediately.
          </p>
          <div className="mt-8 rounded-2xl border border-border bg-card p-5 text-left text-sm">
            <div className="font-semibold">What's next</div>
            <ol className="mt-3 space-y-2 text-muted-foreground">
              <li className="flex gap-2"><span className="text-primary">1.</span>Chat with your freelancer to share assets and requirements.</li>
              <li className="flex gap-2"><span className="text-primary">2.</span>Review deliverables when the milestone is submitted.</li>
              <li className="flex gap-2"><span className="text-primary">3.</span>Approve to release funds, or request revisions.</li>
            </ol>
          </div>
          <div className="mt-6 flex gap-3">
            <Link to="/messages" className="flex-1"><Button className="w-full font-semibold">Open messages</Button></Link>
            <Link to="/dashboard" className="flex-1"><Button variant="secondary" className="w-full">Dashboard</Button></Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const methods = [
    { id: "card", label: "Credit / debit card", sub: "Visa, Mastercard, Amex", icon: CreditCard },
    { id: "paypal", label: "PayPal", sub: "Pay with your PayPal balance", icon: Wallet },
    { id: "bank", label: "Bank transfer", sub: "ACH / wire — 1–3 business days", icon: Banknote },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">
        <div className="mb-8">
          <Link to="/gigs" className="text-xs text-muted-foreground hover:text-primary">← Back to browsing</Link>
          <h1 className="mt-2 font-display text-3xl font-bold md:text-4xl">Confirm and pay</h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Lock className="h-3.5 w-3.5 text-primary" /> Payment is held in InstaGIG escrow until the work is approved
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-5">
          <form onSubmit={pay} className="space-y-6 md:col-span-3">
            {/* Funding option */}
            <Section step="1" title="Funding option">
              <div className="grid gap-3 sm:grid-cols-2">
                <Choice
                  active={milestone === "full"} onClick={() => setMilestone("full")}
                  title="Pay in full" sub={`Release $${amount.toFixed(2)} on delivery`}
                />
                <Choice
                  active={milestone === "milestone"} onClick={() => setMilestone("milestone")}
                  title="By milestones" sub={`First milestone $${firstMilestone.toFixed(2)}`}
                />
              </div>
              <p className="mt-3 flex items-start gap-2 rounded-lg border border-border bg-secondary/40 p-3 text-xs text-muted-foreground">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                Funds are held in escrow and only released when you approve the work. You're protected by InstaGIG's Payment Protection.
              </p>
            </Section>

            {/* Payment method */}
            <Section step="2" title="Payment method">
              <div className="space-y-2">
                {methods.map((m) => (
                  <button
                    type="button" key={m.id} onClick={() => setMethod(m.id)}
                    className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition ${method === m.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                  >
                    <div className={`grid h-10 w-10 place-items-center rounded-lg ${method === m.id ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
                      <m.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{m.label}</div>
                      <div className="text-xs text-muted-foreground">{m.sub}</div>
                    </div>
                    <div className={`h-4 w-4 rounded-full border ${method === m.id ? "border-primary bg-primary" : "border-border"}`}>
                      {method === m.id && <span className="block h-full w-full scale-50 rounded-full bg-primary-foreground" />}
                    </div>
                  </button>
                ))}
              </div>

              {method === "card" && (
                <div className="mt-4 space-y-4 rounded-xl border border-border bg-secondary/30 p-5">
                  <div className="space-y-2"><Label>Card number</Label><Input required inputMode="numeric" placeholder="4242 4242 4242 4242" value={card.number} onChange={(e) => setCard({ ...card, number: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Name on card</Label><Input required value={card.name} onChange={(e) => setCard({ ...card, name: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Expiry</Label><Input required placeholder="MM/YY" value={card.exp} onChange={(e) => setCard({ ...card, exp: e.target.value })} /></div>
                    <div className="space-y-2"><Label>CVC</Label><Input required placeholder="123" value={card.cvc} onChange={(e) => setCard({ ...card, cvc: e.target.value })} /></div>
                  </div>
                </div>
              )}
              {method === "paypal" && <div className="mt-4 rounded-xl border border-border bg-secondary/30 p-5 text-sm text-muted-foreground">You'll be redirected to PayPal to authorize the payment.</div>}
              {method === "bank" && <div className="mt-4 rounded-xl border border-border bg-secondary/30 p-5 text-sm text-muted-foreground">Wire instructions will be emailed to you after you confirm.</div>}
            </Section>

            {/* Review */}
            <Section step="3" title="Review and pay">
              <Button type="submit" disabled={loading || !amount} className="h-12 w-full text-base font-bold">
                {loading ? "Processing…" : `Confirm and pay $${total.toFixed(2)}`}
              </Button>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                By confirming, you agree to InstaGIG's Terms of Service and Escrow Agreement.
              </p>
            </Section>
          </form>

          {/* Summary */}
          <aside className="md:col-span-2">
            <div className="md:sticky md:top-24 md:self-start space-y-4">
              <div className="overflow-hidden rounded-2xl border border-border bg-card">
                <div className="border-b border-border p-5">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Order details</div>
                  {gig && (
                    <div className="mt-4 flex gap-3">
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-secondary">
                        {gig.cover_url ? <img src={gig.cover_url} className="h-full w-full object-cover" alt="" /> : <div className="grid h-full w-full place-items-center text-xs font-bold text-primary/60">iG</div>}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="line-clamp-2 text-sm font-semibold">{gig.title}</div>
                        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                          <div className="grid h-4 w-4 place-items-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">{(gig.profiles?.display_name?.[0] ?? "?").toUpperCase()}</div>
                          <span className="truncate">{gig.profiles?.display_name}</span>
                          {gig.rating ? <span className="ml-1 flex items-center gap-0.5"><Star className="h-3 w-3 fill-primary text-primary" />{gig.rating.toFixed(1)}</span> : null}
                        </div>
                        {gig.delivery_days && (
                          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Zap className="h-3 w-3 text-primary" /> {gig.delivery_days}-day delivery</div>
                        )}
                      </div>
                    </div>
                  )}
                  {job && !gig && (
                    <div className="mt-4">
                      <div className="text-sm font-semibold">{job.title}</div>
                      <div className="mt-1 text-xs text-muted-foreground">Client: {job.profiles?.display_name}</div>
                    </div>
                  )}
                  {!gig && !job && <p className="mt-3 text-sm text-muted-foreground">No item selected. <Link to="/gigs" className="text-primary">Browse gigs</Link>.</p>}
                </div>

                <div className="space-y-3 p-5 text-sm">
                  <Row label="Subtotal" value={`$${amount.toFixed(2)}`} />
                  <Row label="Service fee (5%)" value={`$${fee.toFixed(2)}`} hint="Funds InstaGIG protection & escrow." />
                  <Row label="Processing fee" value={`$${processing.toFixed(2)}`} />
                  <div className="border-t border-border pt-3 text-base">
                    <Row label={<span className="font-bold">Total</span>} value={<span className="font-display text-xl font-bold text-primary">${total.toFixed(2)}</span>} />
                  </div>
                  {milestone === "milestone" && (
                    <div className="mt-1 flex justify-between rounded-lg bg-primary/5 px-3 py-2 text-xs">
                      <span className="text-muted-foreground">Charged now (milestone 1)</span>
                      <span className="font-semibold text-primary">${firstMilestone.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div>
                    <div className="text-sm font-semibold">Payment Protection</div>
                    <p className="mt-1 text-xs text-muted-foreground">Funds are released to your freelancer only when you approve the delivered work.</p>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
      <Footer />
    </div>
  );
}

function Section({ step, title, children }: { step: string; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="grid h-7 w-7 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{step}</div>
        <h2 className="font-display text-lg font-semibold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Choice({ active, onClick, title, sub }: { active: boolean; onClick: () => void; title: string; sub: string }) {
  return (
    <button type="button" onClick={onClick} className={`rounded-xl border p-4 text-left transition ${active ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
    </button>
  );
}

function Row({ label, value, hint }: { label: React.ReactNode; value: React.ReactNode; hint?: string }) {
  return (
    <div>
      <div className="flex items-center justify-between"><span className="text-muted-foreground">{label}</span><span>{value}</span></div>
      {hint && <div className="mt-0.5 text-[11px] text-muted-foreground/80">{hint}</div>}
    </div>
  );
}