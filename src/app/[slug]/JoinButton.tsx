'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Props {
  communityId: string
  slug: string
  priceLabel: string
  isFree: boolean
}

export default function JoinButton({ communityId, slug, priceLabel, isFree }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  async function handleJoin() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push(`/login?returnTo=/${slug}`)
      return
    }

    if (isFree) {
      // Insert directly into community_members
      await supabase.from('community_members').insert({
        community_id: communityId,
        user_id: user.id,
        role: 'member',
      })
      router.push(`/community/${slug}`)
      return
    }

    // Paid — create checkout session
    const res = await fetch('/api/stripe/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ communityId }),
    })
    const { url, error } = await res.json()
    if (error) {
      alert(error)
      setLoading(false)
      return
    }
    window.location.href = url
  }

  return (
    <button
      onClick={handleJoin}
      disabled={loading}
      className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors text-sm"
    >
      {loading ? 'Loading…' : priceLabel}
    </button>
  )
}
