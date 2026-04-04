import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import type { Language, Testimonial } from '@/types/database'
import type { Metadata } from 'next'
import JoinButton from './JoinButton'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data: community } = await supabase
    .from('communities')
    .select('name, description')
    .eq('slug', slug)
    .single()

  if (!community) return { title: 'Community not found' }

  return {
    title: `${community.name} — Kixu`,
    description: community.description ?? undefined,
  }
}

export default async function PublicLandingPage({ params }: PageProps) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: community } = await supabase
    .from('communities')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!community) notFound()

  // Fetch creator info separately to avoid RLS join issues on users table
  const { data: creatorRow } = await supabase
    .from('users')
    .select('display_name, avatar_url, username')
    .eq('id', community.created_by)
    .maybeSingle()

  // If logged-in member, redirect to app
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data: membership } = await supabase
      .from('community_members')
      .select('user_id')
      .eq('community_id', community.id)
      .eq('user_id', user.id)
      .maybeSingle()
    if (membership) redirect(`/community/${slug}`)
  }

  const { count: memberCount } = await supabase
    .from('community_members')
    .select('*', { count: 'exact', head: true })
    .eq('community_id', community.id)

  // Upcoming sessions within 60 days
  const in60Days = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString()
  const { data: upcomingSlots } = await supabase
    .from('slots')
    .select('start_time, session_types(title, type)')
    .eq('status', 'available')
    .gt('start_time', new Date().toISOString())
    .lte('start_time', in60Days)
    .in('session_type_id',
      (await supabase.from('session_types').select('id').eq('community_id', community.id)).data?.map(s => s.id) ?? []
    )
    .order('start_time', { ascending: true })
    .limit(5)

  const creator = creatorRow
  const languages = (community.languages as Language[] | null) ?? []
  const testimonials = (community.lp_testimonials as Testimonial[] | null) ?? []
  const whatYouGet = (community.lp_what_youll_get as string[] | null) ?? []
  const achievements = (community.lp_creator_achievements as string[] | null) ?? []
  const priceLabel = community.price_monthly === 0
    ? 'Join for free'
    : `Join for $${(community.price_monthly / 100).toFixed(0)}/month`

  return (
    <div className="min-h-screen bg-white">
      {/* Top nav */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <a href="/marketplace" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
          ← Marketplace
        </a>
        {!user && (
          <a href="/login" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
            Sign in
          </a>
        )}
        {user && (
          <a href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
            Go to app →
          </a>
        )}
      </div>

      {/* Hero */}
      <div className="relative h-56 bg-gradient-to-br from-blue-600 to-blue-400">
        {community.cover_image_url && (
          <img src={community.cover_image_url} alt={community.name} className="w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-black/30" />
        <div className="absolute inset-x-0 bottom-0 p-6 text-white">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-2 mb-2">
              {community.category && (
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{community.category}</span>
              )}
              {languages.map((l) => (
                <span key={l.language_code} className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                  {l.flag_emoji} {l.language_code}
                </span>
              ))}
            </div>
            <h1 className="text-3xl font-bold">{community.name}</h1>
            <div className="flex items-center gap-3 mt-2 text-sm text-white/80">
              {creator && <span>{creator.display_name}</span>}
              <span>·</span>
              <span>{memberCount ?? 0} members</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-10">
        {/* CTA */}
        <JoinButton
          communityId={community.id}
          slug={community.slug}
          priceLabel={priceLabel}
          isFree={community.price_monthly === 0}
        />

        {/* Description */}
        {community.description && (
          <p className="text-gray-700 leading-relaxed">{community.description}</p>
        )}

        {/* What you'll get */}
        {whatYouGet.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">What you&apos;ll get</h2>
            <ul className="space-y-2">
              {whatYouGet.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-gray-700 text-sm">
                  <span className="text-blue-500 mt-0.5">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* About creator */}
        {community.lp_creator_bio && (
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">About the creator</h2>
            <div className="flex items-start gap-4">
              {community.lp_creator_photo_url && (
                <img src={community.lp_creator_photo_url} alt="Creator" className="w-16 h-16 rounded-full object-cover" />
              )}
              <div>
                <p className="font-semibold text-gray-900">{creator?.display_name}</p>
                <p className="text-gray-600 text-sm mt-1">{community.lp_creator_bio}</p>
                {achievements.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {achievements.map((a, i) => (
                      <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{a}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Upcoming sessions */}
        {upcomingSlots && upcomingSlots.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">Upcoming sessions</h2>
            <div className="space-y-2">
              {upcomingSlots.map((slot, i) => {
                const st = Array.isArray(slot.session_types) ? slot.session_types[0] : slot.session_types
                return (
                  <div key={i} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg text-sm">
                    <span className="text-2xl">📅</span>
                    <div>
                      <p className="font-medium text-gray-800">{st?.title}</p>
                      <p className="text-gray-400 text-xs">
                        {st?.type === 'group' ? 'Group Session' : '1:1 Session'} ·{' '}
                        {new Date(slot.start_time).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Testimonials */}
        {testimonials.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">What members say</h2>
            <div className="space-y-4">
              {testimonials.map((t, i) => (
                <blockquote key={i} className="border-l-4 border-blue-200 pl-4">
                  <p className="text-gray-700 text-sm italic">&ldquo;{t.quote}&rdquo;</p>
                  <footer className="mt-1 text-xs text-gray-500">
                    — {t.name}{t.role && `, ${t.role}`}
                  </footer>
                </blockquote>
              ))}
            </div>
          </section>
        )}

        {/* CTA footer */}
        <div className="border-t border-gray-200 pt-8">
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-3">{memberCount ?? 0} members already inside</p>
            <JoinButton
              communityId={community.id}
              slug={community.slug}
              priceLabel={priceLabel}
              isFree={community.price_monthly === 0}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
