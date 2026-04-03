import { create } from 'zustand'

interface UnreadStore {
  /** Set of topic IDs that are unread for the current user */
  unreadTopicIds: Set<string>
  /** Set of topic IDs the current user follows */
  followedTopicIds: Set<string>
  /** Map of community_id → boolean: has any unread topic */
  communityUnread: Record<string, boolean>

  setUnreadTopics: (topicIds: string[]) => void
  markTopicRead: (topicId: string) => void
  addUnreadTopic: (topicId: string, communityId: string) => void

  setFollowedTopics: (topicIds: string[]) => void
  toggleFollow: (topicId: string) => void

  setCommunityUnread: (communityId: string, hasUnread: boolean) => void
}

export const useUnreadStore = create<UnreadStore>((set) => ({
  unreadTopicIds: new Set(),
  followedTopicIds: new Set(),
  communityUnread: {},

  setUnreadTopics: (topicIds) =>
    set({ unreadTopicIds: new Set(topicIds) }),

  markTopicRead: (topicId) =>
    set((state) => {
      const next = new Set(state.unreadTopicIds)
      next.delete(topicId)
      return { unreadTopicIds: next }
    }),

  addUnreadTopic: (topicId, communityId) =>
    set((state) => {
      const next = new Set(state.unreadTopicIds)
      next.add(topicId)
      return {
        unreadTopicIds: next,
        communityUnread: { ...state.communityUnread, [communityId]: true },
      }
    }),

  setFollowedTopics: (topicIds) =>
    set({ followedTopicIds: new Set(topicIds) }),

  toggleFollow: (topicId) =>
    set((state) => {
      const next = new Set(state.followedTopicIds)
      if (next.has(topicId)) {
        next.delete(topicId)
      } else {
        next.add(topicId)
      }
      return { followedTopicIds: next }
    }),

  setCommunityUnread: (communityId, hasUnread) =>
    set((state) => ({
      communityUnread: { ...state.communityUnread, [communityId]: hasUnread },
    })),
}))
