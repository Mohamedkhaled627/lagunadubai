import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

export const runtime = 'nodejs'

// GET /api/orders?status=&from=&to=&cashierId=&tableId=
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return Response.json({ error: 'غير مصرح' }, { status: 401 })

  const url = new URL(req.url)
  const status = url.searchParams.get('status')
  const from = url.searchParams.get('from')
  const to = url.searchParams.get('to')
  const cashierId = url.searchParams.get('cashierId')
  const tableId = url.searchParams.get('tableId')
  const limit = Number(url.searchParams.get('limit') || 200)

  // Cashiers see only their own orders; admins see all
  const where: Record<string, unknown> = {}
  if (status) where.status = status
  if (cashierId) where.cashierId = cashierId
  if (tableId) where.tableId = tableId
  if (user.role !== 'ADMIN') where.cashierId = user.id
  if (from || to) {
    where.createdAt = {}
    if (from) (where.createdAt as Record<string, unknown>).gte = new Date(from)
    if (to) (where.createdAt as Record<string, unknown>).lte = new Date(to)
  }

  const orders = await db.order.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      items: true,
      table: true,
      cashier: { select: { id: true, name: true, username: true } },
      returns: { include: { items: true } },
    },
  })
  return Response.json({ orders })
}

// POST /api/orders  - create new order (cashier or admin)
export async function POST(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return Response.json({ error: 'غير مصرح' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { tableId, items, paymentMethod, status, taxRate, discountRate, notes } = body

  if (!Array.isArray(items) || items.length === 0) {
    return Response.json({ error: 'لا يمكن إنشاء فاتورة فارغة' }, { status: 400 })
  }

  // Build order items
  const orderItems = []
  let subtotal = 0
  for (const it of items) {
    const qty = Number(it.quantity) || 1
    let name = it.name
    let price = Number(it.price)
    let menuItemId = it.menuItemId || null
    if (menuItemId) {
      const mi = await db.menuItem.findUnique({ where: { id: menuItemId } })
      if (mi) {
        name = mi.name
        price = mi.price
      }
    }
    const lineTotal = price * qty
    subtotal += lineTotal
    orderItems.push({ menuItemId, name, price, quantity: qty, total: lineTotal })
  }

  const tRate = Number(taxRate) || 0
  const dRate = Number(discountRate) || 0
  const taxAmount = subtotal * (tRate / 100)
  const discountAmount = subtotal * (dRate / 100)
  const total = subtotal + taxAmount - discountAmount

  // Generate invoice number
  const lastOrder = await db.order.findFirst({ orderBy: { invoiceNumber: 'desc' } })
  const nextInv = (lastOrder?.invoiceNumber || 20250000) + 1

  const finalStatus = status || 'PAID'
  const order = await db.order.create({
    data: {
      invoiceNumber: nextInv,
      tableId: tableId || null,
      cashierId: user.id,
      status: finalStatus,
      paymentMethod: paymentMethod || (finalStatus === 'PAID' ? 'CASH' : null),
      subtotal,
      taxRate: tRate,
      taxAmount,
      discountRate: dRate,
      discountAmount,
      total,
      notes: notes || null,
      paidAt: finalStatus === 'PAID' ? new Date() : null,
      items: { create: orderItems },
    },
    include: {
      items: true,
      table: true,
      cashier: { select: { id: true, name: true, username: true } },
    },
  })

  return Response.json({ order })
}
