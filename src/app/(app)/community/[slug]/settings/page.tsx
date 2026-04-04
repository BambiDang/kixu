import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import SettingsEditor from './SettingsEditor'
import SessionTypeManager from './SessionTypeManager'
import MemberManager from './MemberManager'
import CohortManager from './CohortManager'

export default async function CommunitySettingsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: community } = await supabase
    .from('communities')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!community) notFound()

  const { data: membership } = await supabase
    .from('community_members')
    .select('role')
    .eq('community_id', community.id)
    .eq('user_id', user.id)
    .single()

  if (!membership) redirect(`/community/${slug}`)
  if (membership.role !== 'admin') redirect(`/community/${slug}`)

  const { data: members } = await supabase
    .from('community_members')
    .select('user_id, role, can_pin, joined_at, users(display_name, username, avatar_url)')
    .eq('community_id', community.id)
    .order('joined_at', { ascending: true })

  const { data: sessionTypes } = await supabase
    .from('session_types')
    .select('*, slots(id, start_time, status, booked_count)')
    .eq('community_id', community.id)
    .order('created_at', { ascending: false })

  const { data: alumni } = await supabase
    .from('cohort_alumni')
    .select('*')
    .eq('community_id', community.id)
    .order('cohort_name', { ascending: true })

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <a href={`/community/${slug}`} className="text-gray-400 hover:text-gray-600 text-lg leading-none">←</a>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{community.name}</h1>
          <p className="text-xs text-gray-400 mt-0.5">Community Settings</p>
        </div>
      </div>

      {/* Tab sections */}
      <SettingsEditor community={community} />
      <SessionTypeManager community={community} sessionTypes={sessionTypes ?? []} userId={user.id} />
      <MemberManager communityId={community.id} members={members ?? []} currentUserId={user.id} />
      <CohortManager communityId={community.id} alumni={alumni ?? []} />
    </div>
  )
}
