CREATE TABLE public.payment_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text,
  tier_slug text not null,
  tier_title text,
  amount numeric,
  method text not null default 'crypto',
  crypto_asset text,
  wallet_address text,
  tx_hash text,
  sender_address text,
  note text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_requests TO authenticated;
GRANT INSERT ON public.payment_requests TO anon;
GRANT ALL ON public.payment_requests TO service_role;
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit a payment request" ON public.payment_requests FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Users can view own payment requests" ON public.payment_requests FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all payment requests" ON public.payment_requests FOR SELECT TO authenticated USING (authz.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update payment requests" ON public.payment_requests FOR UPDATE TO authenticated USING (authz.has_role(auth.uid(), 'admin')) WITH CHECK (authz.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete payment requests" ON public.payment_requests FOR DELETE TO authenticated USING (authz.has_role(auth.uid(), 'admin'));