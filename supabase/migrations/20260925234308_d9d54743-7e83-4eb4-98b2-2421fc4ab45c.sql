CREATE TABLE public.whop_payments (
  payment_id text PRIMARY KEY,
  status text NOT NULL DEFAULT 'pending',
  last_event_type text,
  amount_cents integer,
  currency text,
  pack text,
  shipping text,
  shopify_status text NOT NULL DEFAULT 'pending',
  shopify_order_id text,
  utmify_status text NOT NULL DEFAULT 'pending',
  tiktok_status text NOT NULL DEFAULT 'pending',
  attribution_status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);
GRANT ALL ON public.whop_payments TO service_role;
ALTER TABLE public.whop_payments ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.whop_webhook_events (
  webhook_id text PRIMARY KEY,
  event_type text,
  payment_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.whop_webhook_events TO service_role;
ALTER TABLE public.whop_webhook_events ENABLE ROW LEVEL SECURITY;