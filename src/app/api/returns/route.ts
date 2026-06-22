import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

export const runtime = 'nodejs'

// GET /api/returns?orderId=
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return Response.json({ error: 'غير مصرح' }, { status: 401 })
  const url = new URL(req.url)
  const orderId = url.searchParams.get('orderId')
  const where: Record<string, unknown> = {}
  if (orderId) where.orderId = orderId
  if (user.role !== 'ADMIN') where.returnedById = user.id

  const returns = await db.return.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      items: true,
      order: { include: { table: true, cashier: { select: { name: true } } } },
      returnedBy: { select: { name: true, username: true } },
    },
  })
  return Response.json({ returns })
}

// POST /api/returns
export async function POST(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return Response.json({ error: 'غير مصرح' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const { orderId, reason, items } = body
  if (!orderId) return Response.json({ error: 'الفاتورة مطلوبة' }, { status: 400 })
  if (!Array.isArray(items) || items.length === 0) return Response.json({ error: 'حدد أصناف المرتجع' }, { status: 400 })

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  })
  if (!order) return Response.json({ error: 'الفاتورة غير موجودة' }, { status: 404 })
  if (order.status !== 'PAID') return Response.json({ error: 'فقط الفواتير المدفوعة يمكن إرجاعها' }, { status: 400 })

  // Validate items belong to order and qty valid
  let totalRefund = 0
  const returnItems = []
  for (const ri of items) {
    const oi = order.items.find((o) => o.id === ri.orderItemId)
    if (!oi) return Response.json({ error: 'صنف غير موجود في الفاتورة' }, { status: 400 })
    const qty = Number(ri.quantity)
    if (qty <= 0 || qty > oi.quantity) return Response.json({ error: `الكمية غير صحيحة للصنف ${oi.name}` }, { status: 400 })
    const lineTotal = oi.price * qty
    totalRefund += lineTotal
    returnItems.push({
      orderItemId: oi.id,
      name: oi.name,
      price: oi.price,
      quantity: qty,
      total: lineTotal,
    })
  }

  const ret = await db.return.create({
    data: {
      orderId,
      returnedById: user.id,
      reason: reason || 'مرتجع',
      totalRefund,
      items: { create: returnItems },
    },
    include: { items: true, order: { include: { table: true } } },
  })

  return Response.json({ return: ret })
}
