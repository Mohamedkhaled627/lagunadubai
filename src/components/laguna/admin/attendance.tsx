'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'
import { api } from '../use-auth'
import { fmtDate, fmtTime, fmtMoney } from '@/lib/format'
import { CalendarClock, LogIn, LogOut, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react'

export function AttendanceView() {
  const { toast } = useToast()
  const [attendance, setAttendance] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [selectedEmp, setSelectedEmp] = useState('ALL')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const load = () => {
    const params = new URLSearchParams()
    if (selectedEmp !== 'ALL') params.set('employeeId', selectedEmp)
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    api<{ attendance: any[] }>(`/api/attendance?${params.toString()}`).then((d) => setAttendance(d.attendance))
  }
  useEffect(() => {
    api<{ employees: any[] }>('/api/employees').then((d) => setEmployees(d.employees))
  }, [])
  useEffect(() => { load() }, [selectedEmp, from, to])

  const checkIn = async (employeeId: string) => {
    try {
      await api('/api/attendance', { method: 'POST', body: JSON.stringify({ employeeId, action: 'checkIn' }) })
      toast({ title: 'تم تسجيل الحضور' })
      load()
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'خطأ', description: e.message })
    }
  }
  const checkOut = async (employeeId: string) => {
    try {
      await api('/api/attendance', { method: 'POST', body: JSON.stringify({ employeeId, action: 'checkOut' }) })
      toast({ title: 'تم تسجيل الانصراف' })
      load()
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'خطأ', description: e.message })
    }
  }

  // Group by date
  const byDate: Record<string, any[]> = {}
  for (const a of attendance) {
    const key = fmtDate(a.date)
    if (!byDate[key]) byDate[key] = []
    byDate[key].push(a)
  }

  // Today's quick actions
  const today = fmtDate(new Date())
  const todayRecords = byDate[today] || []

  return (
    <div className="p-4 space-y-3">
      <div>
        <h1 className="text-2xl font-bold text-ocean flex items-center gap-2">
          <CalendarClock className="w-6 h-6" /> الحضور والانصراف
        </h1>
        <p className="text-sm text-muted-foreground">سجل حضور الموظفين اليومي</p>
      </div>

      {/* Quick check-in for today */}
      <Card>
        <CardContent className="p-3">
          <h2 className="font-bold mb-2 flex items-center gap-2">
            <Clock className="w-4 h-4 text-ocean" /> تسجيل سريع - {today}
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {employees.filter((e) => e.active).map((e) => {
              const rec = todayRecords.find((r) => r.employeeId === e.id)
              return (
                <div key={e.id} className="flex items-center gap-2 bg-muted/40 rounded-lg p-2">
                  <div className="w-8 h-8 rounded-full laguna-gradient text-white flex items-center justify-center text-sm font-bold">
                    {e.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{e.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {rec ? (
                        <>
                          {rec.checkIn && <span className="num">{fmtTime(rec.checkIn)}</span>}
                          {rec.checkOut && <span className="num"> → {fmtTime(rec.checkOut)}</span>}
                          {!rec.checkIn && !rec.checkOut && <span>غائب</span>}
                        </>
                      ) : (
                        'لم يسجل'
                      )}
                    </div>
                  </div>
                  {!rec?.checkIn ? (
                    <Button size="sm" variant="outline" onClick={() => checkIn(e.id)} className="h-8 text-xs">
                      <LogIn className="w-3 h-3 ml-1" /> حضور
                    </Button>
                  ) : !rec?.checkOut ? (
                    <Button size="sm" variant="outline" onClick={() => checkOut(e.id)} className="h-8 text-xs text-destructive">
                      <LogOut className="w-3 h-3 ml-1" /> انصراف
                    </Button>
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="p-3 flex flex-wrap gap-2 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">الموظف</label>
            <Select value={selectedEmp} onValueChange={setSelectedEmp}>
              <SelectTrigger className="w-48 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">الكل</SelectItem>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">من</label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40 h-9" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">إلى</label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40 h-9" />
          </div>
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardContent className="p-3">
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4">
              {Object.entries(byDate).length === 0 && (
                <p className="text-center text-muted-foreground py-8">لا توجد سجلات</p>
              )}
              {Object.entries(byDate).map(([date, recs]) => (
                <div key={date}>
                  <h3 className="font-bold text-ocean mb-2 sticky top-0 bg-card pb-1 border-b border-border/60">{date}</h3>
                  <div className="space-y-1">
                    {recs.map((r) => (
                      <div key={r.id} className="flex items-center gap-3 py-1.5 px-2 hover:bg-muted/40 rounded">
                        <div className="w-8 h-8 rounded-full laguna-gradient text-white flex items-center justify-center text-xs font-bold">
                          {r.employee.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm">{r.employee.name}</div>
                          <div className="text-xs text-muted-foreground">{r.employee.role}</div>
                        </div>
                        <div className="text-sm text-center min-w-0">
                          <div className="text-xs text-muted-foreground">حضور</div>
                          <div className="num font-semibold">{r.checkIn ? fmtTime(r.checkIn) : '-'}</div>
                        </div>
                        <div className="text-sm text-center min-w-0">
                          <div className="text-xs text-muted-foreground">انصراف</div>
                          <div className="num font-semibold">{r.checkOut ? fmtTime(r.checkOut) : '-'}</div>
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
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
