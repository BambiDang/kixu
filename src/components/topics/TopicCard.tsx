'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUnreadStore } from '@/store/useUnreadStore'
import MessageRow from '@/components/messages/MessageRow'
import ReplyInput from '@/components/messages/ReplyInput'
import type { Database } from '@/types/database'

type Topic = Database['public']['Tables']['topics']['Row']
type Message = Database['public']['Tables']['messages']['Row']

interface Props {
  topic: Topic
  userId: string
  userRole: 'admin' | 'member'
  canPin: boolean
  isPinned: boolean
  isUnread: boolean
  isFollowed: boolean
  onRead: () => void
}

// Author display — fetched separately to avoid exposing user_id for anon posts
interface AuthorInfo {
  display_name: string
  avatar_url: string | null
  username: string | null
}

export default function TopicCard({ topic, userId, userRole, canPin, isPinned, isUnread, isFollowed, onRead }: Props) {
  const supabase = createClient()
  const { toggleFollow, markTopicRead } = useUnreadStore()

  const [messages, setMessages] = useState<Message[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [expanded, setExpanded] = useState(false)
  const [creator, setCreator] = useState<AuthorInfo | null>(null)
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadMessages()
    loadCreator()
    // Mark as read when topic is rendered
    upsertRead()
  }, [topic.id])

  async function upsertRead() {
    await supabase
      .from('topic_reads')
      .upsert({ topic_id: topic.id, user_id: userId, last_read_at: new Date().toISOString() })
    markTopicRead(topic.id)
    onRead()
  }

  async function loadCreator() {
    if (topic.is_anonymous_topic) {
      // Root message is always anonymous — show pseudonym
      const { data: identity } = await supabase
        .from('topic_anonymous_identities')
        .select('pseudonym')
        .eq('topic_id', topic.id)
        .eq('user_id', topic.created_by)
        .maybeSingle()
      setCreator({
        display_name: identity?.pseudonym ?? 'Anonymous',
        avatar_url: null,
        username: null,
      })
    } else {
      const { data: user } = await supabase
        .from('users')
        .select('display_name, avatar_url, username')
        .eq('id', topic.created_by)
        .single()
      if (user) setCreator(user)
    }
  }

  async function loadMessages() {
    const { data, count } = await supabase
      .from('messages')
      .select('*', { count: 'exact' })
      .eq('topic_id', topic.id)
      .order('created_at', { ascending: true })
    setMessages(data ?? [])
    setTotalCount(count ?? 0)
    setLoading(false)
  }

  // Real-time messages subscription
  useEffect(() => {
    const channel = supabase
      .channel(`messages:${topic.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `topic_id=eq.${topic.id}`,
      }, (payload) => {
        const msg = payload.new as Message
        setMessages((prev) => [...prev, msg])
        setTotalCount((c) => c + 1)
        // Auto-mark read if we're viewing
        upsertRead()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [topic.id])

  async function handlePin() {
    if (isPinned) {
      await supabase.from('pinned_topics').delete().eq('topic_id', topic.id)
    } else {
      await supabase.from('pinned_topics').insert({
        topic_id: topic.id,
        community_id: topic.community_id,
        pinned_by: userId,
      })
    }
  }

  async function handleFollow() {
    if (isFollowed) {
      await supabase.from('topic_follows').delete()
        .eq('topic_id', topic.id).eq('user_id', userId)
    } else {
      await supabase.from('topic_follows').insert({ topic_id: topic.id, user_id: userId })
    }
    toggleFollow(topic.id)
  }

  // Messages to show: first (root) + 2 most recent replies, or all if expanded
  const rootMessage = messages[0]
  const replies = messages.slice(1)
  const visibleReplies = expanded ? replies : replies.slice(-2)
  const hiddenCount = replies.length - visibleReplies.length

  const relativeTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime()
    if (diff < 60000) return 'just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return `${Math.floor(diff / 86400000)}d ago`
  }

  return (
    <div className={`bg-white border rounded-lg overflow-hidden transition-all duration-150 ${
      isUnread ? 'border-l-4 border-l-blue-500 border-t-gray-200 border-r-gray-200 border-b-gray-200' : 'border-gray-200'
    }`}>
      {/* Topic header */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {/* Avatar */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${
              topic.is_anonymous_topic ? 'bg-gray-200 text-gray-500' : 'bg-blue-100 text-blue-700'
            }`}>
              {topic.is_anonymous_topic ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              ) : (
                creator?.display_name?.[0]?.toUpperCase() ?? '?'
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                {isUnread && <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />}
                <span className={`text-sm ${isUnread ? 'font-semibold text-gray-900' : 'font-medium text-gray-800'} truncate`}>
                  {creator?.display_name ?? '…'}
                </span>
                {topic.is_anonymous_topic && (
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    🛡️ Anonymous
                  </span>
                )}
              </div>
              <span className="text-xs text-gray-400">{relativeTime(topic.created_at)}</span>
            </div>
          </div>
          {/* Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={handleFollow}
              className="p-1.5 rounded hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
              title={isFollowed ? 'Unfollow' : 'Follow'}
            >
              {isFollowed ? '🔔' : '🔕'}
            </button>
            {(userRole === 'admin' || canPin) && (
              <button
                onClick={handlePin}
                className={`p-1.5 rounded hover:bg-gray-100 transition-colors ${isPinned ? 'text-blue-500' : 'text-gray-400 hover:text-gray-600'}`}
                title={isPinned ? 'Unpin' : 'Pin'}
              >
                📌
              </button>
            )}
          </div>
        </div>

        {/* Root message */}
        <p className="mt-2 text-sm text-gray-800 leading-relaxed">{topic.root_message}</p>
      </div>

      {/* Replies section */}
      {!loading && (
        <div className="border-t border-gray-100">
          {hiddenCount > 0 && !expanded && (
            <button
              onClick={() => setExpanded(true)}
              className="w-full text-left px-4 py-2 text-xs text-blue-600 hover:bg-blue-50 transition-colors"
            >
              Show {hiddenCount} more {hiddenCount === 1 ? 'reply' : 'replies'}
            </button>
          )}

          {visibleReplies.map((msg) => (
            <MessageRow
              key={msg.id}
              message={msg}
              topic={topic}
              userId={userId}
              userRole={userRole}
              onReply={() => setReplyTo(msg)}
            />
          ))}

          <ReplyInput
            topic={topic}
            userId={userId}
            replyTo={replyTo}
            onClearReplyTo={() => setReplyTo(null)}
          />
        </div>
      )}
    </div>
  )
}
