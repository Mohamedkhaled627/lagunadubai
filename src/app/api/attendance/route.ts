import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

export const runtime = 'nodejs'

// GET /api/attendance?from=&to=&employeeId=&mine=1
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return Response.json({ error: 'غير مصرح' }, { status: 401 })

  const url = new URL(req.url)
  const from = url.searchParams.get('from')
  const to = url.searchParams.get('to')
  const employeeId = url.searchParams.get('employeeId')
  const mine = url.searchParams.get('mine') === '1'

  // Cashiers can only see their own attendance (matched by name)
  const where: Record<string, unknown> = {}
  if (mine) {
    where.employee = { name: user.name }
  } else if (user.role !== 'ADMIN') {
    where.employee = { name: user.name }
  } else if (employeeId) {
    where.employeeId = employeeId
  }
  if (from || to) {
    where.date = {}
    if (from) (where.date as Record<string, unknown>).gte = new Date(from)
    if (to) (where.date as Record<string, unknown>).lte = new Date(to)
  }

  const records = await db.attendance.findMany({
    where,
    orderBy: { date: 'desc' },
    include: { employee: { select: { id: true, name: true, role: true, salary: true } } },
    take: 100,
  })
  return Response.json({ attendance: records })
}

// POST - check in/out for self (cashier) or any (admin)
export async function POST(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return Response.json({ error: 'غير مصرح' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { action, date, checkIn, checkOut, status, notes } = body
  let { employeeId } = body

  // Cashier: only self (find employee by name matching user.name)
  if (user.role !== 'ADMIN') {
    const self = await db.employee.findFirst({ where: { name: user.name } })
    if (!self) {
      return Response.json({ error: 'حسابك غير مرتبط بسجل موظف. تواصل مع المدير لإضافتك كموظف باسم مطابق لحسابك.' }, { status: 400 })
    }
    employeeId = self.id
  } else if (!employeeId) {
    return Response.json({ error: 'الموظف مطلوب' }, { status: 400 })
  }

  const day = date ? new Date(date) : new Date()
  day.setHours(0, 0, 0, 0)

  let record = await db.attendance.findFirst({
    where: { employeeId, date: day },
  })

  if (action === 'checkIn') {
    if (record) {
      record = await db.attendance.update({ where: { id: record.id }, data: { checkIn: new Date(), status: 'PRESENT' } })
    } else {
      record = await db.attendance.create({ data: { employeeId, date: day, checkIn: new Date(), status: 'PRESENT' } })
    }
  } else if (action === 'checkOut') {
    if (!record) return Response.json({ error: 'لا يوجد تسجيل حضور اليوم' }, { status: 400 })
    record = await db.attendance.update({ where: { id: record.id }, data: { checkOut: new Date() } })
  } else if (action === 'manual') {
    const data: Record<string, unknown> = {
      status: status || 'PRESENT',
      notes: notes || null,
    }
    if (checkIn) data.checkIn = new Date(checkIn)
    if (checkOut) data.checkOut = new Date(checkOut)
    if (record) {
      record = await db.attendance.update({ where: { id: record.id }, data })
    } else {
      record = await db.attendance.create({ data: { employeeId, date: day, ...data } as never })
    }
  } else {
    return Response.json({ error: 'إجراء غير معروف' }, { status: 400 })
  }

  return Response.json({ attendance: record, actor: { id: user.id, name: user.name, role: user.role } })
}
