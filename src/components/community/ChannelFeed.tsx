'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUnreadStore } from '@/store/useUnreadStore'
import TopicCard from '@/components/topics/TopicCard'
import NewTopicInput from '@/components/topics/NewTopicInput'
import type { Database } from '@/types/database'

type Community = Database['public']['Tables']['communities']['Row']
type Topic = Database['public']['Tables']['topics']['Row']

interface Props {
  community: Community
  userId: string
  userRole: 'admin' | 'member'
  canPin: boolean
  channelId: string
  memberCount: number
  upcomingSlot: { start_time: string; title: string; type: string } | null
}

export default function ChannelFeed({ community, userId, userRole, canPin, channelId, memberCount, upcomingSlot }: Props) {
  const supabase = createClient()
  const {
    unreadTopicIds, addUnreadTopic, markTopicRead, setUnreadTopics,
    followedTopicIds, setFollowedTopics, setTopicChannelMap, addTopicToChannelMap,
  } = useUnreadStore()

  const formatSlotDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit',
    })

  const bannerVisible = upcomingSlot ? new Date(upcomingSlot.start_time) > new Date() : false

  const [topics, setTopics] = useState<Topic[]>([])
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)

    const [topicsRes, pinsRes, readsRes, followsRes] = await Promise.all([
      supabase
        .from('topics')
        .select('*')
        .eq('community_id', community.id)
        .eq('channel_id', channelId)
        .order('last_activity_at', { ascending: false }),
      supabase.from('pinned_topics').select('topic_id').eq('community_id', community.id),
      supabase.from('topic_reads').select('topic_id, last_read_at').eq('user_id', userId),
      supabase.from('topic_follows').select('topic_id').eq('user_id', userId),
    ])

    const allTopics = topicsRes.data ?? []
    const reads = new Map((readsRes.data ?? []).map((r) => [r.topic_id, r.last_read_at]))
    const unreadIds = allTopics
      .filter((t) => { const read = reads.get(t.id); return !read || t.last_activity_at > read })
      .map((t) => t.id)

    setTopics(allTopics)
    setPinnedIds(new Set((pinsRes.data ?? []).map((p) => p.topic_id)))
    setUnreadTopics(unreadIds)
    setFollowedTopics((followsRes.data ?? []).map((f) => f.topic_id))
    // Populate topic→channel map for sidebar unread dots
    setTopicChannelMap(Object.fromEntries(allTopics.map((t) => [t.id, t.channel_id])))
    setLoading(false)
  }, [community.id, userId, channelId])

  useEffect(() => { loadData() }, [loadData])

  // Real-time subscriptions
  useEffect(() => {
    const topicsSub = supabase
      .channel(`topics:${community.id}:${channelId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'topics', filter: `community_id=eq.${community.id}` },
        (payload) => {
          const updated = payload.new as Topic
          if (updated.channel_id !== channelId) return
          setTopics((prev) =>
            [...prev.map((t) => (t.id === updated.id ? updated : t))]
              .sort((a, b) => b.last_activity_at.localeCompare(a.last_activity_at))
          )
          if (followedTopicIds.has(updated.id)) addUnreadTopic(updated.id, community.id)
        })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'topics', filter: `community_id=eq.${community.id}` },
        (payload) => {
          const newTopic = payload.new as Topic
          if (newTopic.channel_id !== channelId) return
          setTopics((prev) => [newTopic, ...prev])
          addTopicToChannelMap(newTopic.id, newTopic.channel_id)
          if (newTopic.created_by !== userId) addUnreadTopic(newTopic.id, community.id)
        })
      .subscribe()

    const pinnedSub = supabase
      .channel(`pinned:${community.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pinned_topics', filter: `community_id=eq.${community.id}` },
        (payload) => setPinnedIds((prev) => new Set([...prev, payload.new.topic_id])))
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'pinned_topics', filter: `community_id=eq.${community.id}` },
        (payload) => setPinnedIds((prev) => { const n = new Set(prev); n.delete(payload.old.topic_id); return n }))
      .subscribe()

    return () => {
      supabase.removeChannel(topicsSub)
      supabase.removeChannel(pinnedSub)
    }
  }, [community.id, userId, channelId, followedTopicIds])

  function onTopicCreated(topic: Topic) {
    setTopics((prev) => [topic, ...prev])
    markTopicRead(topic.id)
  }

  const pinnedTopics = topics.filter((t) => pinnedIds.has(t.id))
  const unpinnedTopics = topics.filter((t) => !pinnedIds.has(t.id))

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading…</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">

        {/* Upcoming session banner */}
        {bannerVisible && upcomingSlot && (
          <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
            <span className="text-lg">📅</span>
            <div>
              <span className="font-medium text-amber-900">
                Upcoming {upcomingSlot.type === 'group' ? 'Group Session' : '1:1 Session'}:
              </span>{' '}
              <span className="text-amber-800">{upcomingSlot.title}</span>
              <span className="text-amber-700 ml-1">— {formatSlotDate(upcomingSlot.start_time)}</span>
            </div>
          </div>
        )}

        <NewTopicInput
          communityId={community.id}
          channelId={channelId}
          userId={userId}
          isAnonymousEnabled={community.is_anonymous_enabled}
          onCreated={onTopicCreated}
        />

        {/* Pinned topics */}
        {pinnedTopics.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">📌 Pinned</p>
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

        {unpinnedTopics.length === 0 && pinnedTopics.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">
            No posts in this channel yet. Be the first to start a conversation!
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
    </div>
  )
}
