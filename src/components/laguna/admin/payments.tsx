'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { api } from '../use-auth'
import { fmtMoney, fmtDate } from '@/lib/format'
import { Wallet, Plus, HandCoins } from 'lucide-react'

export function PaymentsView() {
  const { toast } = useToast()
  const [employees, setEmployees] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [filterEmp, setFilterEmp] = useState('ALL')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ employeeId: '', amount: 0, date: new Date().toISOString().slice(0, 10), notes: '' })

  const load = () => {
    api<{ employees: any[] }>('/api/employees').then((d) => setEmployees(d.employees))
    api<{ payments: any[] }>(`/api/payments${filterEmp !== 'ALL' ? `?employeeId=${filterEmp}` : ''}`).then((d) => setPayments(d.payments))
  }
  useEffect(() => { load() }, [filterEmp])

  const openNew = () => {
    setForm({ employeeId: '', amount: 0, date: new Date().toISOString().slice(0, 10), notes: '' })
    setOpen(true)
  }

  const save = async () => {
    if (!form.employeeId) return toast({ variant: 'destructive', title: 'اختر موظف' })
    if (form.amount <= 0) return toast({ variant: 'destructive', title: 'المبلغ غير صحيح' })
    try {
      await api('/api/payments', { method: 'POST', body: JSON.stringify(form) })
      toast({ title: 'تم تسجيل الدفعة' })
      setOpen(false)
      load()
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'خطأ', description: e.message })
    }
  }

  const totalPaid = payments.reduce((s, p) => s + p.amount, 0)

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-ocean flex items-center gap-2">
            <Wallet className="w-6 h-6" /> القبض والمرتبات
          </h1>
          <p className="text-sm text-muted-foreground">
            إجمالي المدفوع: <span className="font-bold text-foreground num">{fmtMoney(totalPaid)}</span>
          </p>
        </div>
        <Button onClick={openNew} className="laguna-gradient text-white border-0">
          <Plus className="w-4 h-4 ml-1" /> صرف دفعة
        </Button>
      </div>

      <Card>
        <CardContent className="p-3 flex items-center gap-2">
          <Label className="text-sm whitespace-nowrap">تصفية حسب:</Label>
          <Select value={filterEmp} onValueChange={setFilterEmp}>
            <SelectTrigger className="w-56 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">الكل</SelectItem>
              {employees.map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Per-employee summary */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {employees.map((e) => {
          const empPaid = payments.filter((p) => p.employeeId === e.id).reduce((s, p) => s + p.amount, 0)
          const remaining = e.salary - empPaid
          return (
            <Card key={e.id} className={!e.active ? 'opacity-60' : ''}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-bold text-sm">{e.name}</div>
                  <Badge variant="secondary" className="text-xs">{e.role}</Badge>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">المرتب الشهري</span>
                    <span className="font-semibold num">{fmtMoney(e.salary)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">المسلم</span>
                    <span className="font-semibold num text-green-600">{fmtMoney(empPaid)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">المتبقي</span>
                    <span className={`font-semibold num ${remaining > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                      {fmtMoney(remaining)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Payments history */}
      <Card>
        <CardContent className="p-3">
          <h2 className="font-bold mb-2">سجل الدفعات</h2>
          <ScrollArea className="max-h-[60vh]">
            <div className="divide-y divide-border/60">
              {payments.length === 0 && <p className="text-center text-muted-foreground py-8">لا توجد دفعات</p>}
              {payments.map((p) => (
                <div key={p.id} className="p-2 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-green-100 text-green-700 flex items-center justify-center">
                    <HandCoins className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">{p.employee.name}</div>
                    <div className="text-xs text-muted-foreground">{fmtDate(p.date)} · بواسطة {p.paidBy?.name}</div>
                  </div>
                  {p.notes && <span className="text-xs text-muted-foreground truncate max-w-32">{p.notes}</span>}
                  <div className="font-bold num text-green-700">{fmtMoney(p.amount)}</div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>صرف دفعة لموظف</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>الموظف</Label>
              <Select value={form.employeeId} onValueChange={(v) => setForm((f) => ({ ...f, employeeId: v }))}>
                <SelectTrigger><SelectValue placeholder="اختر موظف" /></SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.name} - {e.role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>المبلغ</Label>
              <Input type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: Number(e.target.value) }))} className="num" />
            </div>
            <div>
              <Label>التاريخ</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <Label>ملاحظات</Label>
              <Input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="مثال: راتب شهر، سلفة..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button onClick={save} className="laguna-gradient text-white border-0">تأكيد الصرف</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
