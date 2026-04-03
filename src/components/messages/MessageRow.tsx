'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import ReactionBar from '@/components/reactions/ReactionBar'
import type { Database } from '@/types/database'

type Message = Database['public']['Tables']['messages']['Row']
type Topic = Database['public']['Tables']['topics']['Row']

interface AuthorInfo {
  display_name: string
  avatar_url: string | null
}

interface Props {
  message: Message
  topic: Topic
  userId: string
  userRole: 'admin' | 'member'
  onReply: () => void
}

export default function MessageRow({ message, topic, userId, userRole, onReply }: Props) {
  const supabase = createClient()
  const [author, setAuthor] = useState<AuthorInfo | null>(null)
  const [replyToAuthor, setReplyToAuthor] = useState<string | null>(null)
  const [replyToContent, setReplyToContent] = useState<string | null>(null)

  useEffect(() => {
    loadAuthor()
    if (message.reply_to_id) loadReplyToContext()
  }, [message.id])

  async function loadAuthor() {
    if (message.is_anonymous) {
      const { data } = await supabase
        .from('topic_anonymous_identities')
        .select('pseudonym')
        .eq('topic_id', message.topic_id)
        .eq('user_id', message.user_id)
        .maybeSingle()
      setAuthor({
        display_name: data?.pseudonym ?? 'Anonymous',
        avatar_url: null,
      })
    } else {
      const { data } = await supabase
        .from('users')
        .select('display_name, avatar_url')
        .eq('id', message.user_id)
        .single()
      if (data) setAuthor(data)
    }
  }

  async function loadReplyToContext() {
    const { data: refMsg } = await supabase
      .from('messages')
      .select('content, user_id, is_anonymous, topic_id')
      .eq('id', message.reply_to_id!)
      .single()
    if (!refMsg) return

    setReplyToContent(refMsg.content.slice(0, 80))

    if (refMsg.is_anonymous) {
      const { data: identity } = await supabase
        .from('topic_anonymous_identities')
        .select('pseudonym')
        .eq('topic_id', refMsg.topic_id)
        .eq('user_id', refMsg.user_id)
        .maybeSingle()
      setReplyToAuthor(identity?.pseudonym ?? 'Anonymous')
    } else {
      const { data: user } = await supabase
        .from('users')
        .select('display_name')
        .eq('id', refMsg.user_id)
        .single()
      setReplyToAuthor(user?.display_name ?? 'Someone')
    }
  }

  const relativeTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime()
    if (diff < 60000) return 'just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return `${Math.floor(diff / 86400000)}d ago`
  }

  return (
    <div className="px-4 py-2 hover:bg-gray-50/50 group">
      {/* Reply-to context */}
      {message.reply_to_id && replyToContent && (
        <div className="ml-10 mb-1 px-2 py-1 border-l-2 border-gray-200 text-xs text-gray-400 truncate">
          <span className="font-medium text-gray-500">{replyToAuthor}</span>: {replyToContent}
          {replyToContent.length >= 80 && '…'}
        </div>
      )}

      <div className="flex items-start gap-2">
        {/* Avatar */}
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5 ${
          message.is_anonymous ? 'bg-gray-200 text-gray-500' : 'bg-blue-100 text-blue-700'
        }`}>
          {message.is_anonymous ? (
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          ) : (
            author?.display_name?.[0]?.toUpperCase() ?? '?'
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className={`text-xs font-medium ${message.is_anonymous ? 'text-gray-500 italic' : 'text-gray-700'}`}>
              {author?.display_name ?? '…'}
            </span>
            <span className="text-xs text-gray-400">{relativeTime(message.created_at)}</span>
          </div>
          <p className="text-sm text-gray-800 leading-relaxed mt-0.5">{message.content}</p>

          {/* Reactions */}
          <ReactionBar messageId={message.id} userId={userId} />

          {/* Action bar */}
          <div className="flex items-center gap-3 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={onReply}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Reply
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
