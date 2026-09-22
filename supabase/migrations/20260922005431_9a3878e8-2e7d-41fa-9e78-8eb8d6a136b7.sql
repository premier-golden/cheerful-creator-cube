CREATE TABLE public.tiktok_conversions (
  stripe_payment_intent_id text PRIMARY KEY,
  status text NOT NULL DEFAULT 'sending',
  amount_cents integer,
  currency text,
  detail text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.tiktok_conversions TO service_role;

ALTER TABLE public.tiktok_conversions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tiktok_conversions_no_client_read"
ON public.tiktok_conversions
FOR SELECT
TO authenticated
USING (false);