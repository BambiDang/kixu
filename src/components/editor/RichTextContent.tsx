interface Props {
  html: string
  className?: string
}

// Renders stored HTML (from Tiptap) safely with prose styles.
// Plain-text messages (pre-Tiptap) render fine inside <p> tags via prose.
export default function RichTextContent({ html, className = '' }: Props) {
  // Sanitize: strip script tags and event handlers before rendering
  const safe = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\s+on\w+="[^"]*"/g, '')
    .replace(/\s+on\w+='[^']*'/g, '')

  // Plain text (no HTML tags) — wrap in paragraph for consistent styling
  const isPlainText = !safe.includes('<')
  const content = isPlainText ? `<p>${safe}</p>` : safe

  return (
    <div
      className={`prose prose-sm max-w-none text-gray-800
        prose-p:my-1 prose-ul:my-1 prose-li:my-0
        prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
        ${className}`}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  )
}
