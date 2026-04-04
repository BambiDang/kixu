'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Member {
  user_id: string
  role: string
  can_pin: boolean
  joined_at: string
  users: { display_name: string | null; username: string | null; avatar_url: string | null } | null
}

interface Props {
  communityId: string
  members: Member[]
  currentUserId: string
}

export default function MemberManager({ communityId, members, currentUserId }: Props) {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  async function toggleCanPin(userId: string, current: boolean) {
    setLoading(userId)
    await supabase.from('community_members').update({ can_pin: !current })
      .eq('community_id', communityId).eq('user_id', userId)
    setLoading(null)
    router.refresh()
  }

  async function removeMember(userId: string) {
    if (!confirm('Remove this member from the community?')) return
    setLoading(userId)
    await supabase.from('community_members').delete()
      .eq('community_id', communityId).eq('user_id', userId)
    setLoading(null)
    router.refresh()
  }

  return (
    <section className="border border-gray-200 rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-900">Members</h2>
        <span className="text-xs text-gray-400">{members.length} total</span>
      </div>

      <div className="space-y-1">
        {members.map(m => {
          const u = Array.isArray(m.users) ? m.users[0] : m.users
          const isMe = m.user_id === currentUserId
          return (
            <div key={m.user_id} className="flex items-center justify-between py-2 border-t border-gray-50 first:border-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-medium">
                  {u?.display_name?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div>
                  <p className="text-sm text-gray-800 font-medium">{u?.display_name ?? '—'}{isMe && <span className="text-xs text-gray-400 ml-1">(you)</span>}</p>
                  {u?.username && <p className="text-xs text-gray-400">@{u.username}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${m.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                  {m.role}
                </span>
                {!isMe && m.role !== 'admin' && (
                  <>
                    <button
                      onClick={() => toggleCanPin(m.user_id, m.can_pin)}
                      disabled={loading === m.user_id}
                      className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                        m.can_pin ? 'border-blue-200 text-blue-600 bg-blue-50' : 'border-gray-200 text-gray-400 hover:border-gray-300'
                      }`}
                    >
                      📌 {m.can_pin ? 'Can pin' : 'Pin?'}
                    </button>
                    <button
                      onClick={() => removeMember(m.user_id)}
                      disabled={loading === m.user_id}
                      className="text-xs text-red-400 hover:text-red-600 transition-colors"
                    >
                      Remove
                    </button>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
