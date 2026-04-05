'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUnreadStore } from '@/store/useUnreadStore'
import MessageRow from '@/components/messages/MessageRow'
import ReplyInput from '@/components/messages/ReplyInput'
import RichTextContent from '@/components/editor/RichTextContent'
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

interface AuthorInfo {
  display_name: string | null
  avatar_url: string | null
  username: string | null
}

// ─── pixel layout constants (from card left edge) ────────────────────────────
//
//  Card has no left padding of its own.
//  Header uses "pl-4" (16px), left-col width=32, gap (mr) =12 → right col at x=60
//
//  Root avatar centre          = 16 + 16         = 32 px   ← L0 line x
//
//  Level-1 comment wrapper     paddingLeft = 44
//  MessageRow px-4             = 16 px
//  → L1 avatar left edge       = 44 + 16         = 60 px
//  → L1 avatar centre          = 60 + 14         = 74 px   ← L1 line x
//  → L0→L1 hook               left=32 width=28  right=60   top=24
//
//  Level-2 reply wrapper       paddingLeft = 74
//  MessageRow px-4             = 16 px
//  → L2 avatar left edge       = 74 + 16         = 90 px
//  → L2 avatar centre          = 90 + 14         = 104 px
//  → L1→L2 hook               left=74 width=16  right=90   top=24
//
//  Hook top = py-2(8) + mt-0.5(2) + half-h-7(14) = 24 px

const LINE_COLOR = '#d1d5db'

export default function TopicCard({
  topic, userId, userRole, canPin, isPinned, isUnread, isFollowed, onRead,
}: Props) {
  const supabase = createClient()
  const { toggleFollow, markTopicRead } = useUnreadStore()

  const [messages, setMessages] = useState<Message[]>([])
  const [expanded, setExpanded] = useState(false)
  const [creator, setCreator] = useState<AuthorInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadMessages()
    loadCreator()
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
      const { data } = await supabase
        .from('topic_anonymous_identities')
        .select('pseudonym')
        .eq('topic_id', topic.id)
        .eq('user_id', topic.created_by)
        .maybeSingle()
      setCreator({ display_name: data?.pseudonym ?? 'Anonymous', avatar_url: null, username: null })
    } else {
      const { data } = await supabase
        .from('users')
        .select('display_name, avatar_url, username')
        .eq('id', topic.created_by)
        .single()
      if (data) setCreator(data)
    }
  }

  async function loadMessages() {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('topic_id', topic.id)
      .order('created_at', { ascending: true })
    setMessages(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    const channel = supabase
      .channel(`messages:${topic.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `topic_id=eq.${topic.id}`,
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new as Message])
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
        topic_id: topic.id, community_id: topic.community_id, pinned_by: userId,
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

  const relativeTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime()
    if (diff < 60000) return 'just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return `${Math.floor(diff / 86400000)}d ago`
  }

  // ── Build two-level thread tree ──────────────────────────────────────────
  // Level 1: direct replies to the root post  (reply_to_id === null)
  // Level 2: replies to a level-1 comment     (reply_to_id === level1.id)
  // Anything deeper is surfaced under the nearest level-1 ancestor.

  const allReplies = messages.slice(1)

  const level1Comments = allReplies.filter((m) => !m.reply_to_id)
  const level1Ids = new Set(level1Comments.map((m) => m.id))

  // Map: level-1 comment id → its direct replies
  const level2ByParent = new Map<string, Message[]>()
  allReplies
    .filter((m) => m.reply_to_id && level1Ids.has(m.reply_to_id))
    .forEach((m) => {
      const pid = m.reply_to_id!
      if (!level2ByParent.has(pid)) level2ByParent.set(pid, [])
      level2ByParent.get(pid)!.push(m)
    })

  const totalReplyCount = allReplies.length

  return (
    <div className={`bg-white border rounded-lg overflow-hidden transition-all duration-150 ${
      isUnread
        ? 'border-l-4 border-l-blue-500 border-t-gray-200 border-r-gray-200 border-b-gray-200'
        : 'border-gray-200'
    }`}>

      {/* ── Header: two-column [avatar + vertical stub | content] ── */}
      <div className="flex pl-4 pt-3">

        {/* LEFT COLUMN: root avatar on top, flex-1 vertical stub below.
            The stub fills exactly the height of the right column thanks to flexbox,
            bridging to the replies section that starts immediately after this row. */}
        <div className="flex flex-col items-center flex-shrink-0" style={{ width: 32, marginRight: 12 }}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${
            topic.is_anonymous_topic ? 'bg-gray-200 text-gray-500' : 'bg-blue-100 text-blue-700'
          }`}>
            {topic.is_anonymous_topic ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            ) : (
              creator?.display_name?.[0]?.toUpperCase() ?? '?'
            )}
          </div>

          {/* Stub — only when replies exist; connects to the L0 line in the replies section */}
          {!loading && allReplies.length > 0 && (
            <div className="flex-1 mt-2" style={{ width: 2, backgroundColor: LINE_COLOR }} />
          )}
        </div>

        {/* RIGHT COLUMN */}
        <div className="flex-1 min-w-0 pr-4 pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
              {isUnread && <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />}
              <span className={`text-sm ${isUnread ? 'font-semibold text-gray-900' : 'font-medium text-gray-800'}`}>
                {creator?.display_name ?? '…'}
              </span>
              {topic.is_anonymous_topic && (
                <span className="text-xs text-gray-400">🛡️ Anonymous</span>
              )}
              <span className="text-xs text-gray-400">{relativeTime(topic.created_at)}</span>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button onClick={handleFollow}
                className="p-1.5 rounded hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
                title={isFollowed ? 'Unfollow' : 'Follow'}>
                {isFollowed ? '🔔' : '🔕'}
              </button>
              {userRole === 'admin' && (
                <button onClick={handlePin}
                  className={`p-1.5 rounded hover:bg-gray-100 transition-colors ${isPinned ? 'text-blue-500' : 'text-gray-400 hover:text-gray-600'}`}
                  title={isPinned ? 'Unpin' : 'Pin'}>
                  📌
                </button>
              )}
            </div>
          </div>

          <RichTextContent html={topic.root_message} className="mt-1" />

          {/* YouTube-style expand button */}
          {!loading && totalReplyCount > 0 && (
            <button
              onClick={() => setExpanded((e) => !e)}
              className="flex items-center gap-1 mt-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
            >
              <svg
                className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              {expanded
                ? 'Hide replies'
                : `${totalReplyCount} ${totalReplyCount === 1 ? 'reply' : 'replies'}`}
            </button>
          )}
        </div>
      </div>

      {/* ── Expanded replies: hierarchical threading ── */}
      {!loading && expanded && allReplies.length > 0 && (
        <div className="relative">

          {/* L0 line: root avatar centre (x=32) → runs through ALL level-1 comments */}
          <div className="absolute pointer-events-none"
            style={{ left: 32, top: 0, bottom: 0, width: 2, backgroundColor: LINE_COLOR }} />

          {level1Comments.map((comment) => {
            const commentReplies = level2ByParent.get(comment.id) ?? []

            return (
              <div key={comment.id}>

                {/* ── Level-1 comment (User B) ── */}
                <div className="relative" style={{ paddingLeft: 44 }}>
                  {/* Curved L-connector: left border (vertical) + bottom border (horizontal) + radius */}
                  <div className="absolute pointer-events-none"
                    style={{
                      left: 32, top: 0, width: 28, height: 24,
                      borderLeft: `2px solid ${LINE_COLOR}`,
                      borderBottom: `2px solid ${LINE_COLOR}`,
                      borderBottomLeftRadius: 12,
                    }} />
                  <MessageRow message={comment} topic={topic} userId={userId} userRole={userRole} />
                </div>

                {/* ── Level-2 replies (User C → User B) ── */}
                {commentReplies.length > 0 && (
                  <div className="relative">
                    {/* L1 line: L1 avatar centre (x=74) → runs through all replies to this comment */}
                    <div className="absolute pointer-events-none"
                      style={{ left: 74, top: 0, bottom: 0, width: 2, backgroundColor: LINE_COLOR }} />

                    {commentReplies.map((reply) => (
                      <div key={reply.id} className="relative" style={{ paddingLeft: 74 }}>
                        {/* Curved L-connector: same style, narrower width, smaller radius */}
                        <div className="absolute pointer-events-none"
                          style={{
                            left: 74, top: 0, width: 16, height: 24,
                            borderLeft: `2px solid ${LINE_COLOR}`,
                            borderBottom: `2px solid ${LINE_COLOR}`,
                            borderBottomLeftRadius: 8,
                          }} />
                        <MessageRow message={reply} topic={topic} userId={userId} userRole={userRole} />
                      </div>
                    ))}
                  </div>
                )}

              </div>
            )
          })}
        </div>
      )}

      {/* ── Reply input ── */}
      {!loading && (
        <div className="pb-3" style={{ paddingLeft: 60, paddingRight: 16 }}>
          <ReplyInput topic={topic} userId={userId} replyTo={null} onClearReplyTo={() => {}} />
        </div>
      )}

    </div>
  )
}
