import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import StripeConnectButton from './StripeConnectButton'

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ connect?: string }> }) {
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
    redirect(`/community/${memberships.communities.slug}`)
  }

  const { data: profile } = await supabase
    .from('users')
    .select('stripe_account_active')
    .eq('id', user.id)
    .single()

  const { connect } = await searchParams

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 text-center p-8">
      <h2 className="text-xl font-semibold text-gray-800">Welcome to Kixu</h2>
      <p className="text-gray-500 text-sm max-w-sm">
        Create your first community or browse the marketplace to find communities to join.
      </p>
      <div className="flex gap-3">
        <a
          href="/community/new"
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

      {/* Stripe Connect */}
      <div className="mt-4 w-full max-w-sm border border-gray-200 rounded-lg p-5 text-left">
        <h3 className="font-semibold text-gray-800 text-sm mb-1">Monetize your community</h3>
        <p className="text-xs text-gray-500 mb-3">
          Connect Stripe to accept membership payments and session bookings.
        </p>
        {connect === 'success' && (
          <p className="text-xs text-green-600 mb-3">Stripe account connected successfully!</p>
        )}
        {connect === 'refresh' && (
          <p className="text-xs text-yellow-600 mb-3">Stripe onboarding incomplete. Please try again.</p>
        )}
        {profile?.stripe_account_active ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-green-700 font-medium">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            Stripe connected
          </span>
        ) : (
          <StripeConnectButton />
        )}
      </div>
    </div>
  )
}
