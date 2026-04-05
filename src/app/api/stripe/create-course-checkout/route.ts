import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { courseId } = await request.json()
  if (!courseId) return NextResponse.json({ error: 'courseId required' }, { status: 400 })

  // Fetch course + community + creator info
  const { data: course } = await supabase
    .from('courses')
    .select('*, communities(id, slug, created_by, users!communities_created_by_fkey(stripe_account_id, stripe_account_active))')
    .eq('id', courseId)
    .single()

  if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 })
  if (!course.is_published) return NextResponse.json({ error: 'Course not available' }, { status: 400 })
  if (course.price === 0) return NextResponse.json({ error: 'Course is free' }, { status: 400 })

  // Check membership
  const community = Array.isArray(course.communities) ? course.communities[0] : course.communities
  if (!community) return NextResponse.json({ error: 'Community not found' }, { status: 404 })

  const { data: membership } = await supabase
    .from('community_members')
    .select('role')
    .eq('community_id', community.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership) return NextResponse.json({ error: 'Not a member' }, { status: 403 })

  // Check if already enrolled
  const { data: existing } = await supabase
    .from('course_enrollments')
    .select('id')
    .eq('course_id', courseId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) return NextResponse.json({ error: 'Already enrolled' }, { status: 400 })

  const creator = Array.isArray(community.users) ? community.users[0] : community.users
  if (!creator?.stripe_account_active || !creator?.stripe_account_id) {
    return NextResponse.json({ error: 'Creator payment not configured' }, { status: 400 })
  }

  const platformFee = Math.round(course.price * 0.05) // 5% platform fee

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: { name: course.title },
        unit_amount: course.price,
      },
      quantity: 1,
    }],
    payment_intent_data: {
      application_fee_amount: platformFee,
      metadata: {
        type: 'course_purchase',
        course_id: courseId,
        user_id: user.id,
        platform_fee: String(platformFee),
      },
    },
    success_url: `${origin}/community/${community.slug}/courses?enrolled=success`,
    cancel_url: `${origin}/community/${community.slug}/courses`,
    metadata: {
      type: 'course_purchase',
      course_id: courseId,
      user_id: user.id,
      platform_fee: String(platformFee),
    },
  }, {
    stripeAccount: creator.stripe_account_id,
  })

  return NextResponse.json({ url: session.url })
}
