'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

type ChannelSection = Database['public']['Tables']['channel_sections']['Row']
type Channel = Database['public']['Tables']['channels']['Row']

interface Props {
  communityId: string
  sections: ChannelSection[]
  channels: Channel[]
}

const EMOJI_OPTIONS = ['💬', '📢', '📚', '🎯', '🎉', '💡', '❓', '🏆', '🎥', '🔔', '🌍', '⚡']

export default function ChannelManager({ communityId, sections: initialSections, channels: initialChannels }: Props) {
  const supabase = createClient()
  const router = useRouter()

  const [sections, setSections] = useState(initialSections)
  const [channels, setChannels] = useState(initialChannels)

  const [newSectionName, setNewSectionName] = useState('')
  const [addingSection, setAddingSection] = useState(false)

  const [addingChannelToSection, setAddingChannelToSection] = useState<string | null>(null)
  const [newChannelName, setNewChannelName] = useState('')
  const [newChannelEmoji, setNewChannelEmoji] = useState('💬')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function addSection() {
    if (!newSectionName.trim()) return
    setSubmitting(true)
    const { data, error: err } = await supabase.from('channel_sections').insert({
      community_id: communityId,
      name: newSectionName.trim(),
      position: sections.length,
    }).select().single()
    setSubmitting(false)
    if (err) { setError(err.message); return }
    setSections([...sections, data])
    setNewSectionName('')
    setAddingSection(false)
  }

  async function addChannel(sectionId: string | null) {
    if (!newChannelName.trim()) return
    setSubmitting(true)
    const { data, error: err } = await supabase.from('channels').insert({
      community_id: communityId,
      section_id: sectionId,
      name: newChannelName.trim(),
      icon_emoji: newChannelEmoji,
      position: channels.filter((c) => c.section_id === sectionId).length,
    }).select().single()
    setSubmitting(false)
    if (err) { setError(err.message); return }
    setChannels([...channels, data])
    setNewChannelName('')
    setNewChannelEmoji('💬')
    setAddingChannelToSection(null)
    router.refresh()
  }

  async function deleteChannel(id: string) {
    if (!confirm('Delete this channel? All topics in it will lose their channel assignment.')) return
    await supabase.from('channels').delete().eq('id', id)
    setChannels(channels.filter((c) => c.id !== id))
  }

  async function deleteSection(id: string) {
    if (!confirm('Delete this section? Channels inside will become unsectioned.')) return
    await supabase.from('channel_sections').delete().eq('id', id)
    setSections(sections.filter((s) => s.id !== id))
  }

  const unsectioned = channels.filter((c) => !c.section_id)

  return (
    <section id="channels" className="border border-gray-200 rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold text-gray-900">Channels</h2>
          <p className="text-xs text-gray-400 mt-0.5">Organize your community feed into sections and channels</p>
        </div>
        <button
          onClick={() => setAddingSection(true)}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          + Add section
        </button>
      </div>

      {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

      {/* Unsectioned channels */}
      {(unsectioned.length > 0 || addingChannelToSection === '') && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">General</p>
            <button
              onClick={() => { setAddingChannelToSection(''); setNewChannelName(''); setNewChannelEmoji('💬') }}
              className="text-xs text-blue-600 hover:underline"
            >+ Add channel</button>
          </div>
          {unsectioned.map((ch) => (
            <ChannelRow key={ch.id} channel={ch} onDelete={() => deleteChannel(ch.id)} />
          ))}
          {addingChannelToSection === '' && (
            <ChannelForm
              name={newChannelName}
              emoji={newChannelEmoji}
              onNameChange={setNewChannelName}
              onEmojiChange={setNewChannelEmoji}
              onAdd={() => addChannel(null)}
              onCancel={() => setAddingChannelToSection(null)}
              submitting={submitting}
            />
          )}
        </div>
      )}

      {/* Sections */}
      {sections.map((section) => {
        const sectionChannels = channels.filter((c) => c.section_id === section.id)
        return (
          <div key={section.id} className="mb-4 border border-gray-100 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">{section.name}</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setAddingChannelToSection(section.id); setNewChannelName(''); setNewChannelEmoji('💬') }}
                  className="text-xs text-blue-600 hover:underline"
                >+ Channel</button>
                <button
                  onClick={() => deleteSection(section.id)}
                  className="text-xs text-red-400 hover:text-red-600"
                >Delete</button>
              </div>
            </div>
            {sectionChannels.map((ch) => (
              <ChannelRow key={ch.id} channel={ch} onDelete={() => deleteChannel(ch.id)} />
            ))}
            {addingChannelToSection === section.id && (
              <ChannelForm
                name={newChannelName}
                emoji={newChannelEmoji}
                onNameChange={setNewChannelName}
                onEmojiChange={setNewChannelEmoji}
                onAdd={() => addChannel(section.id)}
                onCancel={() => setAddingChannelToSection(null)}
                submitting={submitting}
              />
            )}
          </div>
        )
      })}

      {/* Add section form */}
      {addingSection && (
        <div className="flex items-center gap-2 mt-2">
          <input
            value={newSectionName}
            onChange={(e) => setNewSectionName(e.target.value)}
            placeholder="Section name (e.g. Community)"
            onKeyDown={(e) => e.key === 'Enter' && addSection()}
            className="flex-1 px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          <button
            onClick={addSection}
            disabled={submitting || !newSectionName.trim()}
            className="px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            {submitting ? 'Adding…' : 'Add'}
          </button>
          <button onClick={() => setAddingSection(false)} className="px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-md">
            Cancel
          </button>
        </div>
      )}

      {sections.length === 0 && channels.length === 0 && !addingSection && (
        <p className="text-sm text-gray-400 text-center py-4">
          No sections yet. Add a section to organize your channels.
        </p>
      )}
    </section>
  )
}

function ChannelRow({ channel, onDelete }: { channel: Channel; onDelete: () => void }) {
  return (
    <div className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-gray-50 group">
      <div className="flex items-center gap-2 text-sm text-gray-700">
        <span>{channel.icon_emoji}</span>
        <span>{channel.name}</span>
      </div>
      <button
        onClick={onDelete}
        className="text-xs text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        Delete
      </button>
    </div>
  )
}

function ChannelForm({ name, emoji, onNameChange, onEmojiChange, onAdd, onCancel, submitting }: {
  name: string
  emoji: string
  onNameChange: (v: string) => void
  onEmojiChange: (v: string) => void
  onAdd: () => void
  onCancel: () => void
  submitting: boolean
}) {
  const EMOJI_OPTIONS = ['💬', '📢', '📚', '🎯', '🎉', '💡', '❓', '🏆', '🎥', '🔔', '🌍', '⚡']
  return (
    <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
      <div className="flex gap-2">
        <select
          value={emoji}
          onChange={(e) => onEmojiChange(e.target.value)}
          className="w-16 px-2 py-1.5 border border-gray-200 rounded-md text-sm bg-white focus:outline-none"
        >
          {EMOJI_OPTIONS.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
        <input
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          onKeyDown={(ev) => ev.key === 'Enter' && onAdd()}
          placeholder="Channel name"
          autoFocus
          className="flex-1 px-3 py-1.5 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={onAdd}
          disabled={submitting || !name.trim()}
          className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 disabled:opacity-60 transition-colors"
        >
          {submitting ? 'Adding…' : 'Add channel'}
        </button>
        <button onClick={onCancel} className="text-xs text-gray-500 hover:text-gray-700">Cancel</button>
      </div>
    </div>
  )
}
