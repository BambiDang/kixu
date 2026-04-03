import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-03-31.basil',
  typescript: true,
})

/** Platform fee as a percentage (basis points → percent) */
export const PLATFORM_FEE_PERCENT = 5

/** Application fee for booking checkouts (5% of price) */
export function bookingPlatformFee(priceInCents: number): number {
  return Math.round(priceInCents * (PLATFORM_FEE_PERCENT / 100))
}
