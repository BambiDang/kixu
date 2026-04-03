'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

type Topic = Database['public']['Tables']['topics']['Row']
type Message = Database['public']['Tables']['messages']['Row']

interface Props {
  topic: Topic
  userId: string
  replyTo: Message | null
  onClearReplyTo: () => void
}

export default function ReplyInput({ topic, userId, replyTo, onClearReplyTo }: Props) {
  const supabase = createClient()
  const [text, setText] = useState('')
  const [postAnonymously, setPostAnonymously] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault()
    const content = text.trim()
    if (!content || submitting) return

    setSubmitting(true)

    await supabase.from('messages').insert({
      topic_id: topic.id,
      user_id: userId,
      content,
      is_anonymous: topic.is_anonymous_topic && postAnonymously,
      reply_to_id: replyTo?.id ?? null,
    })

    setText('')
    setPostAnonymously(false)
    onClearReplyTo()
    setSubmitting(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="px-4 pb-3 pt-2 border-t border-gray-100">
      {/* Reply-to strip */}
      {replyTo && (
        <div className="flex items-center gap-2 mb-2 px-2 py-1 bg-gray-50 rounded text-xs text-gray-500 border border-gray-200">
          <span className="truncate flex-1">
            Replying to: {replyTo.content.slice(0, 60)}{replyTo.content.length > 60 ? '…' : ''}
          </span>
          <button onClick={onClearReplyTo} className="text-gray-400 hover:text-gray-600 flex-shrink-0">×</button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Write a reply…"
          rows={1}
          className="flex-1 px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
        <button
          type="submit"
          disabled={!text.trim() || submitting}
          className="px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
        >
          Send
        </button>
      </form>

      {/* Anonymous toggle for anonymous topics */}
      {topic.is_anonymous_topic && (
        <label className="flex items-center gap-2 mt-2 text-xs text-gray-500 cursor-pointer">
          <input
            type="checkbox"
            checked={postAnonymously}
            onChange={(e) => setPostAnonymously(e.target.checked)}
            className="rounded"
          />
          Post anonymously
        </label>
      )}
    </div>
  )
}
