'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useUnreadStore } from '@/store/useUnreadStore'
import TopicCard from '@/components/topics/TopicCard'
import type { Database } from '@/types/database'

type Community = Database['public']['Tables']['communities']['Row']
type Topic = Database['public']['Tables']['topics']['Row']

interface LanguageEntry {
  flag_emoji: string
  language_code: string
  language_name: string
}

interface Props {
  community: Community
  userId: string
  userRole: 'admin' | 'member'
  canPin: boolean
  memberCount: number
  upcomingSlot: { start_time: string; title: string; type: string } | null
  pinnedTopics: Topic[]
  recentTopics: Topic[]
  channelNames: Record<string, string>
  hasPosted: boolean
  slug: string
}

export default function HomeDashboard({
  community, userId, userRole, canPin, memberCount,
  upcomingSlot, pinnedTopics, recentTopics, channelNames, hasPosted, slug,
}: Props) {
  const { unreadTopicIds, followedTopicIds, markTopicRead } = useUnreadStore()
  const [bannerDismissed, setBannerDismissed] = useState(false)

  const languages = (community.languages as unknown as LanguageEntry[] | null) ?? []

  const bannerVisible =
    !bannerDismissed &&
    upcomingSlot != null &&
    new Date(upcomingSlot.start_time) > new Date()

  const formatSlotDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit',
    })

  const relativeTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime()
    if (diff < 60000) return 'just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return `${Math.floor(diff / 86400000)}d ago`
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {/* ── Community info bar ── */}
      <div className="px-5 py-2 flex items-center flex-wrap gap-x-4 gap-y-1.5 border-b border-gray-100 bg-white text-sm text-gray-500">
        <span className="flex items-center gap-1.5 font-semibold text-gray-800 text-base">
          {community.name}
        </span>

        <span className="flex items-center gap-1 text-xs">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {memberCount} {memberCount === 1 ? 'member' : 'members'}
        </span>

        {languages.map((lang) => (
          <span
            key={lang.language_code}
            className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded-full text-xs text-gray-600"
          >
            {lang.flag_emoji} {lang.language_code}
          </span>
        ))}

        <div className="flex-1" />

        {userRole === 'admin' && (
          <Link
            href={`/community/${slug}/settings`}
            className="flex items-center gap-1 text-gray-400 hover:text-gray-700 transition-colors text-xs"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </Link>
        )}
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-8">

        {/* ── Upcoming session banner ── */}
        {bannerVisible && upcomingSlot && (
          <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
            <span className="text-lg">📅</span>
            <div className="flex-1">
              <span className="font-medium text-amber-900">
                Upcoming {upcomingSlot.type === 'group' ? 'Group Session' : '1:1 Session'}:
              </span>{' '}
              <span className="text-amber-800">{upcomingSlot.title}</span>
              <span className="text-amber-700 ml-1">— {formatSlotDate(upcomingSlot.start_time)}</span>
            </div>
            <button
              onClick={() => setBannerDismissed(true)}
              className="text-amber-400 hover:text-amber-600 transition-colors flex-shrink-0"
              aria-label="Dismiss"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* ── First-post prompt ── */}
        {!hasPosted && (
          <div className="px-4 py-3 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-700">
            👋 What&apos;s a challenge you&apos;re working through right now?{' '}
            <span className="font-medium">Pick a channel from the sidebar and start a conversation.</span>
          </div>
        )}

        {/* ── Pinned posts ── */}
        {pinnedTopics.length > 0 && (
          <section>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">📌 Pinned</p>
            <div className="space-y-3">
              {pinnedTopics.map((topic) => (
                <TopicCard
                  key={topic.id}
                  topic={topic}
                  userId={userId}
                  userRole={userRole}
                  canPin={canPin}
                  isPinned={true}
                  isUnread={unreadTopicIds.has(topic.id)}
                  isFollowed={followedTopicIds.has(topic.id)}
                  onRead={() => markTopicRead(topic.id)}
                />
              ))}
            </div>
          </section>
        )}

        {/* ── Recent activity ── */}
        <section>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">🕐 Recent activity</p>
          {recentTopics.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">
              No conversations yet. Pick a channel from the sidebar and start one!
            </div>
          ) : (
            <div className="space-y-1">
              {recentTopics.map((topic) => {
                const channelLabel = topic.channel_id ? channelNames[topic.channel_id] : null
                const channelHref = topic.channel_id
                  ? `/community/${slug}/channels/${topic.channel_id}`
                  : null
                const isUnread = unreadTopicIds.has(topic.id)

                // Strip HTML tags for snippet
                const snippet = topic.root_message
                  .replace(/<[^>]+>/g, '')
                  .trim()
                  .slice(0, 120)

                return (
                  <div
                    key={topic.id}
                    className={`flex items-start gap-3 px-3 py-3 rounded-lg transition-colors group ${
                      isUnread ? 'bg-blue-50/60' : 'hover:bg-gray-50'
                    }`}
                  >
                    {/* Unread dot */}
                    <div className="mt-1.5 flex-shrink-0">
                      {isUnread
                        ? <span className="w-2 h-2 rounded-full bg-blue-500 block" />
                        : <span className="w-2 h-2 rounded-full bg-transparent block" />
                      }
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {channelLabel && channelHref && (
                          <Link
                            href={channelHref}
                            className="text-xs px-2 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full transition-colors"
                          >
                            {channelLabel}
                          </Link>
                        )}
                        <span className="text-xs text-gray-400">{relativeTime(topic.last_activity_at)}</span>
                      </div>
                      <p className={`text-sm mt-0.5 truncate ${isUnread ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                        {snippet || '(no content)'}
                      </p>
                    </div>

                    {/* Navigate to channel */}
                    {channelHref && (
                      <Link
                        href={channelHref}
                        className="flex-shrink-0 text-gray-300 group-hover:text-gray-500 transition-colors mt-1"
                        aria-label="Open channel"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>

      </div>
    </div>
  )
}
