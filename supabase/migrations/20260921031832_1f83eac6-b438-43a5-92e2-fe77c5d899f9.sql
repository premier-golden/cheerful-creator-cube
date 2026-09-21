CREATE TABLE public.sale_attributions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stripe_payment_intent_id TEXT NOT NULL UNIQUE,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'gbp',
  pack TEXT,
  customer_name TEXT,
  customer_email TEXT,
  customer_country TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  src TEXT,
  sck TEXT,
  fbclid TEXT,
  ttclid TEXT,
  gclid TEXT,
  livemode BOOLEAN NOT NULL DEFAULT true,
  utmify_status TEXT,
  paid_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT ALL ON public.sale_attributions TO service_role;

ALTER TABLE public.sale_attributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No public access to sale attributions"
ON public.sale_attributions FOR SELECT TO authenticated USING (false);

CREATE INDEX sale_attributions_paid_at_idx ON public.sale_attributions (paid_at DESC);