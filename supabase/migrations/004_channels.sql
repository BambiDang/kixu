-- -------------------------------------------------------
-- Channels & Sections
-- Adds a Circle.so-style channel structure to communities.
-- Each community has sections; each section has channels.
-- Topics belong to a channel (nullable for backwards compat).
-- -------------------------------------------------------

CREATE TABLE public.channel_sections (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  name         text NOT NULL,
  position     integer NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.channels (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  section_id   uuid REFERENCES public.channel_sections(id) ON DELETE SET NULL,
  name         text NOT NULL,
  description  text,
  icon_emoji   text NOT NULL DEFAULT '💬',
  position     integer NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Add channel_id to topics (nullable — existing topics appear in general feed)
ALTER TABLE public.topics ADD COLUMN channel_id uuid REFERENCES public.channels(id) ON DELETE SET NULL;

-- -------------------------------------------------------
-- RLS
-- -------------------------------------------------------

ALTER TABLE public.channel_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;

-- channel_sections: members can read; admins can write
CREATE POLICY "cs_select_member" ON public.channel_sections FOR SELECT USING (
  public.is_community_member(community_id)
);
CREATE POLICY "cs_insert_admin" ON public.channel_sections FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.community_members cm WHERE cm.community_id = community_id AND cm.user_id = auth.uid() AND cm.role = 'admin')
);
CREATE POLICY "cs_update_admin" ON public.channel_sections FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.community_members cm WHERE cm.community_id = channel_sections.community_id AND cm.user_id = auth.uid() AND cm.role = 'admin')
);
CREATE POLICY "cs_delete_admin" ON public.channel_sections FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.community_members cm WHERE cm.community_id = channel_sections.community_id AND cm.user_id = auth.uid() AND cm.role = 'admin')
);

-- channels: members can read; admins can write
CREATE POLICY "ch_select_member" ON public.channels FOR SELECT USING (
  public.is_community_member(community_id)
);
CREATE POLICY "ch_insert_admin" ON public.channels FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.community_members cm WHERE cm.community_id = community_id AND cm.user_id = auth.uid() AND cm.role = 'admin')
);
CREATE POLICY "ch_update_admin" ON public.channels FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.community_members cm WHERE cm.community_id = channels.community_id AND cm.user_id = auth.uid() AND cm.role = 'admin')
);
CREATE POLICY "ch_delete_admin" ON public.channels FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.community_members cm WHERE cm.community_id = channels.community_id AND cm.user_id = auth.uid() AND cm.role = 'admin')
);

-- -------------------------------------------------------
-- Enable Realtime on new tables
-- -------------------------------------------------------
-- Run in Supabase Dashboard → Database → Replication to enable these tables.
-- Or via SQL:
ALTER PUBLICATION supabase_realtime ADD TABLE public.channels;
ALTER PUBLICATION supabase_realtime ADD TABLE public.channel_sections;

-- -------------------------------------------------------
-- Seed a default "General" channel for existing communities
-- -------------------------------------------------------
INSERT INTO public.channels (community_id, name, icon_emoji, position)
SELECT id, 'General', '💬', 0
FROM public.communities
ON CONFLICT DO NOTHING;
