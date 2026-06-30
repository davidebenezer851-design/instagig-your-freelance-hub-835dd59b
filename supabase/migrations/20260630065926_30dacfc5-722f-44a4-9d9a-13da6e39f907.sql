
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

INSERT INTO public.categories (slug, name, icon) VALUES
  ('design','Design','🎨'),
  ('development','Development','💻'),
  ('writing','Writing','✍️'),
  ('marketing','Marketing','📣'),
  ('video','Video & Animation','🎬'),
  ('ai','AI Services','🤖'),
  ('music','Music & Audio','🎵'),
  ('business','Business','📊')
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  freelancer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cover_letter TEXT NOT NULL,
  bid_amount NUMERIC(10,2) NOT NULL,
  delivery_days INT NOT NULL DEFAULT 7,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(job_id, freelancer_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.proposals TO authenticated;
GRANT ALL ON public.proposals TO service_role;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Freelancer manages own proposals" ON public.proposals
  FOR ALL TO authenticated
  USING (auth.uid() = freelancer_id) WITH CHECK (auth.uid() = freelancer_id);
CREATE POLICY "Client sees proposals on own jobs" ON public.proposals
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND j.client_id = auth.uid()));
CREATE POLICY "Client updates proposal on own jobs" ON public.proposals
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND j.client_id = auth.uid()));

ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS proposals_count INT NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.tg_proposals_count() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP='INSERT' THEN UPDATE public.jobs SET proposals_count=proposals_count+1 WHERE id=NEW.job_id;
  ELSIF TG_OP='DELETE' THEN UPDATE public.jobs SET proposals_count=GREATEST(0,proposals_count-1) WHERE id=OLD.job_id;
  END IF; RETURN COALESCE(NEW,OLD);
END $$;

DROP TRIGGER IF EXISTS proposals_count_trg ON public.proposals;
CREATE TRIGGER proposals_count_trg AFTER INSERT OR DELETE ON public.proposals
  FOR EACH ROW EXECUTE FUNCTION public.tg_proposals_count();

DROP TRIGGER IF EXISTS proposals_updated_at ON public.proposals;
CREATE TRIGGER proposals_updated_at BEFORE UPDATE ON public.proposals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number TEXT NOT NULL UNIQUE DEFAULT ('INV-' || to_char(now(),'YYYYMMDD') || '-' || substr(gen_random_uuid()::text,1,6)),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  notes TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending',
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sender or recipient sees invoice" ON public.invoices
  FOR SELECT TO authenticated USING (auth.uid() IN (sender_id, recipient_id));
CREATE POLICY "Sender creates invoice" ON public.invoices
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Sender updates own invoice" ON public.invoices
  FOR UPDATE TO authenticated USING (auth.uid() = sender_id);
CREATE POLICY "Recipient updates invoice status" ON public.invoices
  FOR UPDATE TO authenticated USING (auth.uid() = recipient_id);

DROP TRIGGER IF EXISTS invoices_updated_at ON public.invoices;
CREATE TRIGGER invoices_updated_at BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
