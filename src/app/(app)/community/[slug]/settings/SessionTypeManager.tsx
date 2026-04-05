'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

type Community = Database['public']['Tables']['communities']['Row']
type SessionType = Database['public']['Tables']['session_types']['Row'] & {
  slots: Database['public']['Tables']['slots']['Row'][]
}

interface Props {
  community: Community
  sessionTypes: SessionType[]
  userId: string
}

export default function SessionTypeManager({ community, sessionTypes, userId }: Props) {
  // useRef prevents createClient() from being called on every render (React Strict Mode
  // double-invokes components, which would cause duplicate Supabase auth refresh calls)
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [showSlotForm, setShowSlotForm] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [type, setType] = useState<'one_on_one' | 'group'>('one_on_one')
  const [duration, setDuration] = useState(60)
  const [price, setPrice] = useState(0)
  const [capacity, setCapacity] = useState(10)
  const [slotDate, setSlotDate] = useState('')
  const [slotTime, setSlotTime] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function createSessionType(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const { error: err } = await supabase.from('session_types').insert({
      community_id: community.id,
      creator_id: userId,
      title: title.trim(),
      type,
      duration_minutes: duration,
      price: Math.round(price * 100),
      capacity: type === 'group' ? capacity : 1,
      is_active: true,
    })

    setSubmitting(false)
    if (err) { setError(err.message); return }
    setTitle(''); setShowForm(false)
    router.refresh()
  }

  async function addSlot(sessionTypeId: string) {
    if (!slotDate || !slotTime) return
    setSubmitting(true)
    const startTime = new Date(`${slotDate}T${slotTime}`).toISOString()
    const { error: err } = await supabase.from('slots').insert({
      session_type_id: sessionTypeId,
      start_time: startTime,
      status: 'available',
      booked_count: 0,
    })
    setSubmitting(false)
    if (err) { setError(err.message); return }
    setSlotDate(''); setSlotTime(''); setShowSlotForm(null)
    router.refresh()
  }

  async function toggleActive(id: string, current: boolean) {
    await supabase.from('session_types').update({ is_active: !current }).eq('id', id)
    router.refresh()
  }

  const fmt = (iso: string) => new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  })

  return (
    <section className="border border-gray-200 rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-900">Sessions & bookings</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          + New session type
        </button>
      </div>

      {showForm && (
        <form onSubmit={createSessionType} className="mb-5 p-4 bg-gray-50 rounded-lg space-y-3 border border-gray-200">
          <h3 className="text-sm font-medium text-gray-700">Create session type</h3>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. 1:1 Coaching Call, Group Workshop"
            required
            className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Type</label>
              <select
                value={type}
                onChange={e => setType(e.target.value as 'one_on_one' | 'group')}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none bg-white"
              >
                <option value="one_on_one">1:1 Session</option>
                <option value="group">Group Session</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Duration (min)</label>
              <input
                type="number"
                value={duration}
                onChange={e => setDuration(Number(e.target.value))}
                min={15}
                step={15}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none bg-white"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Price (USD)</label>
              <div className="flex items-center border border-gray-200 rounded-md overflow-hidden bg-white focus-within:ring-2 focus-within:ring-blue-500">
                <span className="px-2 text-sm text-gray-400 bg-gray-50 border-r border-gray-200 py-2">$</span>
                <input
                  type="number"
                  value={price}
                  onChange={e => setPrice(Number(e.target.value))}
                  min={0}
                  className="flex-1 px-2 py-2 text-sm focus:outline-none"
                />
              </div>
            </div>
            {type === 'group' && (
              <div>
                <label className="block text-xs text-gray-500 mb-1">Max capacity</label>
                <input
                  type="number"
                  value={capacity}
                  onChange={e => setCapacity(Number(e.target.value))}
                  min={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none bg-white"
                />
              </div>
            )}
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={submitting} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-60 transition-colors">
              {submitting ? 'Creating…' : 'Create'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}

      {sessionTypes.length === 0 && !showForm && (
        <p className="text-sm text-gray-400 text-center py-6">No session types yet. Create one to start accepting bookings.</p>
      )}

      <div className="space-y-4">
        {sessionTypes.map(st => (
          <div key={st.id} className="border border-gray-100 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-800">{st.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {st.type === 'one_on_one' ? '1:1' : 'Group'} · {st.duration_minutes}min · ${(st.price / 100).toFixed(0)}
                  {st.type === 'group' && ` · max ${st.capacity}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${st.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {st.is_active ? 'Active' : 'Inactive'}
                </span>
                <button onClick={() => toggleActive(st.id, st.is_active)} className="text-xs text-gray-400 hover:text-gray-600">
                  {st.is_active ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>

            {/* Slots */}
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-gray-500">Time slots</p>
                <button
                  onClick={() => setShowSlotForm(showSlotForm === st.id ? null : st.id)}
                  className="text-xs text-blue-600 hover:underline"
                >
                  + Add slot
                </button>
              </div>

              {showSlotForm === st.id && (
                <div className="flex items-center gap-2 mb-2">
                  <input type="date" value={slotDate} onChange={e => setSlotDate(e.target.value)}
                    className="px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  <input type="time" value={slotTime} onChange={e => setSlotTime(e.target.value)}
                    className="px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  <button onClick={() => addSlot(st.id)} disabled={submitting}
                    className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-60 transition-colors">
                    Add
                  </button>
                  <button onClick={() => setShowSlotForm(null)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
                </div>
              )}

              {(st.slots ?? []).length === 0 ? (
                <p className="text-xs text-gray-300">No slots added yet</p>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {(st.slots ?? [])
                    .filter(s => new Date(s.start_time) > new Date())
                    .sort((a, b) => a.start_time.localeCompare(b.start_time))
                    .map(slot => (
                      <span key={slot.id} className={`text-xs px-2 py-0.5 rounded-full border ${
                        slot.status === 'available' ? 'border-gray-200 text-gray-600' :
                        slot.status === 'booked' ? 'border-green-200 bg-green-50 text-green-700' :
                        'border-red-100 bg-red-50 text-red-500'
                      }`}>
                        {fmt(slot.start_time)}
                        {st.type === 'group' && ` (${slot.booked_count}/${st.capacity})`}
                      </span>
                    ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
