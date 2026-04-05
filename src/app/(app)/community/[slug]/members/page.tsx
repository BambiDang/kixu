import { createClient, createServiceClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import MembersGrid from '@/components/community/MembersGrid'

export default async function MembersPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: community } = await supabase
    .from('communities')
    .select('id, name')
    .eq('slug', slug)
    .single()

  if (!community) notFound()

  const serviceSupabase = await createServiceClient()

  const { data: members } = await serviceSupabase
    .from('community_members')
    .select('user_id, role, joined_at, users(id, display_name, username, avatar_url)')
    .eq('community_id', community.id)
    .order('joined_at', { ascending: true })

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-900">Members</h2>
          <p className="text-sm text-gray-400 mt-0.5">{members?.length ?? 0} total</p>
        </div>
        <MembersGrid members={(members ?? []) as Parameters<typeof MembersGrid>[0]['members']} />
      </div>
    </div>
  )
}
