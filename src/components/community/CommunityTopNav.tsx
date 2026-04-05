'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface Props {
  slug: string
  communityName: string
}

const TABS = [
  { label: 'Home', href: (slug: string) => `/community/${slug}` },
  { label: 'Courses', href: (slug: string) => `/community/${slug}/courses` },
  { label: 'Events', href: (slug: string) => `/community/${slug}/events` },
  { label: 'Members', href: (slug: string) => `/community/${slug}/members` },
]

export default function CommunityTopNav({ slug, communityName }: Props) {
  const pathname = usePathname()

  function isActive(tabHref: string) {
    if (tabHref === `/community/${slug}`) {
      // Home is active only when on exactly /community/[slug] or /community/[slug]?...
      return pathname === `/community/${slug}`
    }
    return pathname.startsWith(tabHref)
  }

  return (
    <div className="bg-white border-b border-gray-200 px-4 flex items-center gap-6">
      {/* Community name */}
      <span className="text-sm font-semibold text-gray-900 py-3 mr-2 shrink-0 truncate max-w-[160px]">
        {communityName}
      </span>

      {/* Tabs */}
      <nav className="flex items-center gap-1 overflow-x-auto">
        {TABS.map((tab) => {
          const href = tab.href(slug)
          const active = isActive(href)
          return (
            <Link
              key={tab.label}
              href={href}
              className={`
                px-3 py-3 text-sm whitespace-nowrap border-b-2 transition-colors
                ${active
                  ? 'border-blue-600 text-blue-600 font-medium'
                  : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
                }
              `}
            >
              {tab.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
