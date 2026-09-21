CREATE TABLE public.checkout_initiations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pack TEXT,
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
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT ALL ON public.checkout_initiations TO service_role;
ALTER TABLE public.checkout_initiations ENABLE ROW LEVEL SECURITY;