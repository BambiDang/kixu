import { createClient } from '@/lib/supabase/server'
import CommunityCard from '@/components/marketplace/CommunityCard'
import type { Language } from '@/types/database'

interface PageProps {
  searchParams: Promise<{ languages?: string }>
}

export const metadata = {
  title: 'Marketplace — Kixu',
  description: 'Browse and join communities from expert creators',
}

export default async function MarketplacePage({ searchParams }: PageProps) {
  const { languages: languagesParam } = await searchParams
  const selectedLanguages = languagesParam ? languagesParam.split(',').filter(Boolean) : []

  // Show placeholder if Supabase is not yet configured
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Kixu Marketplace</h1>
          <p className="text-gray-500 text-sm mb-4">
            To see live communities, add your Supabase credentials to <code className="bg-gray-100 px-1 rounded">.env.local</code>.
          </p>
          <a href="/login" className="text-blue-600 text-sm hover:underline">Go to login →</a>
        </div>
      </div>
    )
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch all communities with member counts
  const { data: communities } = await supabase
    .from('communities')
    .select('*')

  if (!communities) return <div>No communities found</div>

  // Get member counts
  const { data: memberCounts } = await supabase
    .from('community_members')
    .select('community_id')

  const countMap = new Map<string, number>()
  for (const row of memberCounts ?? []) {
    countMap.set(row.community_id, (countMap.get(row.community_id) ?? 0) + 1)
  }

  // Filter by selected languages (OR logic)
  let filtered = communities
  if (selectedLanguages.length > 0) {
    filtered = communities.filter((c) => {
      const langs = (c.languages as Language[] | null) ?? []
      return langs.some((l) => selectedLanguages.includes(l.language_code))
    })
  }

  // Sort by member count DESC
  filtered.sort((a, b) => (countMap.get(b.id) ?? 0) - (countMap.get(a.id) ?? 0))

  // Collect all unique languages for the filter bar
  const allLanguages = new Map<string, Language>()
  for (const c of communities) {
    const langs = (c.languages as Language[] | null) ?? []
    for (const l of langs) allLanguages.set(l.language_code, l)
  }
  const languageOptions = Array.from(allLanguages.values())

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <a href="/marketplace" className="font-bold text-gray-900 text-lg">Kixu</a>
          {user ? (
            <a href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
              Go to app →
            </a>
          ) : (
            <a href="/login" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Sign in</a>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Explore communities</h1>
          <p className="text-gray-500 text-sm mt-1">Find and join communities from expert creators</p>
        </div>

        {/* Language filter */}
        {languageOptions.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
            {languageOptions.map((lang) => {
              const isActive = selectedLanguages.includes(lang.language_code)
              const newSelected = isActive
                ? selectedLanguages.filter((l) => l !== lang.language_code)
                : [...selectedLanguages, lang.language_code]
              const href = newSelected.length > 0
                ? `/marketplace?languages=${newSelected.join(',')}`
                : '/marketplace'

              return (
                <a
                  key={lang.language_code}
                  href={href}
                  className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {lang.flag_emoji} {lang.language_code}
                </a>
              )
            })}
          </div>
        )}

        {/* Community grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            No communities match your filter.{' '}
            <a href="/marketplace" className="text-blue-600 hover:underline">Clear filters</a>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((community) => (
              <CommunityCard
                key={community.id}
                community={community}
                memberCount={countMap.get(community.id) ?? 0}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
