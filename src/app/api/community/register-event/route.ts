import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { slotId } = await request.json()
  if (!slotId) return NextResponse.json({ error: 'slotId required' }, { status: 400 })

  // Fetch slot + session type (to verify free + available)
  const { data: slot } = await supabase
    .from('slots')
    .select('*, session_types(price, capacity, community_id, type)')
    .eq('id', slotId)
    .single()

  if (!slot) return NextResponse.json({ error: 'Slot not found' }, { status: 404 })
  if (slot.status !== 'available') return NextResponse.json({ error: 'Slot not available' }, { status: 400 })

  const sessionType = Array.isArray(slot.session_types) ? slot.session_types[0] : slot.session_types
  if (!sessionType) return NextResponse.json({ error: 'Session type not found' }, { status: 404 })
  if (sessionType.price > 0) return NextResponse.json({ error: 'Slot requires payment' }, { status: 400 })

  // Check membership
  const { data: membership } = await supabase
    .from('community_members')
    .select('role')
    .eq('community_id', sessionType.community_id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership) return NextResponse.json({ error: 'Not a community member' }, { status: 403 })

  // Check capacity for group sessions
  if (sessionType.type === 'group' && sessionType.capacity !== null) {
    if (slot.booked_count >= sessionType.capacity) {
      return NextResponse.json({ error: 'Session is full' }, { status: 400 })
    }
  }

  // Check for duplicate booking
  const { data: existing } = await supabase
    .from('bookings')
    .select('id')
    .eq('slot_id', slotId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) return NextResponse.json({ error: 'Already registered' }, { status: 400 })

  // Use service client to insert (bookings normally restricted to webhook inserts)
  const serviceSupabase = await createServiceClient()

  await serviceSupabase.from('bookings').insert({
    slot_id: slotId,
    user_id: user.id,
    amount_paid: 0,
    platform_fee: 0,
    status: 'confirmed',
  })

  // Increment booked_count for group sessions
  if (sessionType.type === 'group') {
    await serviceSupabase.from('slots').update({ booked_count: slot.booked_count + 1 }).eq('id', slotId)
  }

  return NextResponse.json({ success: true })
}
