'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

type Community = Database['public']['Tables']['communities']['Row']

export default function SettingsEditor({ community }: { community: Community }) {
  const supabase = createClient()
  const router = useRouter()

  const [name, setName] = useState(community.name)
  const [description, setDescription] = useState(community.description ?? '')
  const [category, setCategory] = useState(community.category ?? '')
  const [coverImageUrl, setCoverImageUrl] = useState(community.cover_image_url ?? '')
  const [isAnonymousEnabled, setIsAnonymousEnabled] = useState(community.is_anonymous_enabled)
  const [creatorBio, setCreatorBio] = useState(community.lp_creator_bio ?? '')
  const [creatorPhotoUrl, setCreatorPhotoUrl] = useState(community.lp_creator_photo_url ?? '')
  const [whatYouGet, setWhatYouGet] = useState<string[]>(
    (community.lp_what_youll_get as string[] | null) ?? []
  )
  const [newBenefit, setNewBenefit] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const { error: updateError } = await supabase
      .from('communities')
      .update({
        name: name.trim(),
        description: description.trim() || null,
        category: category.trim() || null,
        cover_image_url: coverImageUrl.trim() || null,
        is_anonymous_enabled: isAnonymousEnabled,
        lp_creator_bio: creatorBio.trim() || null,
        lp_creator_photo_url: creatorPhotoUrl.trim() || null,
        lp_what_youll_get: whatYouGet.length > 0 ? whatYouGet : null,
      })
      .eq('id', community.id)

    setSaving(false)
    if (updateError) {
      setError(updateError.message)
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      router.refresh()
    }
  }

  function addBenefit() {
    if (!newBenefit.trim()) return
    setWhatYouGet([...whatYouGet, newBenefit.trim()])
    setNewBenefit('')
  }

  function removeBenefit(i: number) {
    setWhatYouGet(whatYouGet.filter((_, idx) => idx !== i))
  }

  return (
    <section className="border border-gray-200 rounded-lg p-5">
      <h2 className="font-semibold text-gray-900 mb-4">General settings</h2>
      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Community name</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={80}
            required
            className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
            <input
              value={category}
              onChange={e => setCategory(e.target.value)}
              placeholder="e.g. Fundraising, GTM"
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Cover image URL</label>
            <input
              value={coverImageUrl}
              onChange={e => setCoverImageUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isAnonymousEnabled}
            onChange={e => setIsAnonymousEnabled(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm text-gray-700">Enable anonymous topics</span>
          <span className="text-xs text-gray-400">(members can post without revealing identity)</span>
        </label>

        <hr className="border-gray-100" />
        <h3 className="text-sm font-medium text-gray-700">Landing page</h3>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Creator bio</label>
          <textarea
            value={creatorBio}
            onChange={e => setCreatorBio(e.target.value)}
            rows={2}
            placeholder="Tell visitors about yourself..."
            className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Creator photo URL</label>
          <input
            value={creatorPhotoUrl}
            onChange={e => setCreatorPhotoUrl(e.target.value)}
            placeholder="https://..."
            className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-2">What members get</label>
          <div className="space-y-1 mb-2">
            {whatYouGet.map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="text-blue-500">✓</span>
                <span className="flex-1 text-gray-700">{item}</span>
                <button type="button" onClick={() => removeBenefit(i)} className="text-gray-300 hover:text-red-400 text-xs">✕</button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={newBenefit}
              onChange={e => setNewBenefit(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addBenefit())}
              placeholder="Add a benefit..."
              className="flex-1 px-3 py-1.5 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={addBenefit}
              className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              Add
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          {saved && <span className="text-sm text-green-600">Saved!</span>}
        </div>
      </form>
    </section>
  )
}
