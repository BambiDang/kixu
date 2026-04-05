-- =============================================================
-- Kixu MVP — Initial Schema
-- Tables first, then RLS policies, then triggers
-- =============================================================

-- -------------------------------------------------------
-- ALL TABLES (no policies yet — policies reference other tables)
-- -------------------------------------------------------

CREATE TABLE public.users (
  id                    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                 text UNIQUE NOT NULL,
  display_name          text,
  username              text UNIQUE,
  avatar_url            text,
  bio                   text,
  stripe_account_id     text,
  stripe_account_active boolean NOT NULL DEFAULT false,
  created_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT username_format CHECK (username ~ '^[a-zA-Z0-9_]{3,30}$')
);

CREATE TABLE public.communities (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                    text NOT NULL CHECK (char_length(name) <= 80),
  slug                    text UNIQUE NOT NULL,
  description             text,
  category                text,
  cover_image_url         text,
  created_by              uuid NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
  price_monthly           integer NOT NULL DEFAULT 0,
  stripe_price_id         text,
  is_anonymous_enabled    boolean NOT NULL DEFAULT false,
  languages               jsonb,
  lp_what_youll_get       jsonb,
  lp_creator_photo_url    text,
  lp_creator_bio          text,
  lp_creator_achievements text[],
  lp_testimonials         jsonb,
  created_at              timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.community_members (
  community_id  uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role          text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  can_pin       boolean NOT NULL DEFAULT false,
  joined_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (community_id, user_id)
);

CREATE TABLE public.memberships (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id            uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id                 uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  stripe_subscription_id  text NOT NULL,
  stripe_customer_id      text NOT NULL,
  status                  text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due')),
  current_period_end      timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.topics (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id        uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  root_message        text NOT NULL,
  created_by          uuid NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
  is_anonymous_topic  boolean NOT NULL DEFAULT false,
  last_activity_at    timestamptz NOT NULL DEFAULT now(),
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.messages (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id      uuid NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content       text NOT NULL,
  is_anonymous  boolean NOT NULL DEFAULT false,
  reply_to_id   uuid REFERENCES public.messages(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.reactions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id  uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  emoji       text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id, emoji)
);

CREATE TABLE public.pinned_topics (
  topic_id      uuid PRIMARY KEY REFERENCES public.topics(id) ON DELETE CASCADE,
  community_id  uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  pinned_by     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  pinned_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.topic_reads (
  topic_id      uuid NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  last_read_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (topic_id, user_id)
);

CREATE TABLE public.topic_anonymous_identities (
  topic_id    uuid NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  pseudonym   text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (topic_id, user_id),
  UNIQUE (topic_id, pseudonym)
);

CREATE TABLE public.topic_follows (
  topic_id    uuid NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (topic_id, user_id)
);

CREATE TABLE public.cohort_alumni (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id  uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  label         text NOT NULL,
  awarded_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.session_types (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id        uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  community_id      uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  title             text NOT NULL,
  type              text NOT NULL CHECK (type IN ('one_on_one', 'group')),
  duration_minutes  integer NOT NULL,
  price             integer NOT NULL,
  capacity          integer,
  is_active         boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.slots (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_type_id   uuid NOT NULL REFERENCES public.session_types(id) ON DELETE CASCADE,
  start_time        timestamptz NOT NULL,
  status            text NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'booked', 'cancelled')),
  booked_count      integer NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.bookings (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id                     uuid NOT NULL REFERENCES public.slots(id) ON DELETE RESTRICT,
  user_id                     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  stripe_payment_intent_id    text,
  stripe_checkout_session_id  text UNIQUE,
  amount_paid                 integer NOT NULL,
  platform_fee                integer NOT NULL,
  status                      text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'refunded')),
  created_at                  timestamptz NOT NULL DEFAULT now()
);

-- -------------------------------------------------------
-- ENABLE RLS (all tables)
-- -------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pinned_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_anonymous_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cohort_alumni ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------
-- RLS POLICIES (all tables exist now)
-- -------------------------------------------------------

-- users
CREATE POLICY "users_select_public" ON public.users FOR SELECT USING (true);
CREATE POLICY "users_update_own" ON public.users FOR UPDATE USING (auth.uid() = id);

-- communities
CREATE POLICY "communities_select_public" ON public.communities FOR SELECT USING (true);
CREATE POLICY "communities_insert_auth" ON public.communities FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "communities_update_admin" ON public.communities FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.community_members cm WHERE cm.community_id = id AND cm.user_id = auth.uid() AND cm.role = 'admin')
);
CREATE POLICY "communities_delete_admin" ON public.communities FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.community_members cm WHERE cm.community_id = id AND cm.user_id = auth.uid() AND cm.role = 'admin')
);

-- community_members
CREATE POLICY "cm_select_member" ON public.community_members FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.community_members me WHERE me.community_id = community_id AND me.user_id = auth.uid())
);
CREATE POLICY "cm_insert_auth" ON public.community_members FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "cm_delete_admin_or_self" ON public.community_members FOR DELETE USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.community_members admin WHERE admin.community_id = community_id AND admin.user_id = auth.uid() AND admin.role = 'admin')
);

-- memberships
CREATE POLICY "memberships_select_own" ON public.memberships FOR SELECT USING (user_id = auth.uid());

-- topics
CREATE POLICY "topics_select_member" ON public.topics FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.community_members cm WHERE cm.community_id = topics.community_id AND cm.user_id = auth.uid())
);
CREATE POLICY "topics_insert_member" ON public.topics FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.community_members cm WHERE cm.community_id = community_id AND cm.user_id = auth.uid())
);
CREATE POLICY "topics_update_admin" ON public.topics FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.community_members cm WHERE cm.community_id = topics.community_id AND cm.user_id = auth.uid() AND cm.role = 'admin')
);

-- messages
CREATE POLICY "messages_select_member" ON public.messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.topics t JOIN public.community_members cm ON cm.community_id = t.community_id WHERE t.id = messages.topic_id AND cm.user_id = auth.uid())
);
CREATE POLICY "messages_insert_member" ON public.messages FOR INSERT WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (SELECT 1 FROM public.topics t JOIN public.community_members cm ON cm.community_id = t.community_id WHERE t.id = topic_id AND cm.user_id = auth.uid())
);
CREATE POLICY "messages_delete_admin" ON public.messages FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.topics t JOIN public.community_members cm ON cm.community_id = t.community_id WHERE t.id = messages.topic_id AND cm.user_id = auth.uid() AND cm.role = 'admin')
);

-- reactions
CREATE POLICY "reactions_select_member" ON public.reactions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.messages m JOIN public.topics t ON t.id = m.topic_id JOIN public.community_members cm ON cm.community_id = t.community_id WHERE m.id = reactions.message_id AND cm.user_id = auth.uid())
);
CREATE POLICY "reactions_insert_member" ON public.reactions FOR INSERT WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (SELECT 1 FROM public.messages m JOIN public.topics t ON t.id = m.topic_id JOIN public.community_members cm ON cm.community_id = t.community_id WHERE m.id = message_id AND cm.user_id = auth.uid())
);
CREATE POLICY "reactions_delete_own" ON public.reactions FOR DELETE USING (user_id = auth.uid());

-- pinned_topics
CREATE POLICY "pinned_select_member" ON public.pinned_topics FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.community_members cm WHERE cm.community_id = pinned_topics.community_id AND cm.user_id = auth.uid())
);
CREATE POLICY "pinned_insert_admin_or_pin" ON public.pinned_topics FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.community_members cm WHERE cm.community_id = community_id AND cm.user_id = auth.uid() AND (cm.role = 'admin' OR cm.can_pin = true))
);
CREATE POLICY "pinned_delete_admin_or_pin" ON public.pinned_topics FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.community_members cm WHERE cm.community_id = pinned_topics.community_id AND cm.user_id = auth.uid() AND (cm.role = 'admin' OR cm.can_pin = true))
);

-- topic_reads
CREATE POLICY "topic_reads_own" ON public.topic_reads FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- topic_anonymous_identities
CREATE POLICY "tai_select_pseudonym_member" ON public.topic_anonymous_identities FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.topics t JOIN public.community_members cm ON cm.community_id = t.community_id WHERE t.id = topic_anonymous_identities.topic_id AND cm.user_id = auth.uid())
);

-- topic_follows
CREATE POLICY "topic_follows_own" ON public.topic_follows FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- cohort_alumni
CREATE POLICY "alumni_select_member" ON public.cohort_alumni FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.community_members cm WHERE cm.community_id = cohort_alumni.community_id AND cm.user_id = auth.uid())
);
CREATE POLICY "alumni_insert_admin" ON public.cohort_alumni FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.community_members cm WHERE cm.community_id = community_id AND cm.user_id = auth.uid() AND cm.role = 'admin')
);
CREATE POLICY "alumni_delete_admin" ON public.cohort_alumni FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.community_members cm WHERE cm.community_id = cohort_alumni.community_id AND cm.user_id = auth.uid() AND cm.role = 'admin')
);

-- session_types
CREATE POLICY "st_select_member" ON public.session_types FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.community_members cm WHERE cm.community_id = session_types.community_id AND cm.user_id = auth.uid())
);
CREATE POLICY "st_insert_admin" ON public.session_types FOR INSERT WITH CHECK (
  auth.uid() = creator_id
  AND EXISTS (SELECT 1 FROM public.community_members cm WHERE cm.community_id = community_id AND cm.user_id = auth.uid() AND cm.role = 'admin')
);
CREATE POLICY "st_update_admin" ON public.session_types FOR UPDATE USING (creator_id = auth.uid());
CREATE POLICY "st_delete_admin" ON public.session_types FOR DELETE USING (creator_id = auth.uid());

-- slots
CREATE POLICY "slots_select_member" ON public.slots FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.session_types st JOIN public.community_members cm ON cm.community_id = st.community_id WHERE st.id = slots.session_type_id AND cm.user_id = auth.uid())
);
CREATE POLICY "slots_insert_admin" ON public.slots FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.session_types st JOIN public.community_members cm ON cm.community_id = st.community_id WHERE st.id = session_type_id AND cm.user_id = auth.uid() AND cm.role = 'admin')
);
CREATE POLICY "slots_update_admin" ON public.slots FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.session_types st JOIN public.community_members cm ON cm.community_id = st.community_id WHERE st.id = slots.session_type_id AND cm.user_id = auth.uid() AND cm.role = 'admin')
);

-- bookings
CREATE POLICY "bookings_select_own_or_creator" ON public.bookings FOR SELECT USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.slots s JOIN public.session_types st ON st.id = s.session_type_id WHERE s.id = bookings.slot_id AND st.creator_id = auth.uid())
);

-- -------------------------------------------------------
-- TRIGGERS
-- -------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email) VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.update_topic_last_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.topics SET last_activity_at = NOW() WHERE id = NEW.topic_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER on_message_insert AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.update_topic_last_activity();

CREATE OR REPLACE FUNCTION public.update_slot_status()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.slots s SET status = 'booked'
  FROM public.session_types st
  WHERE s.id = NEW.slot_id AND st.id = s.session_type_id AND s.booked_count >= st.capacity AND st.capacity IS NOT NULL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER on_booking_insert AFTER INSERT ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.update_slot_status();

CREATE OR REPLACE FUNCTION public.auto_follow_topic_on_post()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.topic_follows (topic_id, user_id) VALUES (NEW.topic_id, NEW.user_id)
  ON CONFLICT (topic_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER on_message_insert_follow AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.auto_follow_topic_on_post();

CREATE OR REPLACE FUNCTION public.assign_anonymous_pseudonym()
RETURNS TRIGGER AS $$
DECLARE
  v_count   integer;
  v_pseudonym text;
BEGIN
  IF NEW.is_anonymous = false THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.topic_anonymous_identities WHERE topic_id = NEW.topic_id AND user_id = NEW.user_id) THEN RETURN NEW; END IF;
  SELECT COUNT(*) INTO v_count FROM public.topic_anonymous_identities WHERE topic_id = NEW.topic_id;
  v_pseudonym := 'Anonymous_' || LPAD((v_count + 1)::text, 2, '0');
  INSERT INTO public.topic_anonymous_identities (topic_id, user_id, pseudonym)
  VALUES (NEW.topic_id, NEW.user_id, v_pseudonym)
  ON CONFLICT (topic_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
CREATE TRIGGER on_anonymous_message_insert AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.assign_anonymous_pseudonym();
