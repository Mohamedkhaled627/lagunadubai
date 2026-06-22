'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { api } from '../use-auth'
import { fmtMoney } from '@/lib/format'
import { Users, Plus, Pencil, Loader2, UserCheck } from 'lucide-react'

export function EmployeesManager() {
  const { toast } = useToast()
  const [emps, setEmps] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ id: '', name: '', role: 'موظف', phone: '', salary: 0, active: true })

  const load = () => api<{ employees: any[] }>('/api/employees').then((d) => setEmps(d.employees))
  useEffect(() => { load() }, [])

  const openNew = () => {
    // Reset form completely for new employee
    setForm({ id: '', name: '', role: 'موظف', phone: '', salary: 0, active: true })
    setOpen(true)
  }
  const openEdit = (e: any) => {
    setForm({ id: e.id, name: e.name, role: e.role, phone: e.phone || '', salary: e.salary, active: e.active })
    setOpen(true)
  }

  const save = async () => {
    // Validation
    if (!form.name.trim()) {
      toast({ variant: 'destructive', title: '⚠️ الاسم مطلوب', description: 'من فضلك اكتب اسم الموظف الأول' })
      return
    }
    if (form.name.trim().length < 3) {
      toast({ variant: 'destructive', title: '⚠️ الاسم قصير جداً', description: 'اكتب اسم كامل (3 حروف على الأقل)' })
      return
    }
    if (form.salary < 0) {
      toast({ variant: 'destructive', title: 'المرتب غير صحيح' })
      return
    }
    setSaving(true)
    try {
      const result = await api<{ employee: any }>('/api/employees', { method: 'POST', body: JSON.stringify(form) })
      toast({
        title: form.id ? '✅ تم تحديث الموظف' : '✅ تم إضافة الموظف',
        description: `${result.employee.name} - ${result.employee.role} - ${fmtMoney(result.employee.salary)}`,
      })
      setOpen(false)
      load()
    } catch (e: any) {
      toast({ variant: 'destructive', title: '❌ خطأ', description: e.message })
    } finally {
      setSaving(false)
    }
  }

  const toggle = async (e: any) => {
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

  const totalSalary = emps.filter((e) => e.active).reduce((s, e) => s + e.salary, 0)
  const nameError = open && !form.name.trim()

  return (
    <div className="p-4 space-y-3">
      {/* Header with full-width add button */}
      <Card className="laguna-gradient text-white border-0">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-white/20 backdrop-blur rounded-full p-2 shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold">الموظفين</h1>
              <p className="text-xs text-white/80">
                {emps.length} موظف · {emps.filter(e => e.active).length} نشط · إجمالي المرتبات: {fmtMoney(totalSalary)}/شهر
              </p>
            </div>
          </div>
          <Button onClick={openNew} className="bg-white text-ocean hover:bg-white/90 font-bold w-full h-12 text-base">
            <Plus className="w-5 h-5 ml-2" /> إضافة موظف جديد
          </Button>
        </CardContent>
      </Card>

      {emps.length === 0 && (
        <Card className="bg-muted/30">
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-muted-foreground">لا يوجد موظفين بعد</p>
            <p className="text-xs text-muted-foreground mt-1">اضغط "إضافة موظف جديد" لإضافة أول موظف</p>
          </CardContent>
        </Card>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {emps.map((e) => (
          <Card key={e.id} className={!e.active ? 'opacity-60' : ''}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full laguna-gradient text-white flex items-center justify-center font-bold shrink-0">
                  {e.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold truncate">{e.name}</h3>
                    <Badge variant="secondary" className="text-xs">{e.role}</Badge>
                  </div>
                  {e.phone && <p className="text-xs text-muted-foreground num">{e.phone}</p>}
                  <div className="mt-1 text-sm">
                    <span className="text-muted-foreground">المرتب: </span>
                    <span className="font-bold text-ocean num">{fmtMoney(e.salary)}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    مسلم له: <span className="num text-foreground">{fmtMoney(e.totalPaid || 0)}</span>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(e)}>
                  <Pencil className="w-3.5 h-3.5 ml-1" /> تعديل
                </Button>
                <div className="flex items-center gap-1">
                  <Label className="text-xs text-muted-foreground">نشط</Label>
                  <Switch checked={e.active} onCheckedChange={() => toggle(e)} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

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
              <Input value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} placeholder="كاشير / ويتر / مطبخ..." list="admin-roles-list" />
              <datalist id="admin-roles-list">
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
              <p className="text-xs text-muted-foreground mt-1">سيظهر في تقارير المرتبات</p>
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
                <><Loader2 className="w-4 h-4 ml-2 animate-spin" /> جاري الحفظ...</>
              ) : (
                <>{form.id ? <Pencil className="w-4 h-4 ml-1" /> : <Plus className="w-4 h-4 ml-1" />} {form.id ? 'حفظ التعديل' : 'إضافة الموظف'}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
