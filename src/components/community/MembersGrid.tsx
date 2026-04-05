import type { Database } from '@/types/database'

type User = Database['public']['Tables']['users']['Row']

interface Member {
  user_id: string
  role: string
  joined_at: string
  users: User | null
}

interface Props {
  members: Member[]
}

export default function MembersGrid({ members }: Props) {
  if (members.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-12">No members yet.</p>
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {members.map((m) => {
        const u = Array.isArray(m.users) ? m.users[0] : m.users
        const initial = u?.display_name?.[0]?.toUpperCase() ?? '?'
        const joinedDate = new Date(m.joined_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })

        return (
          <div key={m.user_id} className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg">
            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 text-sm flex items-center justify-center font-semibold shrink-0">
              {u?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={u.avatar_url} alt={u.display_name ?? ''} className="w-10 h-10 rounded-full object-cover" />
              ) : initial}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{u?.display_name ?? '—'}</p>
              {u?.username && <p className="text-xs text-gray-400 truncate">@{u.username}</p>}
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  m.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {m.role}
                </span>
                <span className="text-xs text-gray-300">· {joinedDate}</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
