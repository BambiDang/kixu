import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/sidebar/Sidebar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Check if onboarding is complete
  const { data: profile } = await supabase
    .from('users')
    .select('display_name, username')
    .eq('id', user.id)
    .single()

  if (!profile?.display_name || !profile?.username) {
    redirect('/onboarding')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar userId={user.id} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
