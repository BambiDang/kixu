'use client'

import { useState } from 'react'

interface Slot {
  id: string
  start_time: string
  status: string
  booked_count: number
  session_type_id: string
  created_at: string
}

interface SessionType {
  id: string
  title: string
  type: 'one_on_one' | 'group'
  duration_minutes: number
  price: number
  capacity: number | null
  is_active: boolean
  slots: Slot[]
}

interface Props {
  sessionTypes: SessionType[]
  communitySlug: string
  userId: string
}

type ViewMode = 'list' | 'calendar'

export default function EventsView({ sessionTypes, communitySlug, userId }: Props) {
  const [view, setView] = useState<ViewMode>('list')

  return (
    <div>
      {/* View toggle */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold text-gray-700">Upcoming Sessions</p>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => setView('list')}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${view === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            List
          </button>
          <button
            onClick={() => setView('calendar')}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${view === 'calendar' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Calendar
          </button>
        </div>
      </div>

      {view === 'list' ? (
        <ListView sessionTypes={sessionTypes} communitySlug={communitySlug} userId={userId} />
      ) : (
        <CalendarView sessionTypes={sessionTypes} communitySlug={communitySlug} userId={userId} />
      )}
    </div>
  )
}

// ── List View ─────────────────────────────────────────────

function ListView({ sessionTypes, communitySlug, userId }: Props) {
  const [registering, setRegistering] = useState<string | null>(null)
  const [registered, setRegistered] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  // Computed after hooks so React Strict Mode double-invocation doesn't produce stale values
  const now = new Date()

  const allUpcoming = sessionTypes.flatMap((st) =>
    (st.slots ?? [])
      .filter((s) => new Date(s.start_time) > now && s.status !== 'cancelled')
      .map((s) => ({ ...s, sessionType: st }))
  ).sort((a, b) => a.start_time.localeCompare(b.start_time))

  async function handleRegister(slotId: string) {
    setRegistering(slotId)
    setError(null)
    const res = await fetch('/api/community/register-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slotId }),
    })
    const json = await res.json()
    setRegistering(null)
    if (res.ok) {
      setRegistered((prev) => new Set([...prev, slotId]))
    } else {
      setError(json.error ?? 'Registration failed')
    }
  }

  async function handleBookPaid(slotId: string) {
    setRegistering(slotId)
    const res = await fetch('/api/stripe/create-booking-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slotId }),
    })
    const json = await res.json()
    setRegistering(null)
    if (json.url) {
      window.location.href = json.url
    } else {
      setError(json.error ?? 'Failed to start checkout')
    }
  }

  if (allUpcoming.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400 text-sm">
        No upcoming sessions scheduled.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-xs text-red-500">{error}</p>}
      {allUpcoming.map((slot) => {
        const st = slot.sessionType
        const date = new Date(slot.start_time)
        const spotsLeft = st.type === 'group' && st.capacity
          ? st.capacity - slot.booked_count
          : null
        const isFree = st.price === 0
        const isRegistered = registered.has(slot.id)
        const isBusy = registering === slot.id

        return (
          <div key={slot.id} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg">
            <div className="flex items-start gap-4">
              <div className="text-center w-12 shrink-0">
                <p className="text-xs text-gray-400 uppercase">{date.toLocaleDateString(undefined, { month: 'short' })}</p>
                <p className="text-2xl font-bold text-gray-900 leading-none">{date.getDate()}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{st.title}</p>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                  <span>{date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
                  <span>·</span>
                  <span>{st.duration_minutes}min</span>
                  <span>·</span>
                  <span>{st.type === 'group' ? 'Group' : '1:1'}</span>
                  {spotsLeft !== null && (
                    <>
                      <span>·</span>
                      <span>{spotsLeft} spot{spotsLeft !== 1 ? 's' : ''} left</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-sm font-medium text-gray-800">
                {isFree ? 'Free' : `$${(st.price / 100).toFixed(0)}`}
              </span>
              {isRegistered ? (
                <span className="px-3 py-1.5 text-xs bg-green-100 text-green-700 rounded-md font-medium">Registered ✓</span>
              ) : isFree ? (
                <button
                  onClick={() => handleRegister(slot.id)}
                  disabled={isBusy}
                  className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-60 transition-colors"
                >
                  {isBusy ? 'Registering…' : 'Register'}
                </button>
              ) : (
                <button
                  onClick={() => handleBookPaid(slot.id)}
                  disabled={isBusy}
                  className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-60 transition-colors"
                >
                  {isBusy ? 'Redirecting…' : 'Book'}
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Calendar View ─────────────────────────────────────────

function CalendarView({ sessionTypes, communitySlug, userId }: Props) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth()) // 0-indexed
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [registering, setRegistering] = useState<string | null>(null)
  const [registered, setRegistered] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  async function handleRegister(slotId: string) {
    setRegistering(slotId)
    setError(null)
    const res = await fetch('/api/community/register-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slotId }),
    })
    const json = await res.json()
    setRegistering(null)
    if (res.ok) {
      setRegistered((prev) => new Set([...prev, slotId]))
    } else {
      setError(json.error ?? 'Registration failed')
    }
  }

  async function handleBookPaid(slotId: string) {
    setRegistering(slotId)
    const res = await fetch('/api/stripe/create-booking-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slotId }),
    })
    const json = await res.json()
    setRegistering(null)
    if (json.url) {
      window.location.href = json.url
    } else {
      setError(json.error ?? 'Failed to start checkout')
    }
  }

  const now = new Date()

  // Build a map: day → list of upcoming slots
  const slotsByDay = new Map<number, { slot: Slot; st: SessionType }[]>()
  sessionTypes.forEach((st) => {
    (st.slots ?? []).forEach((slot) => {
      const d = new Date(slot.start_time)
      if (d.getFullYear() === year && d.getMonth() === month && d > now && slot.status !== 'cancelled') {
        const day = d.getDate()
        if (!slotsByDay.has(day)) slotsByDay.set(day, [])
        slotsByDay.get(day)!.push({ slot, st })
      }
    })
  })

  function prevMonth() {
    if (month === 0) { setYear(year - 1); setMonth(11) }
    else setMonth(month - 1)
    setSelectedDay(null)
  }
  function nextMonth() {
    if (month === 11) { setYear(year + 1); setMonth(0) }
    else setMonth(month + 1)
    setSelectedDay(null)
  }

  // Grid setup
  const firstDay = new Date(year, month, 1).getDay() // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const monthName = new Date(year, month, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null)

  const selectedSlots = selectedDay !== null ? (slotsByDay.get(selectedDay) ?? []) : []

  return (
    <div className="space-y-4">
      {/* Month nav */}
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="p-1.5 rounded hover:bg-gray-100 transition-colors">
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <p className="text-sm font-semibold text-gray-800">{monthName}</p>
        <button onClick={nextMonth} className="p-1.5 rounded hover:bg-gray-100 transition-colors">
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 text-center">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="text-xs text-gray-400 font-medium py-1">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px bg-gray-100 border border-gray-100 rounded-lg overflow-hidden">
        {cells.map((day, i) => {
          const hasEvents = day !== null && slotsByDay.has(day)
          const isToday = day !== null && year === today.getFullYear() && month === today.getMonth() && day === today.getDate()
          const isSelected = day === selectedDay

          return (
            <div
              key={i}
              onClick={() => day !== null && setSelectedDay(day === selectedDay ? null : day)}
              className={`bg-white min-h-[52px] p-1 flex flex-col items-center ${day !== null ? 'cursor-pointer hover:bg-blue-50 transition-colors' : ''} ${isSelected ? 'bg-blue-50' : ''}`}
            >
              {day !== null && (
                <>
                  <span className={`text-xs w-6 h-6 flex items-center justify-center rounded-full font-medium ${isToday ? 'bg-blue-600 text-white' : isSelected ? 'text-blue-700' : 'text-gray-700'}`}>
                    {day}
                  </span>
                  {hasEvents && (
                    <div className="mt-1 flex flex-wrap gap-0.5 justify-center">
                      {(slotsByDay.get(day) ?? []).slice(0, 3).map(({ slot }) => (
                        <span key={slot.id} className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* Selected day panel */}
      {selectedDay !== null && (
        <div className="border border-gray-200 rounded-lg p-4">
          <p className="text-sm font-semibold text-gray-800 mb-3">
            {new Date(year, month, selectedDay).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
          {selectedSlots.length === 0 ? (
            <p className="text-sm text-gray-400">No sessions this day.</p>
          ) : (
            <div className="space-y-2">
              {selectedSlots
                .sort((a, b) => a.slot.start_time.localeCompare(b.slot.start_time))
                .map(({ slot, st }) => {
                  const date = new Date(slot.start_time)
                  const spotsLeft = st.type === 'group' && st.capacity ? st.capacity - slot.booked_count : null
                  const isFree = st.price === 0
                  const isRegistered = registered.has(slot.id)
                  const isBusy = registering === slot.id
                  return (
                    <div key={slot.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{st.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} · {st.duration_minutes}min
                          {spotsLeft !== null && ` · ${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''} left`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-medium text-gray-700">{isFree ? 'Free' : `$${(st.price / 100).toFixed(0)}`}</span>
                        {isRegistered ? (
                          <span className="px-3 py-1.5 text-xs bg-green-100 text-green-700 rounded-md font-medium">Registered ✓</span>
                        ) : isFree ? (
                          <button
                            onClick={() => handleRegister(slot.id)}
                            disabled={isBusy}
                            className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-60 transition-colors"
                          >
                            {isBusy ? 'Registering…' : 'Register'}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleBookPaid(slot.id)}
                            disabled={isBusy}
                            className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-60 transition-colors"
                          >
                            {isBusy ? 'Redirecting…' : `Book — $${(st.price / 100).toFixed(0)}`}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </div>
      )}

      {slotsByDay.size === 0 && (
        <p className="text-center text-sm text-gray-400 py-4">No sessions scheduled this month.</p>
      )}
    </div>
  )
}
