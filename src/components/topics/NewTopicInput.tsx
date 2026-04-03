'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

type Topic = Database['public']['Tables']['topics']['Row']

interface Props {
  communityId: string
  userId: string
  onCreated: (topic: Topic) => void
}

export default function NewTopicInput({ communityId, userId, onCreated }: Props) {
  const supabase = createClient()
  const [text, setText] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault()
    const content = text.trim()
    if (!content || submitting) return

    setSubmitting(true)

    const { data: topic, error } = await supabase
      .from('topics')
      .insert({
        community_id: communityId,
        root_message: content,
        created_by: userId,
        is_anonymous_topic: isAnonymous,
      })
      .select()
      .single()

    if (error || !topic) {
      setSubmitting(false)
      return
    }

    // Insert root message
    await supabase.from('messages').insert({
      topic_id: topic.id,
      user_id: userId,
      content,
      is_anonymous: isAnonymous,
    })

    setText('')
    setIsAnonymous(false)
    setSubmitting(false)
    onCreated(topic)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex items-start gap-2 border border-gray-200 rounded-lg bg-white p-3 focus-within:ring-2 focus-within:ring-blue-500">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Start a new conversation…"
          rows={2}
          className="flex-1 resize-none text-sm text-gray-800 placeholder-gray-400 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!text.trim() || submitting}
          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
        >
          Post
        </button>
      </div>
      <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
        <input
          type="checkbox"
          checked={isAnonymous}
          onChange={(e) => setIsAnonymous(e.target.checked)}
          className="rounded"
        />
        Make this an anonymous topic
      </label>
    </form>
  )
}
