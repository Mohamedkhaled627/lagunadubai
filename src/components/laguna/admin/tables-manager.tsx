'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { api } from '../use-auth'
import { fmtMoney } from '@/lib/format'
import { Table2, Plus, Pencil, Trash2, Loader2, QrCode, Users, CheckCircle2, StickyNote } from 'lucide-react'

interface TableInfo {
  id: string
  name: string
  number: number
  qrToken: string
  seats: number
  active: boolean
  hasOpenOrder: boolean
  note?: string
}

export function TablesManager() {
  const { toast } = useToast()
  const [tables, setTables] = useState<TableInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ id: '', name: '', number: 0, seats: 4, active: true, tableNote: '' })
  const [deleteTarget, setDeleteTarget] = useState<TableInfo | null>(null)
  const [noteDialogTable, setNoteDialogTable] = useState<TableInfo | null>(null)
  const [noteValue, setNoteValue] = useState('')

  const load = () => {
    setLoading(true)
    api<{ tables: TableInfo[] }>('/api/tables')
      .then((d) => setTables(d.tables))
      .catch((e) => toast({ variant: 'destructive', title: 'خطأ', description: e.message }))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const openNew = () => {
    const nextNumber = tables.length > 0 ? Math.max(...tables.map((t) => t.number)) + 1 : 1
    setForm({ id: '', name: `ترابيزة ${nextNumber}`, number: nextNumber, seats: 4, active: true, tableNote: '' })
    setOpen(true)
  }
  const openEdit = (t: TableInfo) => {
    setForm({ id: t.id, name: t.name, number: t.number, seats: t.seats, active: t.active, tableNote: t.note || '' })
    setOpen(true)
  }

  const save = async () => {
    if (!form.name.trim()) {
      toast({ variant: 'destructive', title: '⚠️ الاسم مطلوب' })
      return
    }
    if (!form.number || form.number < 1) {
      toast({ variant: 'destructive', title: '⚠️ رقم الترابيزة غير صحيح' })
      return
    }
    setSaving(true)
    try {
      const d = await api<{ table: TableInfo }>('/api/tables', {
        method: 'POST',
        body: JSON.stringify(form),
      })
      toast({
        title: form.id ? '✅ تم تحديث الترابيزة' : '✅ تم إضافة الترابيزة',
        description: `${d.table.name} · ${d.table.seats} مقاعد · QR تم توليده`,
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
      await api(`/api/tables?id=${deleteTarget.id}`, { method: 'DELETE' })
      toast({ title: '✅ تم حذف الترابيزة', description: deleteTarget.name })
      setDeleteTarget(null)
      load()
    } catch (e: any) {
      toast({ variant: 'destructive', title: '❌ خطأ', description: e.message })
    }
  }

  const openNoteDialog = (t: TableInfo) => {
    setNoteDialogTable(t)
    setNoteValue(t.note || '')
  }

  const saveNote = async () => {
    if (!noteDialogTable) return
    try {
      await api('/api/tables', {
        method: 'POST',
        body: JSON.stringify({ id: noteDialogTable.id, tableNote: noteValue }),
      })
      toast({ title: '✅ تم حفظ ملاحظة الترابيزة', description: noteDialogTable.name })
      setNoteDialogTable(null)
      load()
    } catch (e: any) {
      toast({ variant: 'destructive', title: '❌ خطأ', description: e.message })
    }
  }

  const totalTables = tables.length
  const activeTables = tables.filter((t) => t.active).length
  const openOrders = tables.filter((t) => t.hasOpenOrder).length
  const totalSeats = tables.reduce((s, t) => s + t.seats, 0)

  return (
    <div className="p-4 space-y-4">
      {/* Header with gradient */}
      <Card className="laguna-gradient text-white border-0 shadow-xl overflow-hidden relative">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)',
          backgroundSize: '30px 30px',
        }} />
        <CardContent className="p-5 relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-white/20 backdrop-blur rounded-full p-2.5 shrink-0">
              <Table2 className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-black">إدارة الترابيزات</h1>
              <p className="text-sm text-white/80">إضافة وتعديل وحذف الترابيزات + توليد QR تلقائياً</p>
            </div>
          </div>
          {/* Stats row */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            <StatBox label="إجمالي" value={totalTables} color="bg-white/15" />
            <StatBox label="نشطة" value={activeTables} color="bg-green-500/30" />
            <StatBox label="فاتورة مفتوحة" value={openOrders} color="bg-amber-500/30" />
            <StatBox label="إجمالي مقاعد" value={totalSeats} color="bg-white/15" />
          </div>
          <Button onClick={openNew} className="bg-white text-ocean hover:bg-white/90 font-bold w-full h-12 text-base shadow-lg">
            <Plus className="w-5 h-5 ml-2" /> إضافة ترابيزة جديدة
          </Button>
        </CardContent>
      </Card>

      {loading ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">
          <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin opacity-50" />
          جاري تحميل الترابيزات...
        </CardContent></Card>
      ) : tables.length === 0 ? (
        <Card className="bg-muted/30">
          <CardContent className="py-16 text-center">
            <Table2 className="w-16 h-16 mx-auto mb-3 opacity-30" />
            <p className="text-muted-foreground font-medium">لا توجد ترابيزات بعد</p>
            <p className="text-xs text-muted-foreground mt-1">اضغط "إضافة ترابيزة جديدة" للبدء</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {tables.map((t, idx) => (
            <Card
              key={t.id}
              className={`group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${!t.active ? 'opacity-60' : ''}`}
              style={{ animationDelay: `${idx * 30}ms` }}
            >
              {/* Status indicator strip */}
              <div className={`h-1.5 ${
                t.hasOpenOrder ? 'bg-amber-500' : t.active ? 'bg-green-500' : 'bg-muted'
              }`} />
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-10 h-10 rounded-xl laguna-gradient text-white flex items-center justify-center font-black text-lg shrink-0">
                    {t.number}
                  </div>
                  {t.hasOpenOrder && (
                    <Badge className="bg-amber-500 text-white text-[10px] animate-pulse">فاتورة مفتوحة</Badge>
                  )}
                </div>
                <h3 className="font-bold text-sm line-clamp-1">{t.name}</h3>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                  <Users className="w-3 h-3" />
                  <span className="num">{t.seats} مقاعد</span>
                </div>
                <div className="text-[10px] text-muted-foreground mt-1 font-mono truncate" dir="ltr">
                  {t.qrToken}
                </div>
                {/* Table note - what the table ordered */}
                {t.note && (
                  <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="text-[10px] text-amber-700 font-bold mb-0.5">📝 ملاحظة الطلب</div>
                    <div className="text-[11px] text-amber-900 line-clamp-3 leading-tight whitespace-pre-wrap">{t.note}</div>
                  </div>
                )}
                {!t.active && (
                  <Badge variant="destructive" className="text-[10px] mt-1 w-full justify-center">متوقفة</Badge>
                )}
                <div className="flex gap-1 mt-2">
                  <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={() => openEdit(t)}>
                    <Pencil className="w-3 h-3 ml-1" /> تعديل
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 w-7 p-0 text-amber-600 hover:bg-amber-50"
                    onClick={() => openNoteDialog(t)}
                    title="ملاحظة الطلب"
                  >
                    <StickyNote className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 w-7 p-0 text-destructive hover:bg-destructive/5"
                    onClick={() => setDeleteTarget(t)}
                  >
                    <Trash2 className="w-3 h-3" />
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
              <Table2 className="w-5 h-5 text-ocean" />
              {form.id ? 'تعديل بيانات ترابيزة' : 'إضافة ترابيزة جديدة'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>رقم الترابيزة <span className="text-destructive">*</span></Label>
              <Input
                type="number"
                min="1"
                value={form.number}
                onChange={(e) => setForm((f) => ({ ...f, number: Number(e.target.value) }))}
                className="num"
              />
            </div>
            <div>
              <Label>اسم الترابيزة <span className="text-destructive">*</span></Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="مثال: ترابيزة 1"
                autoFocus
              />
            </div>
            <div>
              <Label>عدد المقاعد</Label>
              <Input
                type="number"
                min="1"
                max="20"
                value={form.seats}
                onChange={(e) => setForm((f) => ({ ...f, seats: Number(e.target.value) }))}
                className="num"
              />
              <p className="text-xs text-muted-foreground mt-1">عدد الكراسي حول الترابيزة</p>
            </div>
            <div className="flex items-center gap-2 bg-muted/40 rounded-lg p-2">
              <Switch checked={form.active} onCheckedChange={(c) => setForm((f) => ({ ...f, active: c }))} />
              <Label className="cursor-pointer">الترابيزة نشطة (متاحة للحجز)</Label>
            </div>
            <div>
              <Label>ملاحظة الطلب (إيه اللي الترابيزة أخدته)</Label>
              <textarea
                value={form.tableNote}
                onChange={(e) => setForm((f) => ({ ...f, tableNote: e.target.value }))}
                placeholder="مثال: 2 قهوة + 1 شاي + ماء&#10;العميل طلب بدون سكر"
                rows={3}
                className="w-full px-3 py-2 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ocean/30"
              />
              <p className="text-xs text-muted-foreground mt-1">اكتب الأصناف اللي الترابيزة أخدتها - تظهر للكاشير والمدير</p>
            </div>
            {!form.id && (
              <Card className="bg-ocean/5 border-ocean/20">
                <CardContent className="p-3 text-xs text-ocean">
                  <QrCode className="w-4 h-4 inline ml-1" />
                  سيتم توليد QR كود تلقائياً للترابيزة عند الإضافة
                </CardContent>
              </Card>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>إلغاء</Button>
            <Button
              onClick={save}
              disabled={saving || !form.name.trim() || !form.number}
              className="laguna-gradient text-white border-0"
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 ml-2 animate-spin" /> جاري الحفظ...</>
              ) : (
                <>{form.id ? <Pencil className="w-4 h-4 ml-1" /> : <Plus className="w-4 h-4 ml-1" />} {form.id ? 'حفظ التعديل' : 'إضافة الترابيزة'}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Note Dialog - separate from add/edit */}
      <Dialog open={!!noteDialogTable} onOpenChange={(v) => !v && setNoteDialogTable(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <StickyNote className="w-5 h-5 text-amber-500" />
              ملاحظة طلب - {noteDialogTable?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>إيه اللي الترابيزة أخدته؟</Label>
              <textarea
                value={noteValue}
                onChange={(e) => setNoteValue(e.target.value)}
                placeholder={"مثال:\n• 2 قهوة سنجل تركي\n• 1 شاي كرك\n• 1 عصير برتقال\n• ماء بدون غاز"}
                rows={6}
                className="w-full px-3 py-2 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-amber/30"
                autoFocus
              />
              <p className="text-xs text-muted-foreground mt-1">
                اكتب الأصناف أو أي ملاحظة - بتظهر في بطاقة الترابيزة للكل
              </p>
            </div>
            {noteDialogTable?.note && (
              <Card className="bg-amber-50 border-amber-200">
                <CardContent className="p-2 text-xs text-amber-800">
                  <strong>الملاحظة الحالية:</strong>
                  <div className="mt-1 whitespace-pre-wrap">{noteDialogTable.note}</div>
                </CardContent>
              </Card>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteDialogTable(null)}>إلغاء</Button>
            {noteValue && (
              <Button
                variant="outline"
                onClick={() => setNoteValue('')}
                className="text-destructive"
              >
                مسح الملاحظة
              </Button>
            )}
            <Button onClick={saveNote} className="bg-amber-500 text-white hover:bg-amber-600 border-0">
              <StickyNote className="w-4 h-4 ml-1" /> حفظ الملاحظة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" /> تأكيد حذف الترابيزة
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm">
              هل أنت متأكد من حذف <strong>{deleteTarget?.name}</strong>؟
            </p>
            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-3 text-xs text-red-700">
                ⚠️ الحذف هيمسح الترابيزة وكل الفواتير المرتبطة بيها. لو عايز تحتفظ بالسجل، استخدم زر التفعيل/الإيقاف في التعديل.
              </CardContent>
            </Card>
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

function StatBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`${color} backdrop-blur rounded-xl p-2 text-center`}>
      <div className="text-xl font-black num">{value}</div>
      <div className="text-[10px] text-white/80">{label}</div>
    </div>
  )
}
