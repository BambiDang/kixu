'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import RichTextEditor from '@/components/editor/RichTextEditor'
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
  const [html, setHtml] = useState('')
  const [postAnonymously, setPostAnonymously] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    const content = html.trim()
    if (!content || content === '<p></p>' || submitting) return

    setSubmitting(true)

    await supabase.from('messages').insert({
      topic_id: topic.id,
      user_id: userId,
      content,
      is_anonymous: topic.is_anonymous_topic && postAnonymously,
      reply_to_id: replyTo?.id ?? null,
    })

    setHtml('')
    setPostAnonymously(false)
    onClearReplyTo()
    setSubmitting(false)
  }

  const hasContent = html.trim() !== '' && html.trim() !== '<p></p>'

  // Strip HTML for reply-to preview
  const replyPreview = replyTo
    ? replyTo.content.replace(/<[^>]+>/g, '').slice(0, 60) + (replyTo.content.length > 60 ? '…' : '')
    : null

  return (
    <div className="px-4 pb-3 pt-2 border-t border-gray-100">
      {/* Reply-to strip */}
      {replyTo && (
        <div className="flex items-center gap-2 mb-2 px-2 py-1 bg-gray-50 rounded text-xs text-gray-500 border border-gray-200">
          <span className="truncate flex-1">Replying to: {replyPreview}</span>
          <button onClick={onClearReplyTo} className="text-gray-400 hover:text-gray-600 flex-shrink-0">×</button>
        </div>
      )}

      <div className="space-y-2">
        <RichTextEditor
          value={html}
          onChange={setHtml}
          onSubmit={handleSubmit}
          placeholder="Write a reply…"
        />
        <div className="flex items-center justify-between">
          {topic.is_anonymous_topic ? (
            <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
              <input
                type="checkbox"
                checked={postAnonymously}
                onChange={(e) => setPostAnonymously(e.target.checked)}
                className="rounded"
              />
              Post anonymously
            </label>
          ) : <div />}
          <button
            onClick={handleSubmit}
            disabled={!hasContent || submitting}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Sending…' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  )
}
