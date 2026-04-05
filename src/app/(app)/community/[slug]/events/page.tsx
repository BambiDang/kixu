import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import SessionTypeManager from '../settings/SessionTypeManager'
import EventsView from '@/components/community/EventsView'
import type { Database } from '@/types/database'

type SessionType = Database['public']['Tables']['session_types']['Row'] & {
  slots: Database['public']['Tables']['slots']['Row'][]
}

export default async function EventsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null // layout handles redirect

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
    .maybeSingle()

  if (!membership) return null

  const isAdmin = membership.role === 'admin'

  const sessionTypesQuery = supabase
    .from('session_types')
    .select('*, slots(*)')
    .eq('community_id', community.id)
    .order('created_at', { ascending: false })

  const { data: rawSessionTypes } = isAdmin
    ? await sessionTypesQuery
    : await sessionTypesQuery.eq('is_active', true)

  const sessionTypes = (rawSessionTypes ?? []) as unknown as SessionType[]

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Events &amp; Sessions</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            {isAdmin ? 'Manage and view upcoming sessions' : 'Upcoming sessions you can book'}
          </p>
        </div>

        {/* Admin: session type + slot management */}
        {isAdmin && (
          <SessionTypeManager community={community} sessionTypes={sessionTypes} userId={user.id} />
        )}

        {/* Events view: list + calendar for all members */}
        <EventsView
          sessionTypes={sessionTypes.filter((st) => st.is_active)}
          communitySlug={slug}
          userId={user.id}
        />
      </div>
    </div>
  )
}
