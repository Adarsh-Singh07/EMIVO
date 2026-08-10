-- Enable RLS and setup policies for isolating tenants
-- FORCE ROW LEVEL SECURITY ensures policies apply even to table owner/superuser (required for Supabase)

-- Businesses table
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own business" ON public.businesses;
CREATE POLICY "Users can view their own business" 
  ON public.businesses 
  FOR SELECT 
  USING (
    id = current_setting('app.business_id', true)
    OR
    EXISTS (
        SELECT 1 FROM public.business_members bm
        WHERE bm.business_id = public.businesses.id 
        AND bm.user_id = current_setting('app.user_id', true)
    )
  );

DROP POLICY IF EXISTS "Admins/Owners can update their business" ON public.businesses;
CREATE POLICY "Admins/Owners can update their business" 
  ON public.businesses 
  FOR UPDATE
  USING (
    EXISTS (
        SELECT 1 FROM public.business_members bm
        WHERE bm.business_id = public.businesses.id 
        AND bm.user_id = current_setting('app.user_id', true)
        AND bm.role IN ('owner', 'platform_admin')
    )
  );


-- Business Members table
ALTER TABLE public.business_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_members FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view members of their business" ON public.business_members;
CREATE POLICY "Users can view members of their business" 
  ON public.business_members 
  FOR SELECT 
  USING (
    business_id = current_setting('app.business_id', true)
    OR
    user_id = current_setting('app.user_id', true)
  );


-- Outbox Events
ALTER TABLE public.outbox_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outbox_events FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "System can read/write outbox events" ON public.outbox_events;
CREATE POLICY "System can read/write outbox events" 
  ON public.outbox_events 
  FOR ALL 
  USING (true);
