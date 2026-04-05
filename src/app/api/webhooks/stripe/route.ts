import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const headersList = await headers()
  const sig = headersList.get('stripe-signature')

  if (!sig) return NextResponse.json({ error: 'Missing signature' }, { status: 400 })

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = await createClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const { community_id, user_id, slot_id, platform_fee } = session.metadata ?? {}

        if (community_id && user_id) {
          // Membership checkout — idempotency: check for existing membership
          const subscriptionId = session.subscription as string
          const customerId = session.customer as string

          const { data: existing } = await supabase
            .from('memberships')
            .select('id')
            .eq('stripe_subscription_id', subscriptionId)
            .maybeSingle()

          if (!existing) {
            await supabase.from('memberships').insert({
              community_id,
              user_id,
              stripe_subscription_id: subscriptionId,
              stripe_customer_id: customerId,
              status: 'active',
            })
            // Add to community_members if not already there
            await supabase.from('community_members').upsert({
              community_id,
              user_id,
              role: 'member',
            }, { onConflict: 'community_id,user_id', ignoreDuplicates: true })
          }
        }

        if (slot_id && user_id) {
          // Booking checkout — idempotency: check stripe_checkout_session_id
          const { data: existing } = await supabase
            .from('bookings')
            .select('id')
            .eq('stripe_checkout_session_id', session.id)
            .maybeSingle()

          if (!existing) {
            const { data: slot } = await supabase
              .from('slots')
              .select('session_type_id, booked_count')
              .eq('id', slot_id)
              .single()

            if (slot) {
              await supabase.from('bookings').insert({
                slot_id,
                user_id,
                stripe_payment_intent_id: session.payment_intent as string,
                stripe_checkout_session_id: session.id,
                amount_paid: session.amount_total ?? 0,
                platform_fee: Number(platform_fee ?? 0),
                status: 'confirmed',
              })

              // Increment booked_count
              await supabase.from('slots').update({ booked_count: slot.booked_count + 1 }).eq('id', slot_id)
            }
          }
        }

        // Course purchase — type flag in metadata
        const { type, course_id } = session.metadata ?? {}
        if (type === 'course_purchase' && course_id && user_id) {
          const { data: existing } = await supabase
            .from('course_enrollments')
            .select('id')
            .eq('stripe_checkout_session_id', session.id)
            .maybeSingle()

          if (!existing) {
            await supabase.from('course_enrollments').insert({
              course_id,
              user_id,
              stripe_checkout_session_id: session.id,
              amount_paid: session.amount_total ?? 0,
            })
          }
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const communityId = subscription.metadata?.community_id
        const userId = subscription.metadata?.user_id

        await supabase
          .from('memberships')
          .update({ status: 'cancelled' })
          .eq('stripe_subscription_id', subscription.id)

        if (communityId && userId) {
          await supabase.from('community_members').delete()
            .eq('community_id', communityId)
            .eq('user_id', userId)
            .eq('role', 'member') // never remove admins via webhook
        }
        break
      }

      case 'account.updated': {
        const account = event.data.object as Stripe.Account
        if (account.details_submitted) {
          await supabase
            .from('users')
            .update({ stripe_account_active: true })
            .eq('stripe_account_id', account.id)
        }
        break
      }
    }
  } catch (err) {
    console.error('Webhook handler error:', err)
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
