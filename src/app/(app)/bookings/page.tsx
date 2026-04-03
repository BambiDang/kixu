import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function BookingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get creator's session types
  const { data: sessionTypes } = await supabase
    .from('session_types')
    .select('*, slots(id, start_time, status, booked_count, bookings(id, user_id, status, amount_paid, users(display_name)))')
    .eq('creator_id', user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  const { data: profile } = await supabase
    .from('users')
    .select('stripe_account_active')
    .eq('id', user.id)
    .single()

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-xl font-bold text-gray-900 mb-6">Session Bookings</h1>

      {!profile?.stripe_account_active && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
          Connect Stripe to start accepting bookings.{' '}
          <a href="/app/dashboard" className="underline">Go to dashboard</a>
        </div>
      )}

      {(!sessionTypes || sessionTypes.length === 0) ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          No session types yet. Create one from your dashboard.
        </div>
      ) : (
        <div className="space-y-6">
          {sessionTypes.map((st) => {
            const upcomingSlots = (st.slots ?? []).filter(
              (s) => s.status !== 'cancelled' && new Date(s.start_time) > new Date()
            )
            return (
              <div key={st.id} className="border border-gray-200 rounded-lg p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="font-semibold text-gray-800">{st.title}</h2>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {st.type === 'one_on_one' ? '1:1' : 'Group'} · {st.duration_minutes}min · ${(st.price / 100).toFixed(2)}
                    </p>
                  </div>
                </div>

                {upcomingSlots.length === 0 ? (
                  <p className="text-xs text-gray-400">No upcoming slots</p>
                ) : (
                  <div className="space-y-2">
                    {upcomingSlots.map((slot) => {
                      const bookings = Array.isArray(slot.bookings) ? slot.bookings : []
                      return (
                        <div key={slot.id} className="flex items-center justify-between py-2 border-t border-gray-100 text-sm">
                          <div>
                            <p className="text-gray-700">{new Date(slot.start_time).toLocaleString()}</p>
                            <p className="text-xs text-gray-400">
                              {st.type === 'group'
                                ? `${slot.booked_count}/${st.capacity} booked`
                                : bookings.length > 0 ? 'Booked' : 'Available'}
                            </p>
                          </div>
                          {bookings.map((b) => {
                            const bUser = Array.isArray(b.users) ? b.users[0] : b.users
                            return (
                              <span key={b.id} className="text-xs text-gray-600">
                                {bUser?.display_name ?? 'Member'}
                              </span>
                            )
                          })}
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            slot.status === 'booked' ? 'bg-green-100 text-green-700'
                            : slot.status === 'available' ? 'bg-gray-100 text-gray-600'
                            : 'bg-red-100 text-red-600'
                          }`}>
                            {slot.status}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
