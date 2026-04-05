'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import RichTextEditor from '@/components/editor/RichTextEditor'
import type { Database } from '@/types/database'

type Topic = Database['public']['Tables']['topics']['Row']

interface Props {
  communityId: string
  channelId?: string | null
  userId: string
  isAnonymousEnabled?: boolean
  onCreated: (topic: Topic) => void
}

export default function NewTopicInput({ communityId, channelId, userId, isAnonymousEnabled, onCreated }: Props) {
  const supabase = createClient()
  const [html, setHtml] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    const content = html.trim()
    if (!content || content === '<p></p>' || submitting) return

    setSubmitting(true)

    const { data: topic, error } = await supabase
      .from('topics')
      .insert({
        community_id: communityId,
        channel_id: channelId ?? null,
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

    await supabase.from('messages').insert({
      topic_id: topic.id,
      user_id: userId,
      content,
      is_anonymous: isAnonymous,
    })

    setHtml('')
    setIsAnonymous(false)
    setSubmitting(false)
    onCreated(topic)
  }

  const hasContent = html.trim() !== '' && html.trim() !== '<p></p>'

  return (
    <div className="space-y-2">
      <div className="relative">
        <RichTextEditor
          value={html}
          onChange={setHtml}
          onSubmit={handleSubmit}
          placeholder="Start a new conversation… (Enter to post, Shift+Enter for newline)"
        />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isAnonymousEnabled && (
            <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="rounded"
              />
              Anonymous topic
            </label>
          )}
        </div>
        <button
          onClick={handleSubmit}
          disabled={!hasContent || submitting}
          className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? 'Posting…' : 'Post'}
        </button>
      </div>
    </div>
  )
}
