'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Bell, X, CheckCircle2, Volume2, VolumeX } from 'lucide-react'
import { useWaiterCalls, type WaiterCall } from '../use-waiter-calls'

// Floating widget shown on cashier screen - listens for waiter calls
export function WaiterCallsWidget() {
  const { pendingCalls, connected, serveCall } = useWaiterCalls()
  const [open, setOpen] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)

  // Debug log to verify the widget mounts and connection state
  useEffect(() => {
    console.log('[WaiterCallsWidget] mounted, connected:', connected, 'calls:', pendingCalls.length)
  }, [connected, pendingCalls.length])

  if (!connected || pendingCalls.length === 0) {
    // Show a small badge only when there are calls
    return null
  }

  return (
    <>
      {/* Floating notification badge */}
      <button
        onClick={() => setOpen(true)}
        className="fixed top-16 left-4 z-50 bg-red-500 text-white rounded-full shadow-2xl flex items-center justify-center w-14 h-14 hover:scale-105 transition animate-pulse"
        aria-label="استدعاءات الويتر"
      >
        <Bell className="w-6 h-6" />
        <span className="absolute -top-1 -right-1 bg-white text-red-600 rounded-full min-w-6 h-6 px-1.5 flex items-center justify-center text-xs font-black num border-2 border-red-500">
          {pendingCalls.length}
        </span>
      </button>

      {/* Calls panel */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-end p-4 pt-20" onClick={() => setOpen(false)}>
          <div
            className="bg-white rounded-2xl shadow-2xl border-2 border-red-200 max-w-sm w-full overflow-hidden animate-fade-in-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-red-500 text-white p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                <div>
                  <h3 className="font-bold text-sm">استدعاءات الويتر</h3>
                  <p className="text-xs text-white/80 num">{pendingCalls.length} طلب في الانتظار</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setSoundEnabled((s) => !s)}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition"
                  title={soundEnabled ? 'كتم الصوت' : 'تفعيل الصوت'}
                >
                  {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>
                <button onClick={() => setOpen(false)} className="p-1.5 hover:bg-white/20 rounded-lg transition">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Calls list */}
            <div className="max-h-96 overflow-y-auto divide-y divide-border/60">
              {pendingCalls.map((call) => (
                <CallCard key={call.id} call={call} onServe={() => serveCall(call.id)} />
              ))}
            </div>

            {/* Footer */}
            <div className="p-2 bg-muted/30 text-center text-xs text-muted-foreground">
              اضغط "تم الخدمة" لما الويتر يروح للترابيزة
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function CallCard({ call, onServe }: { call: WaiterCall; onServe: () => void }) {
  const ago = Math.floor((Date.now() - call.timestamp) / 1000)
  const agoLabel = ago < 60 ? `منذ ${ago} ثانية` : ago < 3600 ? `منذ ${Math.floor(ago / 60)} دقيقة` : `منذ ${Math.floor(ago / 3600)} ساعة`

  return (
    <div className="p-3 hover:bg-muted/30">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
          <Bell className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-bold text-sm">{call.tableName}</h4>
            <Badge variant="outline" className="text-[10px] num">#{call.tableNumber}</Badge>
            <span className="text-[10px] text-muted-foreground num">{agoLabel}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{call.message}</p>
          <Button
            size="sm"
            onClick={onServe}
            className="mt-2 h-7 text-xs bg-green-600 hover:bg-green-700 text-white border-0 w-full"
          >
            <CheckCircle2 className="w-3.5 h-3.5 ml-1" /> تم الخدمة - الويتر في الطريق
          </Button>
        </div>
      </div>
    </div>
  )
}
