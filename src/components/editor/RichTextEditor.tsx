'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { useEffect } from 'react'

interface Props {
  value?: string
  onChange: (html: string) => void
  onSubmit?: () => void
  placeholder?: string
  autoFocus?: boolean
}

export default function RichTextEditor({ value, onChange, onSubmit, placeholder = 'Write something...', autoFocus }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-blue-600 underline', target: '_blank', rel: 'noreferrer' },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value ?? '',
    onUpdate({ editor }) {
      const html = editor.isEmpty ? '' : editor.getHTML()
      onChange(html)
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[40px] px-3 py-2',
      },
      handleKeyDown(_, event) {
        if (event.key === 'Enter' && !event.shiftKey && onSubmit) {
          // Only submit on Enter for single-line style (no shift)
          const hasContent = !editor?.isEmpty
          if (hasContent) {
            event.preventDefault()
            onSubmit()
            return true
          }
        }
        return false
      },
    },
    autofocus: autoFocus ? 'end' : false,
    immediatelyRender: false,
  })

  // Reset content after submit (when value becomes empty string)
  useEffect(() => {
    if (!editor) return
    if (value === '' && !editor.isEmpty) {
      editor.commands.clearContent()
    }
  }, [value, editor])

  const setLink = () => {
    const url = window.prompt('URL:')
    if (!url) return
    if (url === '') {
      editor?.chain().focus().unsetLink().run()
      return
    }
    editor?.chain().focus().setLink({ href: url }).run()
  }

  if (!editor) return null

  return (
    <div className="border border-gray-200 rounded-lg bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-gray-100">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          title="Bold"
        >
          <span className="font-bold text-xs">B</span>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          title="Italic"
        >
          <span className="italic text-xs">I</span>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
          title="Bullet list"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
        </ToolbarButton>
        <ToolbarButton
          onClick={setLink}
          active={editor.isActive('link')}
          title="Add link"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </ToolbarButton>
      </div>
      {/* Editor */}
      <EditorContent editor={editor} />
    </div>
  )
}

function ToolbarButton({ onClick, active, title, children }: {
  onClick: () => void
  active: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`w-7 h-7 flex items-center justify-center rounded transition-colors ${
        active ? 'bg-blue-100 text-blue-700' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
      }`}
    >
      {children}
    </button>
  )
}
