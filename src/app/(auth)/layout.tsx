import Link from 'next/link'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="px-6 py-4">
        <Link href="/marketplace" className="font-bold text-gray-900 text-base hover:text-gray-700 transition-colors">
          Kixu
        </Link>
      </header>
      <div className="flex-1 flex items-center justify-center px-4 pb-12">
        {children}
      </div>
    </div>
  )
}
