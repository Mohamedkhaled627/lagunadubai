'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'
import { api } from '../use-auth'
import { fmtMoney, fmtDateTime } from '@/lib/format'
import { InvoicePrint } from '../shared/invoice-print'
import { Search, Eye, Printer, Download, Filter } from 'lucide-react'

export function InvoicesView() {
  const { toast } = useToast()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('ALL')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [cashierId, setCashierId] = useState('ALL')
  const [selected, setSelected] = useState<any | null>(null)
  const [total, setTotal] = useState(0)

  const load = () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (status !== 'ALL') params.set('status', status)
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    api<{ orders: any[] }>(`/api/orders?${params.toString()}&limit=500`)
      .then((d) => {
        setOrders(d.orders)
        setTotal(d.orders.filter((o) => o.status === 'PAID').reduce((s, o) => s + o.total, 0))
      })
      .finally(() => setLoading(false))
  }
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [status, from, to])

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-ocean">الفواتير</h1>
          <p className="text-sm text-muted-foreground">استعراض كل الفواتير وتصفيتها</p>
        </div>
        <div className="text-left">
          <div className="text-xs text-muted-foreground">إجمالي المبيعات (المدفوعة)</div>
          <div className="text-xl font-bold text-ocean num">{fmtMoney(total)}</div>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3 flex flex-wrap gap-2 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">الحالة</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">الكل</SelectItem>
                <SelectItem value="PAID">مدفوعة</SelectItem>
                <SelectItem value="CANCELLED">ملغية</SelectItem>
                <SelectItem value="PENDING">معلقة</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">من تاريخ</label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40 h-9" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">إلى تاريخ</label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40 h-9" />
          </div>
          <Button variant="outline" size="sm" className="h-9" onClick={load}>
            <Filter className="w-4 h-4 ml-1" /> تطبيق
          </Button>
        </CardContent>
      </Card>

      <Card>
        <ScrollArea className="max-h-[70vh]">
          <div className="divide-y divide-border/60">
            {loading && <p className="text-center text-muted-foreground py-8">جاري التحميل...</p>}
            {!loading && orders.length === 0 && <p className="text-center text-muted-foreground py-8">لا توجد فواتير</p>}
            {orders.map((o) => (
              <div key={o.id} className="p-3 flex flex-wrap items-center gap-3 hover:bg-muted/40 transition">
                <div className="font-bold text-ocean num min-w-0">#{o.invoiceNumber}</div>
                <div className="text-sm min-w-0">
                  <div>{fmtDateTime(o.createdAt)}</div>
                  <div className="text-xs text-muted-foreground">{o.cashier.name} · {o.table?.name || 'تيك أواي'}</div>
                </div>
                <div className="text-sm min-w-0 hidden sm:block">
                  <div>{o.items.length} صنف</div>
                  <div className="text-xs text-muted-foreground">
                    {o.paymentMethod === 'CASH' ? 'كاش' : o.paymentMethod === 'VISA' ? 'فيزا' : o.paymentMethod}
                    {o.returns?.length > 0 && ' · به مرتجع'}
                  </div>
                </div>
                <div className="font-bold num mr-auto">{fmtMoney(o.total)}</div>
                <Badge
                  variant={o.status === 'PAID' ? 'default' : o.status === 'CANCELLED' ? 'destructive' : 'secondary'}
                  className={o.status === 'PAID' ? 'bg-green-600' : ''}
                >
                  {o.status === 'PAID' ? 'مدفوعة' : o.status === 'CANCELLED' ? 'ملغية' : 'معلقة'}
                </Badge>
                <Button size="sm" variant="outline" onClick={() => setSelected(o)}>
                  <Eye className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </Card>

      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
          {selected && (
            <>
              <div className="print-area">
                <InvoicePrint order={selected} cafeName="لاجونا كافيه" cafeAddress="الكورنيش - على البحر مباشرة" cafePhone="01000000000" />
              </div>
              <div className="no-print p-3 flex gap-2 border-t border-border bg-muted/30">
                <Button onClick={() => window.print()} className="flex-1 laguna-gradient text-white border-0">
                  <Printer className="w-4 h-4 ml-2" /> طباعة
                </Button>
                <Button variant="outline" onClick={() => setSelected(null)} className="flex-1">
                  إغلاق
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
