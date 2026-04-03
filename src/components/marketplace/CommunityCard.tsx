import Link from 'next/link'
import type { Database, Language } from '@/types/database'

type Community = Database['public']['Tables']['communities']['Row']

interface Props {
  community: Community
  memberCount: number
}

export default function CommunityCard({ community, memberCount }: Props) {
  const languages = (community.languages as Language[] | null) ?? []
  const price = community.price_monthly === 0
    ? 'Free'
    : `$${(community.price_monthly / 100).toFixed(0)}/mo`

  return (
    <Link href={`/${community.slug}`} className="block">
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow duration-150">
        {/* Cover image */}
        <div className="h-32 bg-gradient-to-br from-blue-100 to-blue-50 relative">
          {community.cover_image_url && (
            <img src={community.cover_image_url} alt={community.name} className="w-full h-full object-cover" />
          )}
        </div>

        <div className="p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-gray-900 text-sm leading-tight">{community.name}</h3>
            <span className="text-xs font-medium text-blue-600 flex-shrink-0 bg-blue-50 px-2 py-0.5 rounded-full">
              {price}
            </span>
          </div>

          {community.category && (
            <span className="inline-block text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              {community.category}
            </span>
          )}

          {/* Language tags */}
          {languages.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {languages.map((l) => (
                <span key={l.language_code} className="text-xs text-gray-500">
                  {l.flag_emoji} {l.language_code}
                </span>
              ))}
            </div>
          )}

          <p className="text-xs text-gray-400">{memberCount} members</p>
        </div>
      </div>
    </Link>
  )
}
