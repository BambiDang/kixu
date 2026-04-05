-- -------------------------------------------------------
-- Courses
-- Free or separately-priced structured learning content.
-- Each course has modules → lessons + downloads.
-- -------------------------------------------------------

CREATE TABLE public.courses (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id    uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  title           text NOT NULL,
  description     text,
  cover_image_url text,
  price           integer NOT NULL DEFAULT 0,   -- cents; 0 = free for all members
  stripe_price_id text,
  position        integer NOT NULL DEFAULT 0,
  is_published    boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.course_modules (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id  uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title      text NOT NULL,
  position   integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.course_lessons (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id  uuid NOT NULL REFERENCES public.course_modules(id) ON DELETE CASCADE,
  title      text NOT NULL,
  content    text,       -- rich text description
  video_url  text,       -- YouTube / Vimeo embed URL
  position   integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.course_downloads (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id  uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title      text NOT NULL,
  url        text NOT NULL,   -- external URL (Drive, Dropbox, etc.)
  file_type  text,            -- display label e.g. "PDF", "ZIP"
  position   integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.course_enrollments (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id                   uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id                     uuid NOT NULL REFERENCES public.users(id),
  stripe_checkout_session_id  text,
  amount_paid                 integer NOT NULL DEFAULT 0,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, user_id)
);

-- -------------------------------------------------------
-- RLS
-- -------------------------------------------------------

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;

-- courses: members see published; admins see all (including drafts)
CREATE POLICY "courses_select" ON public.courses FOR SELECT USING (
  public.is_community_member(community_id) AND (
    is_published OR
    EXISTS (
      SELECT 1 FROM public.community_members cm
      WHERE cm.community_id = courses.community_id
        AND cm.user_id = auth.uid()
        AND cm.role = 'admin'
    )
  )
);
CREATE POLICY "courses_insert_admin" ON public.courses FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.community_members cm
    WHERE cm.community_id = community_id
      AND cm.user_id = auth.uid()
      AND cm.role = 'admin'
  )
);
CREATE POLICY "courses_update_admin" ON public.courses FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.community_members cm
    WHERE cm.community_id = courses.community_id
      AND cm.user_id = auth.uid()
      AND cm.role = 'admin'
  )
);
CREATE POLICY "courses_delete_admin" ON public.courses FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.community_members cm
    WHERE cm.community_id = courses.community_id
      AND cm.user_id = auth.uid()
      AND cm.role = 'admin'
  )
);

-- course_modules: select if user can see parent course; all if admin
CREATE POLICY "course_modules_select" ON public.course_modules FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = course_id
      AND public.is_community_member(c.community_id)
      AND (
        c.is_published OR
        EXISTS (
          SELECT 1 FROM public.community_members cm
          WHERE cm.community_id = c.community_id
            AND cm.user_id = auth.uid()
            AND cm.role = 'admin'
        )
      )
  )
);
CREATE POLICY "course_modules_write_admin" ON public.course_modules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      JOIN public.community_members cm ON cm.community_id = c.community_id
      WHERE c.id = course_id
        AND cm.user_id = auth.uid()
        AND cm.role = 'admin'
    )
  );

-- course_lessons
CREATE POLICY "course_lessons_select" ON public.course_lessons FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.course_modules m
    JOIN public.courses c ON c.id = m.course_id
    WHERE m.id = module_id
      AND public.is_community_member(c.community_id)
      AND (
        c.is_published OR
        EXISTS (
          SELECT 1 FROM public.community_members cm
          WHERE cm.community_id = c.community_id
            AND cm.user_id = auth.uid()
            AND cm.role = 'admin'
        )
      )
  )
);
CREATE POLICY "course_lessons_write_admin" ON public.course_lessons
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.course_modules m
      JOIN public.courses c ON c.id = m.course_id
      JOIN public.community_members cm ON cm.community_id = c.community_id
      WHERE m.id = module_id
        AND cm.user_id = auth.uid()
        AND cm.role = 'admin'
    )
  );

-- course_downloads
CREATE POLICY "course_downloads_select" ON public.course_downloads FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = course_id
      AND public.is_community_member(c.community_id)
      AND (
        c.is_published OR
        EXISTS (
          SELECT 1 FROM public.community_members cm
          WHERE cm.community_id = c.community_id
            AND cm.user_id = auth.uid()
            AND cm.role = 'admin'
        )
      )
  )
);
CREATE POLICY "course_downloads_write_admin" ON public.course_downloads
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      JOIN public.community_members cm ON cm.community_id = c.community_id
      WHERE c.id = course_id
        AND cm.user_id = auth.uid()
        AND cm.role = 'admin'
    )
  );

-- course_enrollments: own rows only; insert via service role (webhook) or direct for $0
CREATE POLICY "enrollments_select_own" ON public.course_enrollments
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "enrollments_insert_own" ON public.course_enrollments
  FOR INSERT WITH CHECK (user_id = auth.uid());
