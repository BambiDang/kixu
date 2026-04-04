'use client'

import { useState } from 'react'

export default function StripeConnectButton() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConnect() {
    setLoading(true)
    setError(null)
    const res = await fetch('/api/stripe/connect', { method: 'POST' })
    const { url, error: err } = await res.json()
    if (err || !url) {
      setError(err ?? 'Failed to start Stripe onboarding')
      setLoading(false)
      return
    }
    window.location.href = url
  }

  return (
    <div>
      <button
        onClick={handleConnect}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-60 transition-colors"
      >
        {loading ? 'Redirecting…' : 'Connect Stripe'}
      </button>
      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
    </div>
  )
}
