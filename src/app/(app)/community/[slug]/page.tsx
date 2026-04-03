import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import CommunityView from '@/components/topics/CommunityView'

export default async function CommunityPage({ params }: { params: Promise<{ slug: string }> }) {
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

  // Check membership
  const { data: membership } = await supabase
    .from('community_members')
    .select('role, can_pin')
    .eq('community_id', community.id)
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    // Not a member — redirect to public landing page
    redirect(`/${slug}`)
  }

  return (
    <CommunityView
      community={community}
      userId={user.id}
      userRole={membership.role}
      canPin={membership.can_pin}
    />
  )
}
