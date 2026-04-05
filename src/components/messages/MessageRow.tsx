'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import ReactionBar from '@/components/reactions/ReactionBar'
import RichTextContent from '@/components/editor/RichTextContent'
import type { Database } from '@/types/database'

type Message = Database['public']['Tables']['messages']['Row']
type Topic = Database['public']['Tables']['topics']['Row']

const COMMON_EMOJIS = ['👍', '❤️', '😂', '🔥', '🎉', '👀', '💯', '🙌']

interface AuthorInfo {
  display_name: string | null
  avatar_url: string | null
}

interface MentionResult {
  user_id: string
  display_name: string | null
  username: string | null
}

interface Props {
  message: Message
  topic: Topic
  userId: string
  userRole: 'admin' | 'member'
}

export default function MessageRow({ message, topic, userId }: Props) {
  const supabase = createClient()
  const [author, setAuthor] = useState<AuthorInfo | null>(null)
  const [replyToAuthorName, setReplyToAuthorName] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [showInlineReply, setShowInlineReply] = useState(false)

  useEffect(() => {
    loadAuthor()
    if (message.reply_to_id) loadReplyToAuthor()
  }, [message.id])

  async function loadAuthor() {
    if (message.is_anonymous) {
      const { data } = await supabase
        .from('topic_anonymous_identities')
        .select('pseudonym')
        .eq('topic_id', message.topic_id)
        .eq('user_id', message.user_id)
        .maybeSingle()
      setAuthor({ display_name: data?.pseudonym ?? 'Anonymous', avatar_url: null })
    } else {
      const { data } = await supabase
        .from('users')
        .select('display_name, avatar_url')
        .eq('id', message.user_id)
        .single()
      if (data) setAuthor(data)
    }
  }

  async function loadReplyToAuthor() {
    if (!message.reply_to_id) return
    const { data: parent } = await supabase
      .from('messages')
      .select('user_id, is_anonymous, topic_id')
      .eq('id', message.reply_to_id)
      .maybeSingle()
    if (!parent) return

    if (parent.is_anonymous) {
      const { data } = await supabase
        .from('topic_anonymous_identities')
        .select('pseudonym')
        .eq('topic_id', parent.topic_id)
        .eq('user_id', parent.user_id)
        .maybeSingle()
      setReplyToAuthorName(data?.pseudonym ?? 'Anonymous')
    } else {
      const { data } = await supabase
        .from('users')
        .select('display_name')
        .eq('id', parent.user_id)
        .maybeSingle()
      setReplyToAuthorName(data?.display_name ?? null)
    }
  }

  async function handleEmojiSelect(emoji: string) {
    setPickerOpen(false)
    const { data: existing } = await supabase
      .from('reactions')
      .select('id')
      .eq('message_id', message.id)
      .eq('user_id', userId)
      .eq('emoji', emoji)
      .maybeSingle()
    if (existing) {
      await supabase.from('reactions').delete().eq('id', existing.id)
    } else {
      await supabase.from('reactions').insert({ message_id: message.id, user_id: userId, emoji })
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
    <div className="px-4 py-2 hover:bg-gray-50/50">
      <div className="flex items-start gap-2">

        {/* Reply avatar */}
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5 ${
          message.is_anonymous ? 'bg-gray-200 text-gray-500' : 'bg-blue-100 text-blue-700'
        }`}>
          {message.is_anonymous ? (
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          ) : (
            author?.display_name?.[0]?.toUpperCase() ?? '?'
          )}
        </div>

        <div className="flex-1 min-w-0">

          {/* Author + timestamp */}
          <div className="flex items-baseline gap-2">
            <span className={`text-xs font-semibold ${
              message.is_anonymous ? 'text-gray-500 italic' : 'text-gray-800'
            }`}>
              {author?.display_name ?? '…'}
            </span>
            <span className="text-xs text-gray-400">{relativeTime(message.created_at)}</span>
          </div>

          {/* @mention — shows who this reply is directed at (YouTube style, in blue) */}
          {replyToAuthorName && (
            <span className="text-blue-500 text-sm font-medium">@{replyToAuthorName} </span>
          )}

          {/* Message content */}
          <RichTextContent html={message.content} className="text-sm text-gray-700" />

          {/* Reaction pills */}
          <ReactionBar messageId={message.id} userId={userId} hideAddButton />

          {/* Action buttons */}
          <div className="flex items-center gap-0.5 mt-1">
            {/* Like */}
            <div className="relative">
              <button
                onClick={() => setPickerOpen((o) => !o)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                  pickerOpen ? 'bg-gray-100 text-gray-700' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span>👍</span>
                <span>Like</span>
              </button>
              {pickerOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setPickerOpen(false)} />
                  <div className="absolute bottom-full left-0 mb-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg p-2 flex gap-1">
                    {COMMON_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => handleEmojiSelect(emoji)}
                        className="w-8 h-8 flex items-center justify-center text-lg hover:bg-gray-100 rounded transition-colors"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Reply */}
            <button
              onClick={() => setShowInlineReply((r) => !r)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                showInlineReply ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span>Reply</span>
            </button>
          </div>

          {/* Inline reply input */}
          {showInlineReply && (
            <InlineReplyInput
              topicId={message.topic_id}
              communityId={topic.community_id}
              userId={userId}
              replyToId={message.id}
              isAnonymousTopic={topic.is_anonymous_topic}
              onClose={() => setShowInlineReply(false)}
            />
          )}

        </div>
      </div>
    </div>
  )
}

// ── Inline reply input ───────────────────────────────────────────────────────

function InlineReplyInput({
  topicId, communityId, userId, replyToId, isAnonymousTopic, onClose,
}: {
  topicId: string
  communityId: string
  userId: string
  replyToId: string
  isAnonymousTopic: boolean
  onClose: () => void
}) {
  const supabase = createClient()
  const [content, setContent] = useState('')
  const [isAnon, setIsAnon] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [mentionAnchor, setMentionAnchor] = useState<number | null>(null)
  const [mentionResults, setMentionResults] = useState<MentionResult[]>([])
  const [mentionHighlight, setMentionHighlight] = useState(0)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { textareaRef.current?.focus() }, [])

  useEffect(() => {
    if (mentionQuery === null) { setMentionResults([]); return }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from('community_members')
        .select('user_id, users!inner(display_name, username)')
        .eq('community_id', communityId)
        .neq('user_id', userId)
        .limit(8)
      if (!data) return
      const query = mentionQuery.toLowerCase()
      const results: MentionResult[] = (data as unknown as Array<{
        user_id: string
        users: { display_name: string | null; username: string | null }
      }>)
        .map((m) => ({ user_id: m.user_id, display_name: m.users.display_name, username: m.users.username }))
        .filter((m) => !query || m.display_name?.toLowerCase().includes(query) || m.username?.toLowerCase().includes(query))
      setMentionResults(results)
      setMentionHighlight(0)
    }, 150)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [mentionQuery, communityId, userId])

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value
    setContent(val)
    const cursor = e.target.selectionStart ?? val.length
    const match = val.slice(0, cursor).match(/@(\w*)$/)
    if (match) { setMentionQuery(match[1]); setMentionAnchor(cursor - match[0].length) }
    else { setMentionQuery(null); setMentionAnchor(null) }
  }

  function selectMention(user: MentionResult) {
    if (mentionAnchor === null) return
    const name = user.display_name ?? user.username ?? 'User'
    const before = content.slice(0, mentionAnchor)
    const after = content.slice(textareaRef.current?.selectionStart ?? content.length)
    setContent(`${before}@${name} ${after}`)
    setMentionQuery(null); setMentionAnchor(null); setMentionResults([])
    setTimeout(() => {
      const el = textareaRef.current
      if (!el) return
      el.focus()
      const pos = before.length + name.length + 2
      el.setSelectionRange(pos, pos)
    }, 0)
  }

  async function submit() {
    const trimmed = content.trim()
    if (!trimmed || submitting) return
    setSubmitting(true)
    const safe = trimmed.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    await supabase.from('messages').insert({
      topic_id: topicId, user_id: userId,
      content: `<p>${safe}</p>`,
      reply_to_id: replyToId, is_anonymous: isAnon,
    })
    setSubmitting(false); setContent(''); onClose()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (mentionResults.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMentionHighlight((h) => Math.min(h + 1, mentionResults.length - 1)); return }
      if (e.key === 'ArrowUp') { e.preventDefault(); setMentionHighlight((h) => Math.max(h - 1, 0)); return }
      if (e.key === 'Enter') { e.preventDefault(); selectMention(mentionResults[mentionHighlight]); return }
      if (e.key === 'Escape') { setMentionQuery(null); setMentionResults([]); return }
    }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() }
    if (e.key === 'Escape') onClose()
  }

  return (
    <div className="mt-2 border-l-2 border-blue-200 pl-3 py-1">
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Write a reply… (Enter to send · @ to mention)"
          rows={2}
          className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none bg-white placeholder-gray-400"
        />
        {mentionResults.length > 0 && (
          <div className="absolute bottom-full left-0 mb-1 z-30 w-56 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
            {mentionResults.map((user, i) => (
              <button
                key={user.user_id}
                onMouseDown={(e) => { e.preventDefault(); selectMention(user) }}
                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                  i === mentionHighlight ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-medium flex-shrink-0">
                  {user.display_name?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div className="min-w-0">
                  <div className="font-medium truncate">{user.display_name ?? user.username}</div>
                  {user.username && user.display_name && (
                    <div className="text-xs text-gray-400 truncate">@{user.username}</div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 mt-1.5">
        {isAnonymousTopic && (
          <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer select-none">
            <input type="checkbox" checked={isAnon} onChange={(e) => setIsAnon(e.target.checked)} className="rounded border-gray-300" />
            Post anonymously
          </label>
        )}
        <div className="flex gap-1.5 ml-auto">
          <button onClick={onClose} className="px-2.5 py-1 text-xs text-gray-500 hover:text-gray-700 rounded hover:bg-gray-100 transition-colors">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!content.trim() || submitting}
            className="px-2.5 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? '…' : 'Reply'}
          </button>
        </div>
      </div>
    </div>
  )
}
