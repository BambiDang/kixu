import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'

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

  const isAdmin = membership.role === 'admin'

  const { data: members } = await supabase
    .from('community_members')
    .select('user_id, role, can_pin, joined_at, users(display_name, username, avatar_url)')
    .eq('community_id', community.id)
    .order('joined_at', { ascending: true })

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <a href={`/community/${slug}`} className="text-gray-400 hover:text-gray-600">←</a>
        <h1 className="text-xl font-bold text-gray-900">{community.name} — Settings</h1>
      </div>

      {isAdmin ? (
        <div className="space-y-8">
          {/* General info */}
          <section className="border border-gray-200 rounded-lg p-5 space-y-2">
            <h2 className="font-semibold text-gray-800 mb-3">General</h2>
            <div className="grid grid-cols-2 gap-y-2 text-sm">
              <span className="text-gray-500">Name</span>
              <span className="text-gray-800">{community.name}</span>
              <span className="text-gray-500">Slug</span>
              <span className="text-gray-800">{community.slug}</span>
              <span className="text-gray-500">Category</span>
              <span className="text-gray-800">{community.category ?? '—'}</span>
              <span className="text-gray-500">Price</span>
              <span className="text-gray-800">
                {community.price_monthly === 0 ? 'Free' : `$${(community.price_monthly / 100).toFixed(0)}/mo`}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-3">
              Full editing UI coming soon. Contact support to update settings.
            </p>
          </section>

          {/* Members */}
          <section className="border border-gray-200 rounded-lg p-5">
            <h2 className="font-semibold text-gray-800 mb-3">Members</h2>
            <div className="space-y-2">
              {(members ?? []).map((m) => {
                const u = Array.isArray(m.users) ? m.users[0] : m.users
                return (
                  <div key={m.user_id} className="flex items-center justify-between py-2 border-t border-gray-100 first:border-0 text-sm">
                    <div>
                      <span className="font-medium text-gray-800">{u?.display_name ?? '—'}</span>
                      {u?.username && <span className="text-gray-400 ml-1 text-xs">@{u.username}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        m.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {m.role}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="border border-gray-200 rounded-lg p-5 text-sm">
            <h2 className="font-semibold text-gray-800 mb-2">Community info</h2>
            <p className="text-gray-600">{community.description ?? 'No description.'}</p>
          </div>
          <a
            href={`/community/${slug}`}
            className="block text-center py-2 px-4 border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50 transition-colors"
          >
            Leave community
          </a>
        </div>
      )}
    </div>
  )
}
