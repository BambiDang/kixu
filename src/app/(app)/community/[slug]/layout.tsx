import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import CommunityTopNav from '@/components/community/CommunityTopNav'

export default async function CommunityLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: community } = await supabase
    .from('communities')
    .select('id, name, slug, cover_image_url, description, created_by')
    .eq('slug', slug)
    .single()

  if (!community) notFound()

  // Check (and auto-recover) membership
  let { data: membership } = await supabase
    .from('community_members')
    .select('role, can_pin')
    .eq('community_id', community.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership && community.created_by === user.id) {
    await supabase.from('users').upsert(
      { id: user.id, email: user.email ?? '' },
      { onConflict: 'id', ignoreDuplicates: true }
    )
    await supabase.from('community_members').insert({
      community_id: community.id,
      user_id: user.id,
      role: 'admin',
      can_pin: true,
    })
    const { data: recovered } = await supabase
      .from('community_members')
      .select('role, can_pin')
      .eq('community_id', community.id)
      .eq('user_id', user.id)
      .maybeSingle()
    membership = recovered
  }

  if (!membership) redirect(`/${slug}`)

  return (
    <div className="flex flex-col h-full">
      {/* Top navigation bar */}
      <CommunityTopNav slug={slug} communityName={community.name} />

      {/* Page content */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  )
}
