import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ChannelSidebar from '@/components/community/ChannelSidebar'
import ChannelFeed from '@/components/community/ChannelFeed'

export default async function ChannelPage({
  params,
}: {
  params: Promise<{ slug: string; channelId: string }>
}) {
  const { slug, channelId } = await params
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
    .select('role, can_pin')
    .eq('community_id', community.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership) return null

  // Verify channel belongs to this community
  const { data: channel } = await supabase
    .from('channels')
    .select('id, name')
    .eq('id', channelId)
    .eq('community_id', community.id)
    .maybeSingle()

  if (!channel) notFound()

  // Member count for channel header
  const { count: memberCount } = await supabase
    .from('community_members')
    .select('*', { count: 'exact', head: true })
    .eq('community_id', community.id)

  // Upcoming session within 7 days for session banner
  let upcomingSlot: { start_time: string; title: string; type: string } | null = null
  const { data: stRows } = await supabase
    .from('session_types')
    .select('id, title, type')
    .eq('community_id', community.id)
    .eq('is_active', true)

  if (stRows && stRows.length > 0) {
    const now = new Date().toISOString()
    const sevenDaysOut = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data: slotRows } = await supabase
      .from('slots')
      .select('start_time, session_type_id')
      .in('session_type_id', stRows.map((st) => st.id))
      .eq('status', 'available')
      .gte('start_time', now)
      .lte('start_time', sevenDaysOut)
      .order('start_time')
      .limit(1)

    const slot = slotRows?.[0]
    if (slot) {
      const st = stRows.find((s) => s.id === slot.session_type_id)
      if (st) upcomingSlot = { start_time: slot.start_time, title: st.title, type: st.type }
    }
  }

  return (
    <div className="flex h-full">
      <ChannelSidebar
        communityId={community.id}
        slug={slug}
        activeChannelId={channelId}
        userRole={membership.role as 'admin' | 'member'}
      />
      <ChannelFeed
        community={community}
        userId={user.id}
        userRole={membership.role as 'admin' | 'member'}
        canPin={membership.can_pin}
        channelId={channelId}
        memberCount={memberCount ?? 0}
        upcomingSlot={upcomingSlot}
      />
    </div>
  )
}
