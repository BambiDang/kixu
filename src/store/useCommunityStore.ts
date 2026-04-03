import { create } from 'zustand'
import type { Database } from '@/types/database'

type Community = Database['public']['Tables']['communities']['Row']

interface CommunityStore {
  communities: Community[]
  currentCommunity: Community | null
  setCommunities: (communities: Community[]) => void
  setCurrentCommunity: (community: Community | null) => void
  upsertCommunity: (community: Community) => void
}

export const useCommunityStore = create<CommunityStore>((set) => ({
  communities: [],
  currentCommunity: null,
  setCommunities: (communities) => set({ communities }),
  setCurrentCommunity: (community) => set({ currentCommunity: community }),
  upsertCommunity: (community) =>
    set((state) => {
      const exists = state.communities.find((c) => c.id === community.id)
      if (exists) {
        return {
          communities: state.communities.map((c) =>
            c.id === community.id ? community : c
          ),
        }
      }
      return { communities: [community, ...state.communities] }
    }),
}))
