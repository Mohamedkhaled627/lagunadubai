'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { api } from '../use-auth'
import { fmtMoney, fmtDateTime } from '@/lib/format'
import { Undo2 } from 'lucide-react'

export function AdminReturns() {
  const [returns, setReturns] = useState<any[]>([])
  const [total, setTotal] = useState(0)

  useEffect(() => {
    api<{ returns: any[] }>('/api/returns?limit=500').then((d) => {
      setReturns(d.returns)
      setTotal(d.returns.reduce((s, r) => s + r.totalRefund, 0))
    })
  }, [])

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-ocean flex items-center gap-2">
            <Undo2 className="w-6 h-6" /> المرتجعات
          </h1>
          <p className="text-sm text-muted-foreground">كل عمليات الإرجاع المسجلة</p>
        </div>
        <div className="text-left">
          <div className="text-xs text-muted-foreground">إجمالي المرتجعات</div>
          <div className="text-xl font-bold text-destructive num">- {fmtMoney(total)}</div>
        </div>
      </div>

      <Card>
        <ScrollArea className="max-h-[75vh]">
          <div className="divide-y divide-border/60">
            {returns.length === 0 && <p className="text-center text-muted-foreground py-8">لا توجد مرتجعات</p>}
            {returns.map((r) => (
              <div key={r.id} className="p-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="font-bold text-ocean num">#{r.order.invoiceNumber}</div>
                  <div className="text-sm">
                    <div>{fmtDateTime(r.createdAt)}</div>
                    <div className="text-xs text-muted-foreground">بواسطة: {r.returnedBy?.name}</div>
                  </div>
                  <div className="text-sm min-w-0">
                    <div className="text-xs text-muted-foreground">الترابيزة</div>
                    <div>{r.order.table?.name || 'تيك أواي'}</div>
                  </div>
                  <div className="font-bold text-destructive num mr-auto">- {fmtMoney(r.totalRefund)}</div>
                </div>
                <div className="mt-2 text-sm">
                  <span className="text-muted-foreground">السبب: </span>
                  <span>{r.reason}</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {r.items.map((it: any) => (
                    <Badge key={it.id} variant="secondary" className="text-xs">
                      {it.name} ×{it.quantity}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </Card>
    </div>
  )
}
