'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { api } from '../use-auth'
import { fmtMoney } from '@/lib/format'
import { Search, Save, Pencil, X, Power } from 'lucide-react'

interface MenuItem {
  id: string
  name: string
  price: number
  imageUrl: string | null
  available: boolean
}
interface Category {
  id: string
  nameAr: string
  icon: string
  items: MenuItem[]
}

export function MenuManager() {
  const { toast } = useToast()
  const [categories, setCategories] = useState<Category[]>([])
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Record<string, { price: number; name: string }>>({})
  const [saving, setSaving] = useState<string | null>(null)

  const load = () => {
    api<{ categories: Category[] }>('/api/menu?include_unavailable=1').then((d) => setCategories(d.categories))
  }
  useEffect(() => { load() }, [])

  const startEdit = (it: MenuItem) =>
    setEditing((e) => ({ ...e, [it.id]: { price: it.price, name: it.name } }))

  const save = async (id: string) => {
    const e = editing[id]
    if (!e) return
    setSaving(id)
    try {
      await api(`/api/menu/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ price: e.price, name: e.name }),
      })
      toast({ title: 'تم تحديث الصنف' })
      setEditing((s) => {
        const n = { ...s }
        delete n[id]
        return n
      })
      load()
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'خطأ', description: err.message })
    } finally {
      setSaving(null)
    }
  }

  const toggleAvailable = async (it: MenuItem) => {
    try {
      await api(`/api/menu/${it.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ available: !it.available }),
      })
      toast({ title: it.available ? 'تم إيقاف الصنف' : 'تم تفعيل الصنف' })
      load()
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'خطأ', description: err.message })
    }
  }

  const filtered = (cat: Category) =>
    search ? cat.items.filter((i) => i.name.includes(search.trim())) : cat.items

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-ocean">إدارة المنيو والأسعار</h1>
          <p className="text-sm text-muted-foreground">عدّل أسعار وأسماء الأصناف وفّر/أوقف الأصناف</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="بحث..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10"
          />
        </div>
      </div>

      <div className="space-y-4">
        {categories.map((cat) => {
          const items = filtered(cat)
          if (items.length === 0) return null
          return (
            <Card key={cat.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3 pb-3 border-b border-border/60">
                  <span className="text-2xl">{cat.icon}</span>
                  <h2 className="text-lg font-bold">{cat.nameAr}</h2>
                  <Badge variant="secondary" className="num">{items.length} صنف</Badge>
                </div>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {items.map((it) => {
                    const e = editing[it.id]
                    const isEditing = !!e
                    return (
                      <div key={it.id} className={`rounded-lg border p-3 transition ${it.available ? 'border-border bg-card' : 'border-dashed border-border bg-muted/30 opacity-60'}`}>
                        <div className="flex items-start gap-2 mb-2">
                          {it.imageUrl ? (
                             
                            <img src={it.imageUrl} alt={it.name} className="w-10 h-10 rounded object-cover" />
                          ) : (
                            <div className="w-10 h-10 rounded bg-muted flex items-center justify-center text-xl">{cat.icon}</div>
                          )}
                          <div className="flex-1 min-w-0">
                            {isEditing ? (
                              <Input
                                value={e.name}
                                onChange={(ev) => setEditing((s) => ({ ...s, [it.id]: { ...s[it.id], name: ev.target.value } }))}
                                className="h-7 text-sm"
                              />
                            ) : (
                              <div className="font-semibold text-sm line-clamp-2">{it.name}</div>
                            )}
                          </div>
                          <Switch checked={it.available} onCheckedChange={() => toggleAvailable(it)} />
                        </div>
                        <div className="flex items-center gap-2">
                          {isEditing ? (
                            <>
                              <Input
                                type="number"
                                value={e.price}
                                onChange={(ev) => setEditing((s) => ({ ...s, [it.id]: { ...s[it.id], price: Number(ev.target.value) } }))}
                                className="h-8 num"
                              />
                              <Button size="sm" onClick={() => save(it.id)} disabled={saving === it.id}>
                                <Save className="w-3.5 h-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditing((s) => { const n = { ...s }; delete n[it.id]; return n })}>
                                <X className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <div className="font-bold text-ocean num flex-1">{fmtMoney(it.price)}</div>
                              <Button size="sm" variant="outline" onClick={() => startEdit(it)}>
                                <Pencil className="w-3.5 h-3.5 ml-1" /> تعديل
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
