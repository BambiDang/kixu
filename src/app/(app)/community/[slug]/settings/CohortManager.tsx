'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

type Alumni = Database['public']['Tables']['cohort_alumni']['Row']

interface Props {
  communityId: string
  alumni: Alumni[]
}

export default function CohortManager({ communityId, alumni }: Props) {
  const supabase = createClient()
  const router = useRouter()

  const [name, setName] = useState('')
  const [cohortName, setCohortName] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [achievement, setAchievement] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  // Group by cohort name
  const byCohort = alumni.reduce<Record<string, Alumni[]>>((acc, a) => {
    const key = a.cohort_name ?? 'Uncategorized'
    acc[key] = [...(acc[key] ?? []), a]
    return acc
  }, {})

  async function addAlumni(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const { error: err } = await supabase.from('cohort_alumni').insert({
      community_id: communityId,
      name: name.trim(),
      cohort_name: cohortName.trim() || null,
      linkedin_url: linkedinUrl.trim() || null,
      achievement: achievement.trim() || null,
    })

    setSubmitting(false)
    if (err) { setError(err.message); return }
    setName(''); setCohortName(''); setLinkedinUrl(''); setAchievement('')
    setShowForm(false)
    router.refresh()
  }

  async function removeAlumni(id: string) {
    await supabase.from('cohort_alumni').delete().eq('id', id)
    router.refresh()
  }

  return (
    <section className="border border-gray-200 rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold text-gray-900">Cohort alumni</h2>
          <p className="text-xs text-gray-400 mt-0.5">Showcase past members and their achievements on your landing page</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          + Add alumni
        </button>
      </div>

      {showForm && (
        <form onSubmit={addAlumni} className="mb-5 p-4 bg-gray-50 rounded-lg space-y-3 border border-gray-200">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Name *</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                required
                placeholder="Jane Doe"
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Cohort / batch</label>
              <input
                value={cohortName}
                onChange={e => setCohortName(e.target.value)}
                placeholder="e.g. Cohort 3, Jan 2025"
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Achievement</label>
            <input
              value={achievement}
              onChange={e => setAchievement(e.target.value)}
              placeholder="e.g. Raised $2M seed round"
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">LinkedIn URL</label>
            <input
              value={linkedinUrl}
              onChange={e => setLinkedinUrl(e.target.value)}
              placeholder="https://linkedin.com/in/..."
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={submitting} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-60 transition-colors">
              {submitting ? 'Adding…' : 'Add alumni'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}

      {Object.keys(byCohort).length === 0 && !showForm ? (
        <p className="text-sm text-gray-400 text-center py-6">No alumni added yet.</p>
      ) : (
        <div className="space-y-4">
          {Object.entries(byCohort).map(([cohort, members]) => (
            <div key={cohort}>
              <p className="text-xs font-medium text-gray-500 mb-2">{cohort}</p>
              <div className="space-y-1">
                {members.map(a => (
                  <div key={a.id} className="flex items-center justify-between py-1.5 border-t border-gray-50 first:border-0">
                    <div>
                      <p className="text-sm text-gray-800 font-medium">{a.name}</p>
                      {a.achievement && <p className="text-xs text-gray-400">{a.achievement}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      {a.linkedin_url && (
                        <a href={a.linkedin_url} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline">LinkedIn</a>
                      )}
                      <button onClick={() => removeAlumni(a.id)} className="text-xs text-red-400 hover:text-red-600 transition-colors">Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
