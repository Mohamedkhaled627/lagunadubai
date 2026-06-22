'use client'

import { useEffect, useState, useMemo } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { api } from '../use-auth'
import { fmtMoney, fmtDateTime, fmtTime } from '@/lib/format'
import { InvoicePrint } from '../shared/invoice-print'
import { WaiterCallsWidget } from './waiter-calls-widget'
import { TablesManager as CashierTablesManager } from '../admin/tables-manager'
import {
  Coffee, Plus, Minus, Trash2, ShoppingCart, Printer, X, Search,
  Table2, Receipt, Undo2, Clock, CheckCircle2, XCircle, Eye, ArrowLeft, BookOpen, Lock, Users, Pencil, Power, LogIn, LogOut, CalendarClock, UserCheck,
} from 'lucide-react'
import Image from 'next/image'

export interface MenuItem {
  id: string
  name: string
  price: number
  imageUrl: string | null
  available: boolean
}
export interface Category {
  id: string
  nameAr: string
  icon: string
  coverUrl: string | null
  items: MenuItem[]
}
export interface TableInfo {
  id: string
  name: string
  number: number
  qrToken: string
  seats: number
  hasOpenOrder: boolean
}
export interface CartItem {
  menuItem: MenuItem
  quantity: number
}
export interface Order {
  id: string
  invoiceNumber: number
  status: string
  paymentMethod: string | null
  subtotal: number
  taxRate: number
  taxAmount: number
  discountRate: number
  discountAmount: number
  total: number
  notes: string | null
  createdAt: string
  paidAt: string | null
  cancelledAt: string | null
  cancelReason: string | null
  table: { name: string; number: number } | null
  cashier: { name: string; username: string }
  items: { id: string; name: string; price: number; quantity: number; total: number }[]
  returns?: { id: string; totalRefund: number; items: any[] }[]
}

export function CashierView({ user }: { user: any }) {
  // Shared cart state so the MenuBrowser tab can add items that show up in POS
  const [cart, setCart] = useState<CartItem[]>([])

  const addToCart = (item: MenuItem) => {
    setCart((c) => {
      const ex = c.find((i) => i.menuItem.id === item.id)
      if (ex) return c.map((i) => (i.menuItem.id === item.id ? { ...i, quantity: i.quantity + 1 } : i))
      return [...c, { menuItem: item, quantity: 1 }]
    })
  }
  const clearCart = () => setCart([])

  return (
    <div className="flex-1 bg-muted/20">
      {/* Floating waiter calls notifications */}
      <WaiterCallsWidget />
      <Tabs defaultValue="menu" className="w-full">
        <div className="no-print bg-white border-b border-ocean/10 sticky top-0 z-20">
          <div className="max-w-7xl mx-auto px-2">
            <TabsList className="grid grid-cols-6 w-full h-12 bg-muted/40 gap-0.5">
              <TabsTrigger value="menu" className="gap-1 px-1 sm:px-2">
                <BookOpen className="w-4 h-4 shrink-0" />
                <span className="hidden md:inline text-xs">المنيو</span>
              </TabsTrigger>
              <TabsTrigger value="tables" className="gap-1 px-1 sm:px-2">
                <Table2 className="w-4 h-4 shrink-0" />
                <span className="hidden md:inline text-xs">ترابيزات</span>
              </TabsTrigger>
              <TabsTrigger value="orders" className="gap-1 px-1 sm:px-2">
                <Receipt className="w-4 h-4 shrink-0" />
                <span className="hidden md:inline text-xs">فواتيري</span>
              </TabsTrigger>
              <TabsTrigger value="returns" className="gap-1 px-1 sm:px-2">
                <Undo2 className="w-4 h-4 shrink-0" />
                <span className="hidden md:inline text-xs">مرتجع</span>
              </TabsTrigger>
              <TabsTrigger value="employees" className="gap-1 px-1 sm:px-2">
                <Users className="w-4 h-4 shrink-0" />
                <span className="hidden md:inline text-xs">موظفين</span>
              </TabsTrigger>
              <TabsTrigger value="attendance" className="gap-1 px-1 sm:px-2">
                <Clock className="w-4 h-4 shrink-0" />
                <span className="hidden md:inline text-xs">حضوري</span>
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        <TabsContent value="menu" className="mt-0">
          <MenuBrowser cart={cart} setCart={setCart} addToCart={addToCart} user={user} />
        </TabsContent>
        <TabsContent value="tables" className="mt-0">
          <CashierTablesManager />
        </TabsContent>
        <TabsContent value="orders" className="mt-0">
          <OrdersHistory />
        </TabsContent>
        <TabsContent value="returns" className="mt-0">
          <ReturnsView />
        </TabsContent>
        <TabsContent value="employees" className="mt-0">
          <CashierEmployees user={user} />
        </TabsContent>
        <TabsContent value="attendance" className="mt-0">
          <CashierAttendance user={user} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function OrdersHistory() {
  const { toast } = useToast()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'ALL' | 'PAID' | 'CANCELLED'>('ALL')
  const [selected, setSelected] = useState<Order | null>(null)

  const load = () => {
    setLoading(true)
    api<{ orders: Order[] }>(`/api/orders?limit=100${filter !== 'ALL' ? `&status=${filter}` : ''}`)
      .then((d) => setOrders(d.orders))
      .finally(() => setLoading(false))
  }
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [filter])

  const cancel = async (id: string) => {
    if (!confirm('تأكيد إلغاء الفاتورة؟')) return
    try {
      await api(`/api/orders/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'CANCELLED', cancelReason: 'إلغاء من الكاشير' }) })
      toast({ title: 'تم إلغاء الفاتورة' })
      load()
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'خطأ', description: e.message })
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-3">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Receipt className="w-5 h-5 text-ocean" />
          فواتيري السابقة
        </h2>
        <div className="flex gap-1 bg-muted/40 rounded-lg p-1">
          {(['ALL', 'PAID', 'CANCELLED'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                filter === f ? 'bg-white shadow text-ocean' : 'text-muted-foreground'
              }`}
            >
              {f === 'ALL' ? 'الكل' : f === 'PAID' ? 'مدفوعة' : 'ملغية'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-2">
        {loading && <p className="text-center text-muted-foreground py-8">جاري التحميل...</p>}
        {!loading && orders.length === 0 && (
          <Card><CardContent className="py-12 text-center text-muted-foreground">لا توجد فواتير</CardContent></Card>
        )}
        {orders.map((o) => (
          <Card key={o.id} className="overflow-hidden">
            <div className="flex items-stretch">
              <div className={`w-1.5 ${o.status === 'PAID' ? 'bg-green-500' : o.status === 'CANCELLED' ? 'bg-red-500' : 'bg-amber-500'}`} />
              <CardContent className="flex-1 flex flex-wrap items-center gap-4 p-3">
                <div className="min-w-0">
                  <div className="font-bold text-ocean num">#{o.invoiceNumber}</div>
                  <div className="text-xs text-muted-foreground">{fmtDateTime(o.createdAt)}</div>
                </div>
                <div className="min-w-0">
                  <div className="text-sm">
                    {o.table ? <span className="inline-flex items-center gap-1"><Table2 className="w-3 h-3" />{o.table.name}</span> : <span className="text-muted-foreground">بدون ترابيزة</span>}
                  </div>
                  <div className="text-xs text-muted-foreground">{o.items.length} أصناف · {o.paymentMethod === 'CASH' ? 'كاش' : o.paymentMethod === 'VISA' ? 'فيزا' : o.paymentMethod || '-'}</div>
                </div>
                <div className="font-bold text-lg num text-foreground mr-auto">{fmtMoney(o.total)}</div>
                <Badge variant={o.status === 'PAID' ? 'default' : o.status === 'CANCELLED' ? 'destructive' : 'secondary'}
                  className={o.status === 'PAID' ? 'bg-green-600' : ''}>
                  {o.status === 'PAID' ? <CheckCircle2 className="w-3 h-3 ml-1" /> : o.status === 'CANCELLED' ? <XCircle className="w-3 h-3 ml-1" /> : <Clock className="w-3 h-3 ml-1" />}
                  {o.status === 'PAID' ? 'مدفوعة' : o.status === 'CANCELLED' ? 'ملغية' : 'معلقة'}
                </Badge>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => setSelected(o)}>
                    <Eye className="w-3.5 h-3.5" />
                  </Button>
                  {o.status === 'PAID' && (
                    <Button size="sm" variant="outline" className="text-destructive" onClick={() => cancel(o.id)}>
                      <XCircle className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </div>
          </Card>
        ))}
      </div>

      {/* Invoice view dialog */}
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

// ============= Returns =============
function ReturnsView() {
  const { toast } = useToast()
  const [orders, setOrders] = useState<Order[]>([])
  const [returns, setReturns] = useState<any[]>([])
  const [selected, setSelected] = useState<Order | null>(null)
  const [returnItems, setReturnItems] = useState<Record<string, number>>({})
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = () => {
    api<{ orders: Order[] }>('/api/orders?status=PAID&limit=50').then((d) => setOrders(d.orders))
    api<{ returns: any[] }>('/api/returns?limit=50').then((d) => setReturns(d.returns))
  }
  useEffect(() => { load() }, [])

  const startReturn = (o: Order) => {
    setSelected(o)
    setReturnItems({})
    setReason('')
  }

  const submitReturn = async () => {
    if (!selected) return
    const items = Object.entries(returnItems)
      .filter(([_, q]) => q > 0)
      .map(([orderItemId, quantity]) => ({ orderItemId, quantity }))
    if (items.length === 0) {
      toast({ variant: 'destructive', title: 'حدد كمية المرتجع' })
      return
    }
    setSubmitting(true)
    try {
      await api('/api/returns', {
        method: 'POST',
        body: JSON.stringify({ orderId: selected.id, reason, items }),
      })
      toast({ title: 'تم تسجيل المرتجع' })
      setSelected(null)
      load()
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'خطأ', description: e.message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-3 grid lg:grid-cols-2 gap-3">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2 mb-3">
          <Undo2 className="w-5 h-5 text-ocean" />
          فواتير للإرجاع
        </h2>
        <div className="space-y-2 max-h-[80vh] overflow-y-auto pl-1">
          {orders.length === 0 && <p className="text-center text-muted-foreground py-8">لا توجد فواتير مدفوعة</p>}
          {orders.map((o) => {
            const alreadyReturned = o.returns && o.returns.length > 0
            return (
              <Card key={o.id}>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-ocean num">#{o.invoiceNumber}</div>
                    <div className="text-xs text-muted-foreground">{fmtDateTime(o.createdAt)} · {o.items.length} أصناف</div>
                    {alreadyReturned && <Badge variant="secondary" className="mt-1 text-xs">به مرتجع</Badge>}
                  </div>
                  <div className="font-bold num">{fmtMoney(o.total)}</div>
                  <Button size="sm" variant="outline" onClick={() => startReturn(o)}>
                    <Undo2 className="w-3.5 h-3.5 ml-1" /> إرجاع
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold flex items-center gap-2 mb-3">
          <Receipt className="w-5 h-5 text-ocean" />
          آخر المرتجعات
        </h2>
        <div className="space-y-2 max-h-[80vh] overflow-y-auto pl-1">
          {returns.length === 0 && <p className="text-center text-muted-foreground py-8">لا توجد مرتجعات</p>}
          {returns.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="font-bold text-ocean num">#{r.order.invoiceNumber}</div>
                  <div className="font-bold text-destructive num">- {fmtMoney(r.totalRefund)}</div>
                </div>
                <div className="text-xs text-muted-foreground">{fmtDateTime(r.createdAt)} · {r.returnedBy?.name}</div>
                <div className="text-sm mt-1">السبب: {r.reason}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {r.items.map((i: any) => `${i.name} ×${i.quantity}`).join('، ')}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Return dialog */}
      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Undo2 className="w-5 h-5 text-destructive" />
              تسجيل مرتجع - فاتورة #{selected?.invoiceNumber}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3">
              <div className="space-y-2">
                {selected.items.map((it) => {
                  const returnedQty = selected.returns?.flatMap((r) => r.items).filter((ri) => ri.orderItemId === it.id).reduce((s, ri) => s + ri.quantity, 0) || 0
                  const maxQty = it.quantity - returnedQty
                  if (maxQty <= 0) return null
                  return (
                    <div key={it.id} className="flex items-center gap-2 bg-muted/40 rounded-lg p-2">
                      <div className="flex-1">
                        <div className="font-semibold text-sm">{it.name}</div>
                        <div className="text-xs text-muted-foreground num">
                          {it.price} × {it.quantity} = {fmtMoney(it.total)}
                          {returnedQty > 0 && <span className="text-destructive"> (مرتجع {returnedQty})</span>}
                        </div>
                      </div>
                      <Input
                        type="number"
                        min="0"
                        max={maxQty}
                        placeholder="0"
                        value={returnItems[it.id] || ''}
                        onChange={(e) => setReturnItems((s) => ({ ...s, [it.id]: Math.min(maxQty, Math.max(0, Number(e.target.value))) }))}
                        className="w-16 h-9 num text-center"
                      />
                    </div>
                  )
                })}
              </div>
              <div>
                <Label>سبب الإرجاع</Label>
                <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="مثال: صنف تالف، طلب خاطئ..." />
              </div>
              <div className="bg-muted/40 rounded-lg p-3 text-sm">
                <div className="flex justify-between font-bold">
                  <span>إجمالي المرتجع</span>
                  <span className="num text-destructive">
                    - {fmtMoney(
                      Object.entries(returnItems)
                        .filter(([_, q]) => q > 0)
                        .reduce((s, [id, q]) => {
                          const it = selected.items.find((i) => i.id === id)
                          return s + (it ? it.price * q : 0)
                        }, 0)
                    )}
                  </span>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSelected(null)}>إلغاء</Button>
                <Button onClick={submitReturn} disabled={submitting} className="bg-destructive text-white hover:bg-destructive/90">
                  {submitting ? 'جاري...' : 'تأكيد المرتجع'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============= Menu Browser (search → add → confirm + print) =============
interface MenuBrowserProps {
  cart: CartItem[]
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>
  addToCart: (item: MenuItem) => void
  user: any
}
function MenuBrowser({ cart, setCart, addToCart, user }: MenuBrowserProps) {
  const { toast } = useToast()
  const [categories, setCategories] = useState<Category[]>([])
  const [search, setSearch] = useState('')
  const [activeCat, setActiveCat] = useState<string>('')
  const [loaded, setLoaded] = useState(false)

  // Checkout state
  const [showCheckout, setShowCheckout] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [tableId, setTableId] = useState<string>('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [lastInvoice, setLastInvoice] = useState<Order | null>(null)
  const [showInvoice, setShowInvoice] = useState(false)

  const [tables, setTables] = useState<TableInfo[]>([])

  useEffect(() => {
    api<{ categories: Category[] }>('/api/menu').then((d) => {
      setCategories(d.categories)
      if (d.categories.length) setActiveCat(d.categories[0].id)
      setLoaded(true)
    })
    api<{ tables: TableInfo[] }>('/api/tables').then((d) => setTables(d.tables))
  }, [])

  const handleAdd = (item: MenuItem) => {
    addToCart(item)
    toast({ title: 'تمت الإضافة للفاتورة', description: `${item.name} · ${fmtMoney(item.price)}` })
  }

  const decFromCart = (id: string) =>
    setCart((c) => c.flatMap((i) => {
      if (i.menuItem.id !== id) return [i]
      if (i.quantity <= 1) return []
      return [{ ...i, quantity: i.quantity - 1 }]
    }))
  const removeFromCart = (id: string) => setCart((c) => c.filter((i) => i.menuItem.id !== id))
  const clearCartLocal = () => setCart([])

  const cartCount = (id: string) => cart.find((c) => c.menuItem.id === id)?.quantity || 0
  const cartTotal = cart.reduce((s, c) => s + c.menuItem.price * c.quantity, 0)

  const filtered = search
    ? categories.flatMap((c) => c.items).filter((i) => i.name.includes(search.trim()))
    : (categories.find((c) => c.id === activeCat)?.items || [])

  // Submit invoice (sends to admin too)
  const submitInvoice = async () => {
    if (cart.length === 0) {
      toast({ variant: 'destructive', title: 'الفاتورة فارغة' })
      return
    }
    setSubmitting(true)
    try {
      const d = await api<{ order: Order }>('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          tableId: tableId || null,
          items: cart.map((c) => ({ menuItemId: c.menuItem.id, name: c.menuItem.name, price: c.menuItem.price, quantity: c.quantity })),
          paymentMethod,
          status: 'PAID',
          taxRate: 0,
          discountRate: 0,
          notes,
        }),
      })
      setLastInvoice(d.order)
      setShowInvoice(true)
      setShowCheckout(false)
      clearCartLocal()
      setNotes('')
      setTableId('')
      toast({ title: 'تم تسجيل الفاتورة', description: `فاتورة #${d.order.invoiceNumber} - هيظهر عند المدير` })
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'خطأ', description: e.message })
    } finally {
      setSubmitting(false)
    }
  }

  if (!loaded) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <Coffee className="w-10 h-10 mx-auto mb-2 animate-pulse opacity-30" />
        جاري تحميل المنيو...
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto p-3 pb-32 space-y-3">
      {/* Header */}
      <Card className="laguna-gradient text-white border-0">
        <CardContent className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 backdrop-blur rounded-full p-2">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold">المنيو</h1>
                <p className="text-xs text-white/80">
                  ابحث عن الصنف، اضغط عليه، وفي الآخر اضغط "تأكيد الفاتورة"
                </p>
              </div>
            </div>
            {cart.length > 0 && (
              <div className="bg-white/15 backdrop-blur rounded-xl px-3 py-2 text-center">
                <div className="text-xs text-white/80">السلة</div>
                <div className="font-bold num text-lg">{cart.length} × {fmtMoney(cartTotal)}</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative sticky top-0 z-10">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="ابحث عن صنف... (مثال: قهوة، لاتيه، موهيتو)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-12 pr-10 bg-white shadow-sm text-base"
          autoFocus
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Search results - simple list with add buttons */}
      {search ? (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground px-1">
            نتائج البحث عن "<strong>{search}</strong>" - {filtered.length} صنف
          </p>
          {filtered.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              <Search className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>لا توجد أصناف مطابقة لبحثك</p>
              <p className="text-xs mt-1">جرّب كلمات أخرى مثل: قهوة، شاي، عصير</p>
            </CardContent></Card>
          ) : (
            filtered.map((item) => {
              const qty = cartCount(item.id)
              return (
                <button
                  key={item.id}
                  onClick={() => handleAdd(item)}
                  className="w-full flex items-center gap-3 bg-white rounded-xl border-2 border-border hover:border-ocean hover:shadow-md transition p-2 text-right group"
                >
                  <div className="w-14 h-14 rounded-lg overflow-hidden bg-muted shrink-0 relative">
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-lagoon/10">
                        <Coffee className="w-6 h-6 text-lagoon/40" />
                      </div>
                    )}
                    {qty > 0 && (
                      <div className="absolute top-0 left-0 bg-green-600 text-white rounded-br-lg px-1.5 text-xs font-bold num">
                        ×{qty}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm">{item.name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1 num">
                      <Lock className="w-2.5 h-2.5" /> سعر ثابت: {fmtMoney(item.price)}
                    </div>
                  </div>
                  <div className="text-ocean font-bold num shrink-0">{item.price} ج.م</div>
                  <div className="bg-ocean text-white rounded-full p-2 group-hover:scale-110 transition shrink-0">
                    <Plus className="w-4 h-4" />
                  </div>
                </button>
              )
            })
          )}
        </div>
      ) : (
        <>
          {/* Category chips */}
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-3 px-3">
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveCat(c.id)}
                className={`shrink-0 flex items-center gap-2 px-4 h-11 rounded-2xl border-2 text-sm font-bold transition ${
                  activeCat === c.id
                    ? 'border-ocean bg-ocean text-white shadow-md'
                    : 'border-border bg-white hover:border-ocean/40'
                }`}
              >
                <span className="text-lg">{c.icon}</span>
                <span>{c.nameAr}</span>
                <span className={`text-xs num ${activeCat === c.id ? 'text-white/80' : 'text-muted-foreground'}`}>
                  ({c.items.length})
                </span>
              </button>
            ))}
          </div>

          {/* Items as simple list (mobile-friendly) */}
          <div className="space-y-2">
            {(categories.find((c) => c.id === activeCat)?.items || []).map((item) => {
              const qty = cartCount(item.id)
              return (
                <button
                  key={item.id}
                  onClick={() => handleAdd(item)}
                  className="w-full flex items-center gap-3 bg-white rounded-xl border-2 border-border hover:border-ocean hover:shadow-md transition p-2 text-right group"
                >
                  <div className="w-14 h-14 rounded-lg overflow-hidden bg-muted shrink-0 relative">
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-lagoon/10">
                        <Coffee className="w-6 h-6 text-lagoon/40" />
                      </div>
                    )}
                    {qty > 0 && (
                      <div className="absolute top-0 left-0 bg-green-600 text-white rounded-br-lg px-1.5 text-xs font-bold num">
                        ×{qty}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm">{item.name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1 num">
                      <Lock className="w-2.5 h-2.5" /> سعر ثابت: {fmtMoney(item.price)}
                    </div>
                  </div>
                  <div className="text-ocean font-bold num shrink-0">{item.price} ج.م</div>
                  <div className="bg-ocean text-white rounded-full p-2 group-hover:scale-110 transition shrink-0">
                    <Plus className="w-4 h-4" />
                  </div>
                </button>
              )
            })}
          </div>
        </>
      )}

      {/* Cart items list (visible when cart has items) */}
      {cart.length > 0 && (
        <Card className="border-ocean/30">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-ocean" />
                أصناف الفاتورة ({cart.length})
              </h3>
              <Button size="sm" variant="ghost" onClick={clearCartLocal} className="text-destructive h-8 text-xs">
                <Trash2 className="w-3.5 h-3.5 ml-1" /> تفريغ
              </Button>
            </div>
            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {cart.map((c) => (
                <div key={c.menuItem.id} className="flex items-center gap-2 bg-muted/40 rounded-lg p-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm line-clamp-1">{c.menuItem.name}</div>
                    <div className="text-xs text-muted-foreground num">
                      {c.menuItem.price} × {c.quantity} = {fmtMoney(c.menuItem.price * c.quantity)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => decFromCart(c.menuItem.id)}>
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="w-6 text-center font-semibold num text-sm">{c.quantity}</span>
                    <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => handleAdd(c.menuItem)}>
                      <Plus className="w-3 h-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeFromCart(c.menuItem.id)}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 pt-2 border-t border-border/60 flex justify-between font-bold">
              <span>الإجمالي</span>
              <span className="num text-ocean">{fmtMoney(cartTotal)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sticky bottom bar with confirm + print */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-30 bg-white border-t-2 border-ocean/20 shadow-2xl">
          <div className="max-w-3xl mx-auto p-3 flex items-center gap-3">
            <div className="flex-1">
              <div className="text-xs text-muted-foreground">{cart.length} صنف · طريقة دفع</div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-ocean num text-lg">{fmtMoney(cartTotal)}</span>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="h-8 w-28 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">💵 كاش</SelectItem>
                    <SelectItem value="VISA">💳 فيزا</SelectItem>
                    <SelectItem value="OTHER">🔁 أخرى</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              onClick={() => setShowCheckout(true)}
              size="lg"
              className="laguna-gradient text-white border-0 h-12 px-6"
            >
              <CheckCircle2 className="w-5 h-5 ml-2" />
              تأكيد الفاتورة
            </Button>
          </div>
        </div>
      )}

      {/* Checkout dialog (table + notes + confirm) */}
      <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-ocean" />
              تأكيد الفاتورة - {fmtMoney(cartTotal)}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>الترابيزة (اختياري)</Label>
              <Select value={tableId} onValueChange={setTableId}>
                <SelectTrigger><SelectValue placeholder="بدون ترابيزة (تيك أواي)" /></SelectTrigger>
                <SelectContent>
                  {tables.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name} · {t.seats} مقاعد</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>ملاحظات</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="ملاحظات على الطلب..." />
            </div>
            <Card className="bg-muted/40">
              <CardContent className="p-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">عدد الأصناف</span>
                  <span className="num font-semibold">{cart.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">طريقة الدفع</span>
                  <span className="font-semibold">{paymentMethod === 'CASH' ? 'كاش' : paymentMethod === 'VISA' ? 'فيزا' : 'أخرى'}</span>
                </div>
                <Separator className="my-1" />
                <div className="flex justify-between font-bold text-base">
                  <span>الإجمالي</span>
                  <span className="num text-ocean">{fmtMoney(cartTotal)}</span>
                </div>
              </CardContent>
            </Card>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-xs text-amber-800">
              ✅ الفاتورة هتتسجل عند المدير فوراً + هتقدر تطبعها
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCheckout(false)}>إلغاء</Button>
            <Button onClick={submitInvoice} disabled={submitting} className="laguna-gradient text-white border-0">
              {submitting ? <Clock className="w-4 h-4 ml-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 ml-2" />}
              {submitting ? 'جاري...' : 'تأكيد وطباعة'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invoice preview + print */}
      <Dialog open={showInvoice} onOpenChange={setShowInvoice}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
          <DialogHeader className="no-print sr-only">
            <DialogTitle>معاينة الفاتورة</DialogTitle>
          </DialogHeader>
          {lastInvoice && (
            <>
              <div className="print-area">
                <InvoicePrint order={lastInvoice} cafeName="لاجونا كافيه" cafeAddress="الكورنيش - على البحر مباشرة" cafePhone="01000000000" />
              </div>
              <div className="no-print p-3 flex gap-2 border-t border-border bg-muted/30">
                <Button onClick={() => window.print()} className="flex-1 laguna-gradient text-white border-0">
                  <Printer className="w-4 h-4 ml-2" /> طباعة
                </Button>
                <Button variant="outline" onClick={() => setShowInvoice(false)} className="flex-1">
                  فاتورة جديدة
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============= Cashier Employees Manager =============
// Cashier can add / edit / delete employees and set salaries.
// Changes appear immediately in the admin Employees view too.
interface CashierEmployee {
  id: string
  name: string
  role: string
  phone: string | null
  salary: number
  active: boolean
  totalPaid?: number
  createdAt?: string
}
function CashierEmployees({ user }: { user: any }) {
  const { toast } = useToast()
  const [emps, setEmps] = useState<CashierEmployee[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ id: '', name: '', role: 'موظف', phone: '', salary: 0, active: true })
  const [deleteTarget, setDeleteTarget] = useState<CashierEmployee | null>(null)

  const load = () => {
    setLoading(true)
    api<{ employees: CashierEmployee[] }>('/api/employees')
      .then((d) => setEmps(d.employees))
      .catch((e) => toast({ variant: 'destructive', title: 'خطأ', description: e.message }))
      .finally(() => setLoading(false))
  }
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [])

  const openNew = () => {
    setForm({ id: '', name: '', role: 'موظف', phone: '', salary: 0, active: true })
    setOpen(true)
  }
  const openEdit = (e: CashierEmployee) => {
    setForm({ id: e.id, name: e.name, role: e.role, phone: e.phone || '', salary: e.salary, active: e.active })
    setOpen(true)
  }

  const save = async () => {
    if (!form.name.trim()) {
      toast({ variant: 'destructive', title: '⚠️ الاسم مطلوب', description: 'من فضلك اكتب اسم الموظف' })
      return
    }
    if (form.name.trim().length < 3) {
      toast({ variant: 'destructive', title: '⚠️ الاسم قصير جداً', description: 'اكتب اسم كامل (3 حروف على الأقل)' })
      return
    }
    setSaving(true)
    try {
      const d = await api<{ employee: CashierEmployee, actor: any }>('/api/employees', {
        method: 'POST',
        body: JSON.stringify(form),
      })
      const actorLabel = d.actor?.role === 'ADMIN' ? 'المدير' : 'كاشير'
      toast({
        title: form.id ? '✅ تم تحديث الموظف' : '✅ تم إضافة الموظف',
        description: `${d.employee.name} - ${d.employee.role}${form.id ? ` | بواسطة: ${actorLabel}` : ''}`,
      })
      setOpen(false)
      load()
    } catch (e: any) {
      toast({ variant: 'destructive', title: '❌ خطأ', description: e.message })
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await api(`/api/employees?id=${deleteTarget.id}&soft=0`, { method: 'DELETE' })
      toast({ title: '✅ تم حذف الموظف', description: `${deleteTarget.name} - تم التحديث عند المدير` })
      setDeleteTarget(null)
      load()
    } catch (e: any) {
      toast({ variant: 'destructive', title: '❌ خطأ', description: e.message })
    }
  }

  const toggleActive = async (e: CashierEmployee) => {
    try {
      await api('/api/employees', {
        method: 'POST',
        body: JSON.stringify({ ...e, active: !e.active }),
      })
      toast({ title: e.active ? 'تم إيقاف الموظف' : 'تم تفعيل الموظف', description: e.name })
      load()
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'خطأ', description: err.message })
    }
  }

  const activeCount = emps.filter((e) => e.active).length
  const totalSalary = emps.filter((e) => e.active).reduce((s, e) => s + e.salary, 0)
  const nameError = open && !form.name.trim()

  return (
    <div className="p-3 max-w-7xl mx-auto space-y-3">
      {/* Header */}
      <Card className="laguna-gradient text-white border-0">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-white/20 backdrop-blur rounded-full p-2 shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold">إدارة الموظفين</h1>
              <p className="text-xs text-white/80">
                {emps.length} موظف · {activeCount} نشط · إجمالي المرتبات: {fmtMoney(totalSalary)}/شهر
              </p>
            </div>
          </div>
          <Button onClick={openNew} className="bg-white text-ocean hover:bg-white/90 font-bold w-full h-11 text-base">
            <Plus className="w-5 h-5 ml-2" /> إضافة موظف جديد
          </Button>
        </CardContent>
      </Card>

      {/* Info banner */}
      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="p-3 text-xs text-amber-800 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            أي تغيير هنا (إضافة/تعديل/حذف/مرتب) <strong>هيظهر فوراً عند المدير</strong> في تبويب "الموظفين".
            المدير وحده يقدر يصرف الدفعات. الحضور بتسجله من تبويب "حضوري".
          </span>
        </CardContent>
      </Card>

      {/* Employees grid */}
      {loading ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">جاري التحميل...</CardContent></Card>
      ) : emps.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">لا يوجد موظفين - أضف أول موظف</CardContent></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {emps.map((e) => (
            <Card key={e.id} className={!e.active ? 'opacity-60' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full laguna-gradient text-white flex items-center justify-center font-bold shrink-0 text-lg">
                    {e.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold truncate">{e.name}</h3>
                      <Badge variant="secondary" className="text-xs">{e.role}</Badge>
                      {!e.active && <Badge variant="destructive" className="text-xs">متوقف</Badge>}
                    </div>
                    {e.phone && <p className="text-xs text-muted-foreground num mt-0.5">{e.phone}</p>}
                    <div className="mt-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">المرتب الشهري:</span>
                        <span className="font-bold text-ocean num">{fmtMoney(e.salary)}</span>
                      </div>
                      {typeof e.totalPaid === 'number' && e.totalPaid > 0 && (
                        <div className="flex justify-between text-xs mt-0.5">
                          <span className="text-muted-foreground">مسلم له:</span>
                          <span className="num text-green-600">{fmtMoney(e.totalPaid)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(e)}>
                    <Pencil className="w-3.5 h-3.5 ml-1" /> تعديل
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleActive(e)}
                    title={e.active ? 'إيقاف' : 'تفعيل'}
                  >
                    <Power className={`w-3.5 h-3.5 ${e.active ? 'text-green-600' : 'text-muted-foreground'}`} />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive hover:bg-destructive/5"
                    onClick={() => setDeleteTarget(e)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setSaving(false) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-ocean" />
              {form.id ? 'تعديل بيانات موظف' : 'إضافة موظف جديد'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className={nameError ? 'text-destructive' : ''}>
                الاسم الكامل <span className="text-destructive">*</span>
                {nameError && <span className="text-xs mr-2">(مطلوب)</span>}
              </Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="مثال: أحمد محمد علي"
                autoFocus
                className={nameError ? 'border-destructive focus-visible:ring-destructive' : ''}
              />
            </div>
            <div>
              <Label>الوظيفة</Label>
              <Input value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} placeholder="كاشير / ويتر / مطبخ..." list="roles-list" />
              <datalist id="roles-list">
                <option value="كاشير" />
                <option value="ويتر" />
                <option value="باريستا" />
                <option value="مطبخ" />
                <option value="مدير وردية" />
                <option value="عامل نظافة" />
              </datalist>
            </div>
            <div>
              <Label>رقم الهاتف</Label>
              <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="010xxxxxxxx" className="num" dir="ltr" />
            </div>
            <div>
              <Label>المرتب الشهري (ج.م)</Label>
              <Input type="number" min="0" value={form.salary} onChange={(e) => setForm((f) => ({ ...f, salary: Number(e.target.value) }))} className="num" />
              <p className="text-xs text-muted-foreground mt-1">سيظهر هذا المرتب للمدير في تقارير المرتبات</p>
            </div>
            <div className="flex items-center gap-2 bg-muted/40 rounded-lg p-2">
              <Switch checked={form.active} onCheckedChange={(c) => setForm((f) => ({ ...f, active: c }))} />
              <Label className="cursor-pointer">الحساب نشط (يقدر يسجل حضور)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>إلغاء</Button>
            <Button
              onClick={save}
              disabled={saving || !form.name.trim()}
              className="laguna-gradient text-white border-0"
            >
              {saving ? (
                <><Clock className="w-4 h-4 ml-2 animate-spin" /> جاري الحفظ...</>
              ) : (
                <>{form.id ? <Pencil className="w-4 h-4 ml-1" /> : <Plus className="w-4 h-4 ml-1" />} {form.id ? 'حفظ التعديل' : 'إضافة الموظف'}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" /> تأكيد حذف الموظف
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm">
              هل أنت متأكد من حذف <strong>{deleteTarget?.name}</strong>؟
            </p>
            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-3 text-xs text-red-700">
                ⚠️ الحذف هيمسح الموظف وكل سجلاته (الحضور، الدفعات السابقة) نهائياً.
                لو عايز تحتفظ بالسجل التاريخي، استخدم زر "إيقاف" (أيقونة الطاقة) بدلاً من الحذف.
              </CardContent>
            </Card>
            <p className="text-xs text-muted-foreground">سيتم تحديث قائمة الموظفين عند المدير فوراً.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>إلغاء</Button>
            <Button onClick={confirmDelete} className="bg-destructive text-white hover:bg-destructive/90">
              <Trash2 className="w-4 h-4 ml-1" /> حذف نهائي
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============= Cashier Self-Attendance =============
// Cashier can only check IN/OUT for themselves. History is read-only.
interface AttendanceRecord {
  id: string
  date: string
  checkIn: string | null
  checkOut: string | null
  status: string
  notes: string | null
}
function CashierAttendance({ user }: { user: any }) {
  const { toast } = useToast()
  const [today, setToday] = useState<AttendanceRecord | null>(null)
  const [history, setHistory] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [employee, setEmployee] = useState<{ id: string; name: string; role: string } | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      // Find the employee record matching this cashier (by name)
      const empRes = await api<{ employees: any[] }>('/api/employees')
      const me = empRes.employees.find((e) => e.name === user.name) || null
      setEmployee(me ? { id: me.id, name: me.name, role: me.role } : null)

      // Get my attendance history (last 30 days)
      const attRes = await api<{ attendance: any[] }>('/api/attendance?mine=1')
      const records = attRes.attendance as AttendanceRecord[]
      setHistory(records)

      // Today's record
      const todayStr = new Date().toISOString().slice(0, 10)
      const todayRec = records.find((r) => r.date.slice(0, 10) === todayStr) || null
      setToday(todayRec)
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'خطأ', description: e.message })
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const checkIn = async () => {
    setBusy(true)
    try {
      await api('/api/attendance', {
        method: 'POST',
        body: JSON.stringify({ action: 'checkIn' }),
      })
      toast({ title: 'تم تسجيل الحضور', description: `أهلاً ${user.name} - تم تسجيل وصولك` })
      load()
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'خطأ', description: e.message })
    } finally {
      setBusy(false)
    }
  }

  const checkOut = async () => {
    setBusy(true)
    try {
      await api('/api/attendance', {
        method: 'POST',
        body: JSON.stringify({ action: 'checkOut' }),
      })
      toast({ title: 'تم تسجيل الانصراف', description: `مع السلامة ${user.name} - يومك سعيد` })
      load()
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'خطأ', description: e.message })
    } finally {
      setBusy(false)
    }
  }

  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)
  const hasCheckedIn = !!today?.checkIn
  const hasCheckedOut = !!today?.checkOut

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">جاري التحميل...</div>
  }

  return (
    <div className="p-3 max-w-3xl mx-auto space-y-3">
      {/* Header */}
      <Card className="laguna-gradient text-white border-0">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 backdrop-blur rounded-full p-2 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold">حضوري وانصرافي</h1>
              <p className="text-xs text-white/80">
                {employee ? `${employee.name} · ${employee.role}` : 'حسابك غير مرتبط بسجل موظف'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {!employee && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-3 text-sm text-red-800">
            ⚠️ حسابك ({user.name}) غير مرتبط بسجل موظف في النظام. لو أنت كاشير، اطلب من المدير يضيفك كموظف باسم "{user.name}" بالظبط.
          </CardContent>
        </Card>
      )}

      {/* Big action card - today's status */}
      <Card>
        <CardContent className="p-5">
          <div className="text-center mb-4">
            <div className="text-sm text-muted-foreground mb-1">اليوم</div>
            <div className="text-lg font-bold num">
              {now.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
            <div className="text-3xl font-black text-ocean num mt-1">
              {now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true })}
            </div>
          </div>

          {/* Status badges */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className={`rounded-xl p-3 text-center border-2 ${hasCheckedIn ? 'bg-green-50 border-green-300' : 'bg-muted/40 border-dashed border-border'}`}>
              <div className="text-xs text-muted-foreground mb-1">حضور</div>
              {hasCheckedIn ? (
                <div className="font-bold text-green-700 num">
                  {new Date(today!.checkIn!).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true })}
                </div>
              ) : (
                <div className="text-muted-foreground text-sm">لم يسجل بعد</div>
              )}
            </div>
            <div className={`rounded-xl p-3 text-center border-2 ${hasCheckedOut ? 'bg-blue-50 border-blue-300' : 'bg-muted/40 border-dashed border-border'}`}>
              <div className="text-xs text-muted-foreground mb-1">انصراف</div>
              {hasCheckedOut ? (
                <div className="font-bold text-blue-700 num">
                  {new Date(today!.checkOut!).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true })}
                </div>
              ) : (
                <div className="text-muted-foreground text-sm">لم يسجل بعد</div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          {!hasCheckedIn ? (
            <Button
              onClick={checkIn}
              disabled={busy || !employee}
              size="lg"
              className="w-full h-14 bg-green-600 hover:bg-green-700 text-white border-0 text-lg font-bold"
            >
              <LogIn className="w-6 h-6 ml-2" />
              {busy ? 'جاري...' : 'تسجيل الحضور الآن'}
            </Button>
          ) : !hasCheckedOut ? (
            <Button
              onClick={checkOut}
              disabled={busy}
              size="lg"
              className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white border-0 text-lg font-bold"
            >
              <LogOut className="w-6 h-6 ml-2" />
              {busy ? 'جاري...' : 'تسجيل الانصراف الآن'}
            </Button>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center text-green-700 font-bold">
              <CheckCircle2 className="w-6 h-6 mx-auto mb-1" />
              تم تسجيل حضورك وانصرافك اليوم ✅
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info banner */}
      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="p-3 text-xs text-amber-800 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            سجل الحضور بيظهر عند المدير في تبويب "الحضور". لو نسيت تسجل، اطلب من المدير يضيفه يدوياً.
            ساعات العمل بتتحسب من وقت الحضور لوقت الانصراف.
          </span>
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardContent className="p-3">
          <h3 className="font-bold mb-2 flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-ocean" />
            سجل آخر 30 يوم
          </h3>
          <div className="divide-y divide-border/60 max-h-96 overflow-y-auto">
            {history.length === 0 && (
              <p className="text-center text-muted-foreground py-8 text-sm">لا يوجد سجل حضور بعد</p>
            )}
            {history.map((r) => {
              const date = new Date(r.date)
              const isToday = r.date.slice(0, 10) === todayStr
              return (
                <div key={r.id} className={`py-2 flex items-center gap-3 ${isToday ? 'bg-ocean/5 -mx-3 px-3 rounded' : ''}`}>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">
                      {date.toLocaleDateString('ar-EG', { weekday: 'short', day: 'numeric', month: 'short' })}
                      {isToday && <Badge className="ml-2 text-xs bg-ocean">اليوم</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground num">
                      {r.checkIn ? `حضور: ${new Date(r.checkIn).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true })}` : '—'}
                      {' · '}
                      {r.checkOut ? `انصراف: ${new Date(r.checkOut).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true })}` : '—'}
                    </div>
                  </div>
                  <Badge
                    variant="secondary"
                    className={
                      r.status === 'PRESENT' ? 'bg-green-100 text-green-700' :
                      r.status === 'LATE' ? 'bg-amber-100 text-amber-700' :
                      r.status === 'ABSENT' ? 'bg-red-100 text-red-700' : ''
                    }
                  >
                    {r.status === 'PRESENT' ? 'حاضر' : r.status === 'LATE' ? 'متأخر' : r.status === 'ABSENT' ? 'غائب' : r.status}
                  </Badge>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

