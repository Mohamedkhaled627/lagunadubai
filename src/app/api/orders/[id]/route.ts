import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req)
  if (!user) return Response.json({ error: 'غير مصرح' }, { status: 401 })
  const { id } = await params
  const order = await db.order.findUnique({
    where: { id },
    include: {
      items: true,
      table: true,
      cashier: { select: { id: true, name: true, username: true } },
      returns: { include: { items: true, returnedBy: { select: { name: true } } } },
    },
  })
  if (!order) return Response.json({ error: 'الفاتورة غير موجودة' }, { status: 404 })
  // Cashiers can only see their own orders (unless paid)
  if (user.role !== 'ADMIN' && order.cashierId !== user.id && order.status === 'PENDING') {
    return Response.json({ error: 'غير مصرح' }, { status: 403 })
  }
  return Response.json({ order })
}

// PATCH - update status (cancel, mark paid)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req)
  if (!user) return Response.json({ error: 'غير مصرح' }, { status: 401 })
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const order = await db.order.findUnique({ where: { id } })
  if (!order) return Response.json({ error: 'الفاتورة غير موجودة' }, { status: 404 })

  // Cashiers can update their own; admins can update any
  if (user.role !== 'ADMIN' && order.cashierId !== user.id) {
    return Response.json({ error: 'غير مصرح بتعديل فاتورة غيرك' }, { status: 403 })
  }

  const data: Record<string, unknown> = {}
  if (body.status === 'CANCELLED') {
    data.status = 'CANCELLED'
    data.cancelledAt = new Date()
    data.cancelledBy = user.name
    data.cancelReason = body.cancelReason || 'إلغاء من الكاشير'
  } else if (body.status === 'PAID') {
    data.status = 'PAID'
    data.paidAt = new Date()
    if (body.paymentMethod) data.paymentMethod = body.paymentMethod
  } else if (body.status === 'PENDING') {
    data.status = 'PENDING'
    data.paidAt = null
    data.paymentMethod = null
  }

  const updated = await db.order.update({ where: { id }, data, include: { items: true, table: true, cashier: { select: { name: true } } } })
  return Response.json({ order: updated })
}
