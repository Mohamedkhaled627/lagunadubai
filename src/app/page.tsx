'use client'

import { Suspense, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/components/laguna/use-auth'
import { LoginView } from '@/components/laguna/login-view'
import { CashierView } from '@/components/laguna/cashier/cashier-view'
import { AdminView } from '@/components/laguna/admin/admin-view'
import { CustomerMenuView } from '@/components/laguna/customer-menu-view'
import { Logo } from '@/components/laguna/shared/logo'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

export default function Home() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <HomeInner />
    </Suspense>
  )
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-lagoon/10 to-sand/20">
      <Logo size={96} />
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>جاري التحميل...</span>
      </div>
    </div>
  )
}

function HomeInner() {
  const { user, loading, logout } = useAuth()
  const params = useSearchParams()
  const router = useRouter()
  const view = params.get('view') || 'home'
  const tableToken = params.get('table')

  // ALL hooks MUST be called before any conditional return.
  // Sync URL when user role/view changes (but never override customer menu view)
  useEffect(() => {
    if (loading || !user) return
    // Don't redirect if customer is viewing menu (no auth required)
    if (view === 'menu' && tableToken) return
    const correctView = user.role === 'ADMIN' ? 'admin' : 'cashier'
    if (view !== correctView) {
      router.replace(`/?view=${correctView}`)
    }
  }, [user, view, loading, tableToken, router])

  // Customer menu view (no auth required) - takes priority
  if (view === 'menu' && tableToken) {
    return <CustomerMenuView token={tableToken} />
  }

  // While auth state is being determined, show loading
  if (loading) {
    return <LoadingScreen />
  }

  // Not logged in -> show login
  if (!user) {
    return <LoginView />
  }

  const handleLogout = async () => {
    await logout()
    router.replace('/')
    router.refresh()
  }

  const TopBar = (
    <div className="no-print sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-ocean/10">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo size={36} withText />
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-right hidden sm:block">
            <div className="font-semibold text-foreground">{user.name}</div>
            <div className="text-xs text-muted-foreground">
              {user.role === 'ADMIN' ? 'مدير النظام' : 'كاشير'} · {user.username}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            خروج
          </Button>
        </div>
      </div>
    </div>
  )

  if (user.role === 'ADMIN') {
    return (
      <div className="min-h-screen flex flex-col">
        {TopBar}
        <AdminView user={user} />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      {TopBar}
      <CashierView user={user} />
    </div>
  )
}
