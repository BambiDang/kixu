import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Redirect to first community or show empty state
  const { data: memberships } = await supabase
    .from('community_members')
    .select('community_id, communities(slug)')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .limit(1)
    .single()

  if (memberships?.communities && !Array.isArray(memberships.communities)) {
    redirect(`/app/community/${memberships.communities.slug}`)
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
      <h2 className="text-xl font-semibold text-gray-800">Welcome to Kixu</h2>
      <p className="text-gray-500 text-sm max-w-sm">
        Create your first community or browse the marketplace to find communities to join.
      </p>
      <div className="flex gap-3">
        <a
          href="/app/community/new"
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
        >
          Create a community
        </a>
        <a
          href="/marketplace"
          className="px-4 py-2 border border-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-50 transition-colors"
        >
          Browse marketplace
        </a>
      </div>
    </div>
  )
}
