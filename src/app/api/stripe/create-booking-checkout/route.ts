import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe, bookingPlatformFee } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { slotId } = await request.json()
  if (!slotId) return NextResponse.json({ error: 'slotId required' }, { status: 400 })

  const { data: slot } = await supabase
    .from('slots')
    .select('*, session_types(*, users(stripe_account_id, stripe_account_active), communities(slug))')
    .eq('id', slotId)
    .single()

  if (!slot) return NextResponse.json({ error: 'Slot not found' }, { status: 404 })
  if (slot.status !== 'available') return NextResponse.json({ error: 'Slot not available' }, { status: 400 })

  const sessionType = Array.isArray(slot.session_types) ? slot.session_types[0] : slot.session_types
  if (!sessionType) return NextResponse.json({ error: 'Session type not found' }, { status: 404 })

  const creator = Array.isArray(sessionType.users) ? sessionType.users[0] : sessionType.users
  if (!creator?.stripe_account_active || !creator?.stripe_account_id) {
    return NextResponse.json({ error: 'Creator payment not configured' }, { status: 400 })
  }

  const community = Array.isArray(sessionType.communities) ? sessionType.communities[0] : sessionType.communities
  const platformFee = bookingPlatformFee(sessionType.price)
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: {
          name: sessionType.title,
          description: `${sessionType.duration_minutes}-minute ${sessionType.type === 'one_on_one' ? '1:1' : 'group'} session`,
        },
        unit_amount: sessionType.price,
      },
      quantity: 1,
    }],
    payment_intent_data: {
      application_fee_amount: platformFee,
      metadata: { slot_id: slotId, user_id: user.id, platform_fee: String(platformFee) },
    },
    success_url: `${origin}/community/${community?.slug ?? ''}?booking=success`,
    cancel_url: `${origin}/community/${community?.slug ?? ''}`,
    metadata: { slot_id: slotId, user_id: user.id, platform_fee: String(platformFee) },
  }, {
    stripeAccount: creator.stripe_account_id,
  })

  return NextResponse.json({ url: session.url })
}
