-- The original cm_select_member policy was self-referential, causing infinite
-- recursion checks in PostgreSQL. Replace with a direct user_id check.
-- Admins can still see all members via the service client (settings page).

DROP POLICY IF EXISTS "cm_select_member" ON public.community_members;

-- Each user can always see their own membership row(s)
CREATE POLICY "cm_select_own" ON public.community_members
  FOR SELECT USING (user_id = auth.uid());

-- Members can see all other members in communities they belong to.
-- Uses a security definer function to avoid self-referential recursion.
CREATE OR REPLACE FUNCTION public.is_community_member(cid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.community_members
    WHERE community_id = cid AND user_id = auth.uid()
  );
$$;

CREATE POLICY "cm_select_fellow_member" ON public.community_members
  FOR SELECT USING (public.is_community_member(community_id));
