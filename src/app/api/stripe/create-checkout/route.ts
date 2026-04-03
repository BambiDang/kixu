import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe, PLATFORM_FEE_PERCENT } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { communityId } = await request.json()
  if (!communityId) return NextResponse.json({ error: 'communityId required' }, { status: 400 })

  const { data: community } = await supabase
    .from('communities')
    .select('*, users(stripe_account_id, stripe_account_active)')
    .eq('id', communityId)
    .single()

  if (!community) return NextResponse.json({ error: 'Community not found' }, { status: 404 })

  const creator = Array.isArray(community.users) ? community.users[0] : community.users

  if (!creator?.stripe_account_active || !creator?.stripe_account_id) {
    return NextResponse.json({ error: 'Creator payment not configured' }, { status: 400 })
  }

  if (!community.stripe_price_id) {
    return NextResponse.json({ error: 'Community has no price configured' }, { status: 400 })
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: community.stripe_price_id, quantity: 1 }],
    subscription_data: {
      application_fee_percent: PLATFORM_FEE_PERCENT,
      metadata: { community_id: communityId, user_id: user.id },
    },
    success_url: `${origin}/app/community/${community.slug}?checkout=success`,
    cancel_url: `${origin}/${community.slug}`,
    metadata: { community_id: communityId, user_id: user.id },
  }, {
    stripeAccount: creator.stripe_account_id,
  })

  return NextResponse.json({ url: session.url })
}
