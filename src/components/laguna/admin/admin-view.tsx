'use client'

import { useState, useEffect } from 'react'
import { LayoutDashboard, Coffee, Receipt, Undo2, Users, CalendarClock, Wallet, Settings, QrCode, Table2, Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AdminDashboard } from './dashboard'
import { MenuManager } from './menu-manager'
import { InvoicesView } from './invoices'
import { AdminReturns } from './returns'
import { EmployeesManager } from './employees'
import { AttendanceView } from './attendance'
import { PaymentsView } from './payments'
import { SettingsView } from './settings'
import { QRCodesView } from './qr-codes'
import { TablesManager } from './tables-manager'

type Section = 'dashboard' | 'menu' | 'tables' | 'invoices' | 'returns' | 'employees' | 'attendance' | 'payments' | 'qr' | 'settings'

const SECTIONS: { key: Section; label: string; icon: any }[] = [
  { key: 'dashboard', label: 'الرئيسية', icon: LayoutDashboard },
  { key: 'menu', label: 'المنيو والأسعار', icon: Coffee },
  { key: 'tables', label: 'الترابيزات', icon: Table2 },
  { key: 'invoices', label: 'الفواتير', icon: Receipt },
  { key: 'returns', label: 'المرتجعات', icon: Undo2 },
  { key: 'employees', label: 'الموظفين', icon: Users },
  { key: 'attendance', label: 'الحضور', icon: CalendarClock },
  { key: 'payments', label: 'القبض والمرتبات', icon: Wallet },
  { key: 'qr', label: 'أكواد QR', icon: QrCode },
  { key: 'settings', label: 'الإعدادات', icon: Settings },
]

export function AdminView({ user }: { user: any }) {
  const [section, setSection] = useState<Section>('dashboard')
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handleSectionChange = (s: Section) => {
    setSection(s)
    if (isMobile) setMobileSidebarOpen(false)
  }

  return (
    <div className="flex-1 flex relative">
      {/* Mobile sidebar toggle button */}
      {isMobile && (
        <button
          onClick={() => setMobileSidebarOpen(true)}
          className="fixed top-14 right-2 z-30 bg-ocean text-white p-2 rounded-lg shadow-lg md:hidden"
          aria-label="فتح القائمة"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}

      {/* Mobile overlay */}
      {isMobile && mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'no-print shrink-0 sticky top-14 h-[calc(100vh-56px)] overflow-y-auto z-50',
          // Desktop: always visible
          'md:w-60 md:translate-x-0 md:static',
          // Mobile: slide in/out
          isMobile
            ? mobileSidebarOpen
              ? 'w-60 translate-x-0 fixed right-0 top-14'
              : 'w-60 translate-x-full fixed right-0 top-14'
            : 'w-52'
        )}
        style={{
          background: 'linear-gradient(180deg, oklch(0.28 0.05 220) 0%, oklch(0.22 0.04 220) 100%)',
          color: 'oklch(0.97 0.01 200)',
          borderLeft: '1px solid oklch(0.35 0.04 220)',
          transition: 'transform 0.3s ease-in-out',
        }}
      >
        {/* Close button on mobile */}
        {isMobile && (
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="absolute top-2 left-2 p-1.5 rounded-lg hover:bg-white/10 text-white"
            aria-label="إغلاق القائمة"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        <nav className="p-2 space-y-1">
          {SECTIONS.map((s) => {
            const Icon = s.icon
            const active = section === s.key
            return (
              <button
                key={s.key}
                onClick={() => handleSectionChange(s.key)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition text-right',
                  active
                    ? 'shadow-md'
                    : 'hover:bg-white/10'
                )}
                style={
                  active
                    ? { background: 'oklch(0.65 0.13 200)', color: 'oklch(0.16 0.02 220)' }
                    : { color: 'oklch(0.85 0.02 200)' }
                }
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span>{s.label}</span>
              </button>
            )
          })}
        </nav>
      </aside>

      {/* Content */}
      <main className="flex-1 min-w-0 bg-muted/10">
        {section === 'dashboard' && <AdminDashboard user={user} />}
        {section === 'menu' && <MenuManager />}
        {section === 'tables' && <TablesManager />}
        {section === 'invoices' && <InvoicesView />}
        {section === 'returns' && <AdminReturns />}
        {section === 'employees' && <EmployeesManager />}
        {section === 'attendance' && <AttendanceView />}
        {section === 'payments' && <PaymentsView />}
        {section === 'qr' && <QRCodesView />}
        {section === 'settings' && <SettingsView />}
      </main>
    </div>
  )
}
