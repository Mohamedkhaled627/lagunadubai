import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

export const runtime = 'nodejs'

// GET /api/stats/sales-over-time?range=today|week|month|year
// Returns daily/hourly sales data for charts
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return Response.json({ error: 'غير مصرح' }, { status: 401 })

  const url = new URL(req.url)
  const range = url.searchParams.get('range') || 'today'
  const now = new Date()
  const from = new Date()

  if (range === 'today') {
    from.setHours(0, 0, 0, 0)
  } else if (range === 'week') {
    from.setDate(now.getDate() - 7)
  } else if (range === 'month') {
    from.setMonth(now.getMonth() - 1)
  } else if (range === 'year') {
    from.setFullYear(now.getFullYear() - 1)
  }

  const orderWhere: Record<string, unknown> = {
    createdAt: { gte: from },
    status: 'PAID',
  }
  if (user.role !== 'ADMIN') orderWhere.cashierId = user.id

  const orders = await db.order.findMany({
    where: orderWhere,
    select: { total: true, createdAt: true, paymentMethod: true },
  })

  // Group by day (or hour for today)
  type Point = { label: string; sales: number; orders: number; date: string }
  const points: Point[] = []

  if (range === 'today') {
    // Group by hour
    for (let h = 0; h < 24; h++) {
      const hourStart = new Date(now)
      hourStart.setHours(h, 0, 0, 0)
      const hourEnd = new Date(now)
      hourEnd.setHours(h, 59, 59, 999)
      const dayOrders = orders.filter((o) => {
        const d = new Date(o.createdAt)
        return d >= hourStart && d <= hourEnd && d.toDateString() === now.toDateString()
      })
      const period12 = h === 0 ? 12 : h > 12 ? h - 12 : h
      const ampm = h < 12 ? 'ص' : 'م'
      points.push({
        label: `${period12}${ampm}`,
        sales: dayOrders.reduce((s, o) => s + o.total, 0),
        orders: dayOrders.length,
        date: hourStart.toISOString(),
      })
    }
  } else {
    // Group by day
    const days = range === 'week' ? 7 : range === 'month' ? 30 : 365
    for (let d = days - 1; d >= 0; d--) {
      const dayStart = new Date(now)
      dayStart.setDate(now.getDate() - d)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(now)
      dayEnd.setDate(now.getDate() - d)
      dayEnd.setHours(23, 59, 59, 999)
      const dayOrders = orders.filter((o) => {
        const od = new Date(o.createdAt)
        return od >= dayStart && od <= dayEnd
      })
      const label = dayStart.toLocaleDateString('ar-EG', range === 'year' ? { month: 'short' } : { day: 'numeric', month: 'short' })
      points.push({
        label,
        sales: dayOrders.reduce((s, o) => s + o.total, 0),
        orders: dayOrders.length,
        date: dayStart.toISOString(),
      })
    }
  }

  return Response.json({ points, range })
}
