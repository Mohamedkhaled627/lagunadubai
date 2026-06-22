import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

export const runtime = 'nodejs'

// GET /api/payments?employeeId=
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return Response.json({ error: 'غير مصرح' }, { status: 401 })
  if (user.role !== 'ADMIN') return Response.json({ error: 'صلاحيات الإدارة مطلوبة' }, { status: 403 })

  const url = new URL(req.url)
  const employeeId = url.searchParams.get('employeeId')
  const where: Record<string, unknown> = {}
  if (employeeId) where.employeeId = employeeId

  const payments = await db.employeePayment.findMany({
    where,
    orderBy: { date: 'desc' },
    include: {
      employee: { select: { id: true, name: true, role: true } },
      paidBy: { select: { name: true } },
    },
  })
  return Response.json({ payments })
}

// POST - record payment (salary advance / final)
export async function POST(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return Response.json({ error: 'غير مصرح' }, { status: 401 })
  if (user.role !== 'ADMIN') return Response.json({ error: 'صلاحيات الإدارة مطلوبة' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const { employeeId, amount, date, notes } = body
  if (!employeeId) return Response.json({ error: 'الموظف مطلوب' }, { status: 400 })
  if (!amount || Number(amount) <= 0) return Response.json({ error: 'المبلغ غير صحيح' }, { status: 400 })

  const payment = await db.employeePayment.create({
    data: {
      employeeId,
      amount: Number(amount),
      date: date ? new Date(date) : new Date(),
      notes: notes || null,
      paidById: user.id,
    },
    include: { employee: { select: { name: true } } },
  })
  return Response.json({ payment })
}
