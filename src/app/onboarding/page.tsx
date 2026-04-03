'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,30}$/

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()

  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [usernameError, setUsernameError] = useState<string | null>(null)
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Debounce username availability check
  useEffect(() => {
    if (!username || !USERNAME_REGEX.test(username)) {
      setUsernameAvailable(null)
      return
    }
    setUsernameError(null)
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('users')
        .select('username')
        .eq('username', username)
        .maybeSingle()
      setUsernameAvailable(data === null)
    }, 400)
    return () => clearTimeout(timer)
  }, [username])

  function handleUsernameChange(value: string) {
    setUsername(value)
    if (value && !USERNAME_REGEX.test(value)) {
      setUsernameError('3–30 characters, letters, numbers, and underscores only')
    } else {
      setUsernameError(null)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!displayName.trim() || !username.trim()) return
    if (!USERNAME_REGEX.test(username)) return
    if (usernameAvailable === false) return

    setSubmitting(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { error: updateError } = await supabase
      .from('users')
      .update({ display_name: displayName.trim(), username: username.trim() })
      .eq('id', user.id)

    if (updateError) {
      if (updateError.code === '23505') {
        setError('That username is already taken. Please choose another.')
      } else {
        setError(updateError.message)
      }
      setSubmitting(false)
      return
    }

    router.push('/app/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm bg-white border border-gray-200 rounded-lg p-8 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Welcome to Kixu</h1>
          <p className="text-sm text-gray-500 mt-1">Set up your profile to get started</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Display name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your full name"
              required
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              @username
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-sm text-gray-400">@</span>
              <input
                type="text"
                value={username}
                onChange={(e) => handleUsernameChange(e.target.value)}
                placeholder="yourhandle"
                required
                className="w-full pl-7 pr-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {usernameError && (
              <p className="text-xs text-red-500 mt-1">{usernameError}</p>
            )}
            {!usernameError && username && USERNAME_REGEX.test(username) && (
              <p className={`text-xs mt-1 ${usernameAvailable ? 'text-green-600' : 'text-red-500'}`}>
                {usernameAvailable === null
                  ? 'Checking...'
                  : usernameAvailable
                  ? 'Username available'
                  : 'Username already taken'}
              </p>
            )}
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <Button
            type="submit"
            disabled={submitting || !displayName || !username || usernameAvailable !== true}
            className="w-full"
          >
            Get started
          </Button>
        </form>
      </div>
    </div>
  )
}
