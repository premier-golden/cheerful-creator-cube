CREATE TABLE public.checkout_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  checkout_session_id uuid NOT NULL,
  event text NOT NULL,
  pack text,
  shipping text,
  error_code text,
  error_message text,
  stripe_payment_intent_id text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  pathname text,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT ALL ON public.checkout_events TO service_role;

ALTER TABLE public.checkout_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No public access to checkout events"
  ON public.checkout_events
  FOR SELECT
  TO authenticated
  USING (false);

CREATE INDEX checkout_events_created_at_idx ON public.checkout_events (created_at DESC);
CREATE INDEX checkout_events_session_idx ON public.checkout_events (checkout_session_id);
CREATE INDEX checkout_events_event_idx ON public.checkout_events (event);
CREATE UNIQUE INDEX checkout_events_unique_terminal_idx
  ON public.checkout_events (checkout_session_id, event)
  WHERE event IN ('checkout_view', 'payment_succeeded');