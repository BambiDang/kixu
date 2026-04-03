'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import type { Language } from '@/types/database'

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60)
}

const COMMON_LANGUAGES: Language[] = [
  { flag_emoji: '🇬🇧', language_code: 'EN', language_name: 'English' },
  { flag_emoji: '🇪🇸', language_code: 'ES', language_name: 'Spanish' },
  { flag_emoji: '🇫🇷', language_code: 'FR', language_name: 'French' },
  { flag_emoji: '🇩🇪', language_code: 'DE', language_name: 'German' },
  { flag_emoji: '🇧🇷', language_code: 'PT', language_name: 'Portuguese' },
]

export default function NewCommunityPage() {
  const router = useRouter()
  const supabase = createClient()

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [priceMonthly, setPriceMonthly] = useState(0)
  const [languages, setLanguages] = useState<Language[]>([COMMON_LANGUAGES[0]])
  const [newLang, setNewLang] = useState<Partial<Language>>({})
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function handleNameChange(value: string) {
    setName(value)
    setSlug(slugify(value))
  }

  function addLanguage() {
    if (!newLang.flag_emoji || !newLang.language_code || !newLang.language_name) return
    setLanguages([...languages, newLang as Language])
    setNewLang({})
  }

  function removeLanguage(code: string) {
    if (languages.length <= 1) return
    setLanguages(languages.filter((l) => l.language_code !== code))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (languages.length === 0) {
      setError('At least one language is required.')
      return
    }
    setSubmitting(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    // Create community
    const { data: community, error: createError } = await supabase
      .from('communities')
      .insert({
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim() || null,
        category: category.trim() || null,
        price_monthly: Math.round(priceMonthly * 100),
        created_by: user.id,
        languages,
      })
      .select()
      .single()

    if (createError || !community) {
      setError(createError?.message ?? 'Failed to create community')
      setSubmitting(false)
      return
    }

    // Add creator as admin
    await supabase.from('community_members').insert({
      community_id: community.id,
      user_id: user.id,
      role: 'admin',
    })

    router.push(`/app/community/${community.slug}`)
    router.refresh()
  }

  return (
    <div className="max-w-lg mx-auto p-8">
      <h1 className="text-xl font-bold text-gray-900 mb-6">Create a community</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Community name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            required
            maxLength={80}
            placeholder="e.g. Startup Founders Network"
            className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">URL slug</label>
          <div className="flex items-center border border-gray-200 rounded-md overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
            <span className="px-3 py-2 text-sm text-gray-400 bg-gray-50 border-r border-gray-200">
              kixu.com/
            </span>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              required
              className="flex-1 px-3 py-2 text-sm focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="What is this community about?"
            className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g. Fundraising, GTM, Operations"
            className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Monthly price (USD)</label>
          <div className="flex items-center border border-gray-200 rounded-md overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
            <span className="px-3 py-2 text-sm text-gray-400 bg-gray-50 border-r border-gray-200">$</span>
            <input
              type="number"
              min={0}
              step={1}
              value={priceMonthly}
              onChange={(e) => setPriceMonthly(Number(e.target.value))}
              className="flex-1 px-3 py-2 text-sm focus:outline-none"
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">Set to 0 for a free community</p>
        </div>

        {/* Language manager */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Languages (min 1)</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {languages.map((l) => (
              <div key={l.language_code} className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full text-sm">
                <span>{l.flag_emoji}</span>
                <span>{l.language_code}</span>
                {languages.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLanguage(l.language_code)}
                    className="text-gray-400 hover:text-red-500 ml-1"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="🌍"
              maxLength={4}
              value={newLang.flag_emoji || ''}
              onChange={(e) => setNewLang({ ...newLang, flag_emoji: e.target.value })}
              className="w-14 px-2 py-1 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Code (EN)"
              maxLength={5}
              value={newLang.language_code || ''}
              onChange={(e) => setNewLang({ ...newLang, language_code: e.target.value.toUpperCase() })}
              className="w-24 px-2 py-1 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Name"
              value={newLang.language_name || ''}
              onChange={(e) => setNewLang({ ...newLang, language_name: e.target.value })}
              className="flex-1 px-2 py-1 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={addLanguage}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              Add
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={submitting || !name || !slug}>
            {submitting ? 'Creating...' : 'Create community'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
