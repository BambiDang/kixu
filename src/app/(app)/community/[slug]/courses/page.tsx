import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import CoursesList from '@/components/community/CoursesList'
import type { Database } from '@/types/database'

export type CourseWithContent = Database['public']['Tables']['courses']['Row'] & {
  course_modules: (Database['public']['Tables']['course_modules']['Row'] & {
    course_lessons: Database['public']['Tables']['course_lessons']['Row'][]
  })[]
  course_downloads: Database['public']['Tables']['course_downloads']['Row'][]
}

export default async function CoursesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null // layout handles redirect

  const { data: community } = await supabase
    .from('communities')
    .select('id, name')
    .eq('slug', slug)
    .single()

  if (!community) notFound()

  const { data: membership } = await supabase
    .from('community_members')
    .select('role')
    .eq('community_id', community.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership) return null

  const { data: rawCourses } = await supabase
    .from('courses')
    .select('*, course_downloads(*), course_modules(*, course_lessons(*))')
    .eq('community_id', community.id)
    .order('position')

  const { data: enrollments } = await supabase
    .from('course_enrollments')
    .select('course_id')
    .eq('user_id', user.id)

  const enrolledIds = new Set((enrollments ?? []).map((e) => e.course_id))

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <CoursesList
          courses={(rawCourses ?? []) as unknown as CourseWithContent[]}
          userRole={membership.role as 'admin' | 'member'}
          communityId={community.id}
          userId={user.id}
          enrolledIds={[...enrolledIds]}
        />
      </div>
    </div>
  )
}
