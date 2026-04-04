'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useCommunityStore } from '@/store/useCommunityStore'
import { useUserStore } from '@/store/useUserStore'
import { useUnreadStore } from '@/store/useUnreadStore'
import type { Database } from '@/types/database'

type Community = Database['public']['Tables']['communities']['Row']

export default function Sidebar({ userId }: { userId: string }) {
  const supabase = createClient()
  const pathname = usePathname()
  const router = useRouter()
  const { communities, setCommunities } = useCommunityStore()
  const { user, setUser } = useUserStore()
  const { communityUnread } = useUnreadStore()
  const [mobileOpen, setMobileOpen] = useState(false)

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  useEffect(() => {
    async function load() {
      // Load user profile
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()
      if (profile) setUser(profile)

      // Load communities this user is a member of
      const { data: memberships } = await supabase
        .from('community_members')
        .select('community_id')
        .eq('user_id', userId)

      if (!memberships?.length) return

      const communityIds = memberships.map((m) => m.community_id)
      const { data: comms } = await supabase
        .from('communities')
        .select('*')
        .in('id', communityIds)
        .order('created_at', { ascending: false })

      if (comms) setCommunities(comms)
    }
    load()
  }, [userId])

  const currentSlug = pathname.match(/\/community\/([^/]+)/)?.[1]

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="md:hidden fixed top-3 left-3 z-50 p-2 rounded-md bg-white border border-gray-200"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle sidebar"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-50 flex flex-col
          w-[200px] bg-white border-r border-gray-200
          transition-transform duration-150 ease-in-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className="px-4 py-4 border-b border-gray-100">
          <span className="font-bold text-gray-900 text-base">Kixu</span>
        </div>

        {/* Community list */}
        <nav className="flex-1 overflow-y-auto py-2">
          <p className="px-4 py-1 text-xs font-medium text-gray-400 uppercase tracking-wider">
            Your communities
          </p>
          {communities.length === 0 && (
            <p className="px-4 py-2 text-xs text-gray-400">No communities yet</p>
          )}
          {communities.map((c) => (
            <CommunityRow
              key={c.id}
              community={c}
              isActive={currentSlug === c.slug}
              hasUnread={!!communityUnread[c.id]}
              onNavigate={() => setMobileOpen(false)}
            />
          ))}
        </nav>

        {/* Bottom actions */}
        <div className="border-t border-gray-100 p-3 space-y-1">
          <Link
            href="/community/new"
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 rounded-md hover:bg-gray-50 transition-colors"
            onClick={() => setMobileOpen(false)}
          >
            <span className="text-lg leading-none">+</span>
            Create community
          </Link>
          <Link
            href="/marketplace"
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 rounded-md hover:bg-gray-50 transition-colors"
            onClick={() => setMobileOpen(false)}
          >
            Browse marketplace
          </Link>
          <Link
            href="/bookings"
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 rounded-md hover:bg-gray-50 transition-colors"
            onClick={() => setMobileOpen(false)}
          >
            Bookings
          </Link>
        </div>

        {/* User profile + logout */}
        <div className="border-t border-gray-100 p-3">
          {user && (
            <div className="flex items-center gap-2 px-2 py-1 mb-1">
              <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-medium flex-shrink-0">
                {user.display_name?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-800 truncate">{user.display_name}</p>
                {user.username && <p className="text-xs text-gray-400 truncate">@{user.username}</p>}
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-500 rounded-md hover:bg-gray-50 hover:text-gray-700 transition-colors"
          >
            Sign out
          </button>
        </div>
      </aside>
    </>
  )
}

function CommunityRow({
  community,
  isActive,
  hasUnread,
  onNavigate,
}: {
  community: Community
  isActive: boolean
  hasUnread: boolean
  onNavigate: () => void
}) {
  const initial = community.name[0]?.toUpperCase() ?? '?'

  return (
    <Link
      href={`/community/${community.slug}`}
      onClick={onNavigate}
      className={`
        flex items-center gap-2 mx-2 px-2 py-2 rounded-md text-sm transition-colors
        ${isActive
          ? 'bg-blue-50 text-blue-700 border-l-2 border-blue-600'
          : 'text-gray-700 hover:bg-gray-50'
        }
      `}
    >
      {/* Color dot / initial */}
      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-medium">
        {initial}
      </span>
      <span className={`flex-1 truncate text-xs ${hasUnread && !isActive ? 'font-semibold' : ''}`}>
        {community.name}
      </span>
      {hasUnread && !isActive && (
        <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
      )}
    </Link>
  )
}
