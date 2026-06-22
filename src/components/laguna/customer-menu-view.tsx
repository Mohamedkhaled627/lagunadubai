'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Logo, WaveDivider } from './shared/logo'
import { api } from './use-auth'
import { useCustomerCallWaiter } from './use-waiter-calls'
import { fmtMoney } from '@/lib/format'
import { Coffee, Search, Bell, Waves, Clock, MapPin, Phone, Heart, CheckCircle2 } from 'lucide-react'

interface MenuItem {
  id: string
  name: string
  price: number
  imageUrl: string | null
}
interface Category {
  id: string
  nameAr: string
  icon: string
  coverUrl: string | null
  items: MenuItem[]
}
interface TableInfo {
  id: string
  name: string
  number: number
  qrToken: string
  seats: number
}

export function CustomerMenuView({ token }: { token: string }) {
  const [table, setTable] = useState<TableInfo | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [search, setSearch] = useState('')
  const [activeCat, setActiveCat] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [callSent, setCallSent] = useState(false)
  const { callWaiter: callWaiterHook } = useCustomerCallWaiter()

  useEffect(() => {
    Promise.all([
      api<{ table: TableInfo }>(`/api/tables/${token}?by=qr`),
      api<{ categories: Category[] }>('/api/menu'),
    ]).then(([t, m]) => {
      setTable(t.table)
      setCategories(m.categories)
      if (m.categories.length) setActiveCat(m.categories[0].id)
    }).catch((e) => setError(e.message)).finally(() => setLoading(false))
  }, [token])

  const toggleFav = (id: string) => {
    setFavorites((f) => {
      const n = new Set(f)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  const callWaiter = () => {
    if (!table) return
    callWaiterHook(table.name, table.number)
    setCallSent(true)
    setTimeout(() => setCallSent(false), 5000)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-lagoon/10 to-sand/20">
        <div className="text-center">
          <Logo size={88} />
          <p className="mt-4 text-muted-foreground">جاري تحميل المنيو...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-lagoon/10 to-sand/20 px-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="text-5xl mb-3">⚠️</div>
            <h1 className="text-xl font-bold mb-2">خطأ</h1>
            <p className="text-muted-foreground text-sm">{error}</p>
            <p className="text-xs text-muted-foreground mt-3">الرجاء مسح QR كود صحيح من على الترابيزة</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const filteredItems = search
    ? categories.flatMap((c) => c.items).filter((i) => i.name.includes(search.trim()))
    : (categories.find((c) => c.id === activeCat)?.items || [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-lagoon/5 via-background to-sand/10">
      {/* Hero header */}
      <div className="laguna-gradient text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-15" style={{
          backgroundImage: 'radial-gradient(circle at 30% 50%, white 1px, transparent 1px), radial-gradient(circle at 70% 30%, white 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />
        <div className="relative px-4 pt-8 pb-4 max-w-3xl mx-auto">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="bg-white rounded-full p-1.5 shadow-lg">
                <Logo size={56} />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight">لاجونا</h1>
                <p className="text-xs text-white/80">كافيه · على البحر مباشرة</p>
              </div>
            </div>
            {table && (
              <div className="bg-white/15 backdrop-blur rounded-xl px-3 py-2 text-center">
                <div className="text-xs text-white/80">ترابيزتك</div>
                <div className="text-lg font-bold">{table.name}</div>
              </div>
            )}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
            <div className="bg-white/10 rounded-lg p-2 flex items-center gap-1.5">
              <MapPin className="w-3 h-3" />
              <span>الكورنيش - البحر</span>
            </div>
            <div className="bg-white/10 rounded-lg p-2 flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              <span>يومياً 10ص - 2ص</span>
            </div>
            <div className="bg-white/10 rounded-lg p-2 flex items-center gap-1.5">
              <Phone className="w-3 h-3" />
              <span className="num">01000000000</span>
            </div>
          </div>
        </div>
        <WaveDivider />
      </div>

      <div className="max-w-3xl mx-auto px-3 -mt-4 pb-24">
        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="ابحث عن مشروبك المفضل..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-12 pr-10 bg-white shadow-md border-0"
          />
        </div>

        {/* Category chips */}
        {!search && (
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-3 px-3 mb-2">
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveCat(c.id)}
                className={`shrink-0 flex items-center gap-1.5 px-4 h-11 rounded-2xl border-2 text-sm font-bold transition ${
                  activeCat === c.id
                    ? 'border-ocean bg-ocean text-white shadow-lg'
                    : 'border-border bg-white hover:border-ocean/40'
                }`}
              >
                <span className="text-lg">{c.icon}</span>
                <span>{c.nameAr}</span>
              </button>
            ))}
          </div>
        )}

        {/* Items grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
          {filteredItems.map((item) => (
            <Card key={item.id} className="overflow-hidden hover:shadow-xl transition group border-border/60">
              <div className="aspect-square bg-muted relative overflow-hidden">
                {item.imageUrl ? (
                   
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-5xl bg-lagoon/10">
                    <Coffee className="w-12 h-12 text-lagoon/40" />
                  </div>
                )}
                <button
                  onClick={() => toggleFav(item.id)}
                  className="absolute top-2 left-2 bg-white/90 backdrop-blur rounded-full p-1.5 shadow-md"
                  aria-label="إضافة للمفضلة"
                >
                  <Heart className={`w-4 h-4 ${favorites.has(item.id) ? 'fill-coral text-coral' : 'text-muted-foreground'}`} />
                </button>
              </div>
              <CardContent className="p-3">
                <h3 className="font-bold text-sm line-clamp-2 min-h-[2.5rem]">{item.name}</h3>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-ocean font-extrabold num">{fmtMoney(item.price)}</span>
                  <Badge variant="secondary" className="text-xs bg-lagoon/10 text-ocean">
                    متاح
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Coffee className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>لا توجد أصناف</p>
          </div>
        )}

        {/* About section */}
        <Card className="mt-6 overflow-hidden border-0">
          <div className="laguna-gradient text-white p-5">
            <div className="flex items-center gap-2 mb-2">
              <Waves className="w-5 h-5" />
              <h2 className="text-lg font-bold">عن لاجونا</h2>
            </div>
            <p className="text-sm text-white/90 leading-relaxed">
              على شاطئ البحر مباشرة، حيث الأمواج والنسيم العليل، نقدم لكم أجود المشروبات الساخنة والباردة
              والكوكتيلات الفريش. استمتعوا بوقتكم معنا واكتشفوا نكهاتنا المميزة.
            </p>
          </div>
        </Card>
      </div>

      {/* Sticky call waiter button */}
      <div className="fixed bottom-4 inset-x-0 z-50 px-4">
        <div className="max-w-3xl mx-auto">
          {callSent ? (
            <div className="w-full h-14 bg-green-600 text-white border-0 shadow-2xl rounded-2xl text-base font-bold flex items-center justify-center gap-2 animate-fade-in-up">
              <CheckCircle2 className="w-6 h-6" />
              تم استدعاء الويتر للترابيزة {table?.name} - هيوصلك خلال لحظات 🌊
            </div>
          ) : (
            <Button
              onClick={callWaiter}
              size="lg"
              className="w-full h-14 laguna-gradient text-white border-0 shadow-2xl rounded-2xl text-base font-bold hover:opacity-90"
            >
              <Bell className="w-5 h-5 ml-2" />
              استدعاء ويتر · {table?.name}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
