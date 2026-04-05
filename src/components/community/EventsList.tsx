interface SessionType {
  id: string
  title: string
  type: 'one_on_one' | 'group'
  duration_minutes: number
  price: number
  capacity: number | null
  slots: {
    id: string
    start_time: string
    status: string
    booked_count: number
  }[]
}

interface Props {
  sessionTypes: SessionType[]
  communitySlug: string
}

export default function EventsList({ sessionTypes, communitySlug }: Props) {
  const now = new Date()

  const allUpcoming = sessionTypes.flatMap((st) =>
    (st.slots ?? [])
      .filter((s) => new Date(s.start_time) > now && s.status !== 'cancelled')
      .map((s) => ({ ...s, sessionType: st }))
  ).sort((a, b) => a.start_time.localeCompare(b.start_time))

  if (allUpcoming.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400 text-sm">
        No upcoming sessions scheduled.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {allUpcoming.map((slot) => {
        const st = slot.sessionType
        const date = new Date(slot.start_time)
        const spotsLeft = st.type === 'group' && st.capacity
          ? st.capacity - slot.booked_count
          : null

        return (
          <div key={slot.id} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg">
            <div className="flex items-start gap-4">
              {/* Date block */}
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
                {st.price === 0 ? 'Free' : `$${(st.price / 100).toFixed(0)}`}
              </span>
              <a
                href={`/community/${communitySlug}/events`}
                className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Book
              </a>
            </div>
          </div>
        )
      })}
    </div>
  )
}
