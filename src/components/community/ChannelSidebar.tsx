'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useUnreadStore } from '@/store/useUnreadStore'
import type { Database } from '@/types/database'

const EMOJI_OPTIONS = ['💬', '📢', '📚', '🎯', '🎉', '💡', '❓', '🏆', '🎥', '🔔', '🌍', '⚡']

type ChannelSection = Database['public']['Tables']['channel_sections']['Row']
type Channel = Database['public']['Tables']['channels']['Row']

interface Props {
  communityId: string
  slug: string
  activeChannelId: string | null
  userRole: 'admin' | 'member'
}

export default function ChannelSidebar({ communityId, slug, activeChannelId, userRole }: Props) {
  const supabase = createClient()
  const [sections, setSections] = useState<ChannelSection[]>([])
  const [channels, setChannels] = useState<Channel[]>([])
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [quickName, setQuickName] = useState('')
  const [quickEmoji, setQuickEmoji] = useState('💬')
  const [addingChannel, setAddingChannel] = useState(false)
  const quickInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function load() {
      const [sectionsRes, channelsRes] = await Promise.all([
        supabase.from('channel_sections').select('*').eq('community_id', communityId).order('position'),
        supabase.from('channels').select('*').eq('community_id', communityId).order('position'),
      ])
      setSections(sectionsRes.data ?? [])
      setChannels(channelsRes.data ?? [])
    }
    load()

    // Real-time: new channels/sections appear immediately
    const sub = supabase
      .channel(`channels:${communityId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'channels', filter: `community_id=eq.${communityId}` },
        (payload) => setChannels((prev) => [...prev, payload.new as Channel]))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'channel_sections', filter: `community_id=eq.${communityId}` },
        (payload) => setSections((prev) => [...prev, payload.new as ChannelSection]))
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'channels' },
        (payload) => setChannels((prev) => prev.filter((c) => c.id !== payload.old.id)))
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'channel_sections' },
        (payload) => setSections((prev) => prev.filter((s) => s.id !== payload.old.id)))
      .subscribe()

    return () => { supabase.removeChannel(sub) }
  }, [communityId])

  async function quickAddChannel() {
    if (!quickName.trim() || addingChannel) return
    setAddingChannel(true)
    const { error } = await supabase.from('channels').insert({
      community_id: communityId,
      name: quickName.trim(),
      icon_emoji: quickEmoji,
      position: channels.length,
    })
    setAddingChannel(false)
    if (!error) {
      setQuickName('')
      setQuickEmoji('💬')
      setShowQuickAdd(false)
    }
  }

  function toggleCollapse(sectionId: string) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      next.has(sectionId) ? next.delete(sectionId) : next.add(sectionId)
      return next
    })
  }

  // Unsectioned channels
  const unsectioned = channels.filter((c) => !c.section_id)
  // Channels grouped by section
  const bySectionId = sections.reduce<Record<string, Channel[]>>((acc, s) => {
    acc[s.id] = channels.filter((c) => c.section_id === s.id)
    return acc
  }, {})

  return (
    <aside className="w-52 shrink-0 border-r border-gray-200 bg-white overflow-y-auto flex flex-col">
      <nav className="flex-1 py-3 space-y-0.5">
        {/* Unsectioned channels */}
        {unsectioned.map((ch) => (
          <ChannelLink key={ch.id} channel={ch} slug={slug} isActive={activeChannelId === ch.id} />
        ))}

        {/* Sectioned channels */}
        {sections.map((section) => {
          const sectionChannels = bySectionId[section.id] ?? []
          const isCollapsed = collapsed.has(section.id)
          return (
            <div key={section.id}>
              <button
                onClick={() => toggleCollapse(section.id)}
                className="w-full flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-600 transition-colors"
              >
                <svg
                  className={`w-3 h-3 transition-transform ${isCollapsed ? '-rotate-90' : ''}`}
                  fill="currentColor" viewBox="0 0 20 20"
                >
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                {section.name}
              </button>
              {!isCollapsed && sectionChannels.map((ch) => (
                <ChannelLink key={ch.id} channel={ch} slug={slug} isActive={activeChannelId === ch.id} />
              ))}
            </div>
          )
        })}
      </nav>

      {/* Admin: inline quick-add */}
      {userRole === 'admin' && (
        <div className="border-t border-gray-100 p-2 space-y-1">
          {showQuickAdd ? (
            <div className="space-y-1.5">
              <div className="flex gap-1">
                <select
                  value={quickEmoji}
                  onChange={(e) => setQuickEmoji(e.target.value)}
                  className="w-12 px-1 py-1 border border-gray-200 rounded text-sm bg-white focus:outline-none"
                >
                  {EMOJI_OPTIONS.map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
                <input
                  ref={quickInputRef}
                  value={quickName}
                  onChange={(e) => setQuickName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') quickAddChannel(); if (e.key === 'Escape') setShowQuickAdd(false) }}
                  placeholder="Channel name"
                  autoFocus
                  className="flex-1 px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                />
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={quickAddChannel}
                  disabled={addingChannel || !quickName.trim()}
                  className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-60 transition-colors"
                >
                  {addingChannel ? '…' : 'Add'}
                </button>
                <button onClick={() => { setShowQuickAdd(false); setQuickName('') }}
                  className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowQuickAdd(true)}
              className="flex items-center gap-1.5 w-full px-2 py-1.5 text-xs text-gray-400 hover:text-gray-600 rounded transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add channel
            </button>
          )}
          <Link
            href={`/community/${slug}/settings#channels`}
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-300 hover:text-gray-500 rounded transition-colors"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Manage sections
          </Link>
        </div>
      )}
    </aside>
  )
}

function ChannelLink({ channel, slug, isActive }: { channel: Channel; slug: string; isActive: boolean }) {
  const { unreadTopicIds, topicChannelMap } = useUnreadStore()
  const hasUnread = !isActive && [...unreadTopicIds].some((tid) => topicChannelMap[tid] === channel.id)

  return (
    <Link
      href={`/community/${slug}/channels/${channel.id}`}
      className={`flex items-center gap-2 mx-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
        isActive
          ? 'bg-blue-50 text-blue-700 font-medium border-l-2 border-blue-600 rounded-l-none'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      }`}
    >
      <span className="text-base leading-none">{channel.icon_emoji}</span>
      <span className={`truncate text-xs flex-1 ${hasUnread ? 'font-semibold text-gray-900' : ''}`}>
        {channel.name}
      </span>
      {hasUnread && (
        <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
      )}
    </Link>
  )
}
