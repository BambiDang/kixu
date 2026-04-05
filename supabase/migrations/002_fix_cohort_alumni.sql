-- -------------------------------------------------------
-- Fix: allow authenticated users to insert their own public.users row.
-- The trigger covers new signups, but users who signed up before the
-- trigger was applied need to be able to self-upsert their row.
-- -------------------------------------------------------
CREATE POLICY "users_insert_own" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

-- -------------------------------------------------------
-- Fix: sync any auth.users rows that are missing from public.users
-- (happens when user signed up before the handle_new_user trigger was added).
-- -------------------------------------------------------
INSERT INTO public.users (id, email)
SELECT au.id, au.email
FROM auth.users au
WHERE NOT EXISTS (SELECT 1 FROM public.users pu WHERE pu.id = au.id)
ON CONFLICT (id) DO NOTHING;

-- -------------------------------------------------------
-- Fix: recover any creators who have no community_members row.
-- -------------------------------------------------------
INSERT INTO public.community_members (community_id, user_id, role, can_pin)
SELECT c.id, c.created_by, 'admin', true
FROM public.communities c
WHERE NOT EXISTS (
  SELECT 1 FROM public.community_members cm
  WHERE cm.community_id = c.id AND cm.user_id = c.created_by
)
ON CONFLICT DO NOTHING;

-- -------------------------------------------------------
-- Drop and recreate cohort_alumni with the correct schema.
-- The original migration had label/user_id (wrong); this table stores
-- named alumni for display on the community landing page and does not
-- require alumni to be platform users.

DROP TABLE IF EXISTS public.cohort_alumni CASCADE;

CREATE TABLE public.cohort_alumni (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id  uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  name          text NOT NULL,
  cohort_name   text,
  achievement   text,
  linkedin_url  text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cohort_alumni ENABLE ROW LEVEL SECURITY;

CREATE POLICY "alumni_select_member" ON public.cohort_alumni FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.community_members cm WHERE cm.community_id = cohort_alumni.community_id AND cm.user_id = auth.uid())
);
CREATE POLICY "alumni_insert_admin" ON public.cohort_alumni FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.community_members cm WHERE cm.community_id = community_id AND cm.user_id = auth.uid() AND cm.role = 'admin')
);
CREATE POLICY "alumni_delete_admin" ON public.cohort_alumni FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.community_members cm WHERE cm.community_id = cohort_alumni.community_id AND cm.user_id = auth.uid() AND cm.role = 'admin')
);
