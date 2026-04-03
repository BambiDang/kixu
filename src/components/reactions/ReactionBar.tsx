'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const COMMON_EMOJIS = ['👍', '❤️', '😂', '🔥', '🎉', '👀', '💯', '🙌']

interface ReactionCount {
  emoji: string
  count: number
  reacted: boolean
}

interface Props {
  messageId: string
  userId: string
}

export default function ReactionBar({ messageId, userId }: Props) {
  const supabase = createClient()
  const [reactions, setReactions] = useState<ReactionCount[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)

  useEffect(() => {
    loadReactions()
    const channel = supabase
      .channel(`reactions:${messageId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'reactions',
        filter: `message_id=eq.${messageId}`,
      }, () => loadReactions())
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'reactions',
        filter: `message_id=eq.${messageId}`,
      }, () => loadReactions())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [messageId])

  async function loadReactions() {
    const { data } = await supabase
      .from('reactions')
      .select('emoji, user_id')
      .eq('message_id', messageId)

    if (!data) return

    const map = new Map<string, { count: number; reacted: boolean }>()
    for (const r of data) {
      const existing = map.get(r.emoji) ?? { count: 0, reacted: false }
      map.set(r.emoji, {
        count: existing.count + 1,
        reacted: existing.reacted || r.user_id === userId,
      })
    }
    setReactions(Array.from(map.entries()).map(([emoji, v]) => ({ emoji, ...v })))
  }

  async function toggleReaction(emoji: string) {
    const existing = reactions.find((r) => r.emoji === emoji && r.reacted)
    if (existing) {
      await supabase.from('reactions').delete()
        .eq('message_id', messageId).eq('user_id', userId).eq('emoji', emoji)
    } else {
      await supabase.from('reactions').insert({ message_id: messageId, user_id: userId, emoji })
    }
    setPickerOpen(false)
  }

  return (
    <div className="flex items-center gap-1 flex-wrap mt-1 relative">
      {reactions.map((r) => (
        <button
          key={r.emoji}
          onClick={() => toggleReaction(r.emoji)}
          className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border transition-colors ${
            r.reacted
              ? 'bg-blue-50 border-blue-200 text-blue-700'
              : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
          }`}
        >
          {r.emoji} <span>{r.count}</span>
        </button>
      ))}

      <button
        onClick={() => setPickerOpen(!pickerOpen)}
        className="px-1.5 py-0.5 text-xs text-gray-400 hover:text-gray-600 border border-transparent hover:border-gray-200 rounded-full transition-colors"
      >
        +
      </button>

      {pickerOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setPickerOpen(false)} />
          <div className="absolute bottom-7 left-0 z-20 bg-white border border-gray-200 rounded-lg p-2 shadow-lg flex gap-1">
            {COMMON_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => toggleReaction(emoji)}
                className="w-8 h-8 flex items-center justify-center text-lg hover:bg-gray-100 rounded transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
