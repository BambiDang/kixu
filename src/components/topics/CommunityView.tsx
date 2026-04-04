'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUnreadStore } from '@/store/useUnreadStore'
import TopicCard from './TopicCard'
import NewTopicInput from './NewTopicInput'
import type { Database, Language } from '@/types/database'

type Community = Database['public']['Tables']['communities']['Row']
type Topic = Database['public']['Tables']['topics']['Row']

interface Props {
  community: Community
  userId: string
  userRole: 'admin' | 'member'
  canPin: boolean
}

export default function CommunityView({ community, userId, userRole, canPin }: Props) {
  const supabase = createClient()
  const { unreadTopicIds, addUnreadTopic, markTopicRead, setUnreadTopics,
          followedTopicIds, setFollowedTopics } = useUnreadStore()

  const [topics, setTopics] = useState<Topic[]>([])
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set())
  const [memberCount, setMemberCount] = useState(0)
  const [hasPosted, setHasPosted] = useState(false)
  const [upcomingSession, setUpcomingSession] = useState<{ title: string; type: string; start_time: string } | null>(null)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    const [topicsRes, pinsRes, membersRes, readsRes, followsRes, postsRes] = await Promise.all([
      supabase.from('topics').select('*').eq('community_id', community.id).order('last_activity_at', { ascending: false }),
      supabase.from('pinned_topics').select('topic_id').eq('community_id', community.id),
      supabase.from('community_members').select('user_id', { count: 'exact', head: true }).eq('community_id', community.id),
      supabase.from('topic_reads').select('topic_id, last_read_at').eq('user_id', userId),
      supabase.from('topic_follows').select('topic_id').eq('user_id', userId),
      supabase.from('messages').select('id', { count: 'exact', head: true }).eq('user_id', userId)
        .in('topic_id', (await supabase.from('topics').select('id').eq('community_id', community.id)).data?.map(t => t.id) ?? []),
    ])

    const allTopics = topicsRes.data ?? []
    const reads = new Map((readsRes.data ?? []).map((r) => [r.topic_id, r.last_read_at]))
    const unreadIds = allTopics
      .filter((t) => {
        const read = reads.get(t.id)
        return !read || t.last_activity_at > read
      })
      .map((t) => t.id)

    setTopics(allTopics)
    setPinnedIds(new Set((pinsRes.data ?? []).map((p) => p.topic_id)))
    setMemberCount(membersRes.count ?? 0)
    setUnreadTopics(unreadIds)
    setFollowedTopics((followsRes.data ?? []).map((f) => f.topic_id))
    setHasPosted((postsRes.count ?? 0) > 0)
    setLoading(false)

    // Upcoming session within 7 days
    const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data: upcomingSlots } = await supabase
      .from('slots')
      .select('start_time, session_types(title, type)')
      .eq('status', 'available')
      .gt('start_time', new Date().toISOString())
      .lte('start_time', in7Days)
      .in('session_type_id',
        (await supabase.from('session_types').select('id').eq('community_id', community.id)).data?.map(s => s.id) ?? []
      )
      .order('start_time', { ascending: true })
      .limit(1)
      .single()

    if (upcomingSlots && !Array.isArray(upcomingSlots.session_types) && upcomingSlots.session_types) {
      setUpcomingSession({
        title: upcomingSlots.session_types.title,
        type: upcomingSlots.session_types.type,
        start_time: upcomingSlots.start_time,
      })
    }
  }, [community.id, userId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Real-time subscriptions
  useEffect(() => {
    // Topics updates (re-sort on last_activity_at change)
    const topicsSub = supabase
      .channel(`topics:${community.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'topics',
        filter: `community_id=eq.${community.id}`,
      }, (payload) => {
        const updated = payload.new as Topic
        setTopics((prev) =>
          [...prev.map((t) => (t.id === updated.id ? updated : t))]
            .sort((a, b) => b.last_activity_at.localeCompare(a.last_activity_at))
        )
        // Mark as unread if not our own activity
        if (followedTopicIds.has(updated.id)) {
          addUnreadTopic(updated.id, community.id)
        }
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'topics',
        filter: `community_id=eq.${community.id}`,
      }, (payload) => {
        const newTopic = payload.new as Topic
        setTopics((prev) => [newTopic, ...prev])
        if (newTopic.created_by !== userId) {
          addUnreadTopic(newTopic.id, community.id)
        }
      })
      .subscribe()

    // Pinned topics
    const pinnedSub = supabase
      .channel(`pinned:${community.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'pinned_topics',
        filter: `community_id=eq.${community.id}`,
      }, (payload) => {
        setPinnedIds((prev) => new Set([...prev, payload.new.topic_id]))
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'pinned_topics',
        filter: `community_id=eq.${community.id}`,
      }, (payload) => {
        setPinnedIds((prev) => {
          const next = new Set(prev)
          next.delete(payload.old.topic_id)
          return next
        })
      })
      .subscribe()

    // Member count
    const membersSub = supabase
      .channel(`members:${community.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'community_members',
        filter: `community_id=eq.${community.id}`,
      }, () => setMemberCount((c) => c + 1))
      .subscribe()

    return () => {
      supabase.removeChannel(topicsSub)
      supabase.removeChannel(pinnedSub)
      supabase.removeChannel(membersSub)
    }
  }, [community.id, userId, followedTopicIds])

  function onTopicCreated(topic: Topic) {
    setTopics((prev) => [topic, ...prev])
    setHasPosted(true)
    markTopicRead(topic.id)
  }

  const pinnedTopics = topics.filter((t) => pinnedIds.has(t.id))
  const unpinnedTopics = topics.filter((t) => !pinnedIds.has(t.id))
  const languages = (community.languages as Language[] | null) ?? []

  if (loading) {
    return <div className="flex items-center justify-center h-full text-gray-400 text-sm">Loading...</div>
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">{community.name}</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-gray-400">{memberCount} members</span>
            <div className="flex gap-1">
              {languages.map((l) => (
                <span key={l.language_code} className="text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-600">
                  {l.flag_emoji} {l.language_code}
                </span>
              ))}
            </div>
          </div>
        </div>
        {userRole === 'admin' && (
          <a
            href={`/community/${community.slug}/settings`}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Settings"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </a>
        )}
      </div>

      {/* Upcoming session banner */}
      {upcomingSession && new Date(upcomingSession.start_time) > new Date() && (
        <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
          <span className="text-blue-600">📅</span>
          <div>
            <span className="font-medium text-blue-800">{upcomingSession.title}</span>
            <span className="text-blue-500 ml-2 text-xs">
              {upcomingSession.type === 'group' ? 'Group Session' : '1:1 Session'}
            </span>
            <span className="text-blue-400 ml-2 text-xs">
              {new Date(upcomingSession.start_time).toLocaleDateString()}
            </span>
          </div>
        </div>
      )}

      {/* First-post prompt */}
      {!hasPosted && (
        <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
          What&apos;s a challenge you&apos;re working through right now? Start a conversation
        </div>
      )}

      {/* New topic input */}
      <NewTopicInput
        communityId={community.id}
        userId={userId}
        onCreated={onTopicCreated}
      />

      {/* Pinned topics */}
      {pinnedTopics.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Pinned</p>
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
        </div>
      )}

      {/* Topic list */}
      {unpinnedTopics.length === 0 && pinnedTopics.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          No conversations yet. Start the first one above!
        </div>
      ) : (
        <div className="space-y-3">
          {unpinnedTopics.map((topic) => (
            <TopicCard
              key={topic.id}
              topic={topic}
              userId={userId}
              userRole={userRole}
              canPin={canPin}
              isPinned={false}
              isUnread={unreadTopicIds.has(topic.id)}
              isFollowed={followedTopicIds.has(topic.id)}
              onRead={() => markTopicRead(topic.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
