import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

export const runtime = 'nodejs'

// GET /api/stats?range=today|week|month|year
// Returns current period stats + comparison with previous period (for trend arrows)
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return Response.json({ error: 'غير مصرح' }, { status: 401 })

  const url = new URL(req.url)
  const range = url.searchParams.get('range') || 'today'
  const now = new Date()
  const from = new Date()
  const prevFrom = new Date()
  const prevTo = new Date()

  // Set current period and equivalent previous period for comparison
  if (range === 'today') {
    from.setHours(0, 0, 0, 0)
    prevFrom.setDate(now.getDate() - 1)
    prevFrom.setHours(0, 0, 0, 0)
    prevTo.setDate(now.getDate() - 1)
    prevTo.setHours(23, 59, 59, 999)
  } else if (range === 'week') {
    from.setDate(now.getDate() - 7)
    prevFrom.setDate(now.getDate() - 14)
    prevTo.setDate(now.getDate() - 8)
  } else if (range === 'month') {
    from.setMonth(now.getMonth() - 1)
    prevFrom.setMonth(now.getMonth() - 2)
    prevTo.setDate(now.getDate() - 30)
  } else if (range === 'year') {
    from.setFullYear(now.getFullYear() - 1)
    prevFrom.setFullYear(now.getFullYear() - 2)
    prevTo.setFullYear(now.getFullYear() - 1)
  }

  // Cashiers: only their own
  const orderWhere: Record<string, unknown> = { createdAt: { gte: from } }
  if (user.role !== 'ADMIN') orderWhere.cashierId = user.id
  else orderWhere.status = 'PAID'

  const prevOrderWhere: Record<string, unknown> = {
    createdAt: { gte: prevFrom, lte: prevTo },
  }
  if (user.role !== 'ADMIN') prevOrderWhere.cashierId = user.id
  else prevOrderWhere.status = 'PAID'

  const [orders, prevOrders] = await Promise.all([
    db.order.findMany({ where: orderWhere, include: { items: true } }),
    db.order.findMany({ where: prevOrderWhere, include: { items: true } }),
  ])

  const paidOrders = orders.filter((o) => o.status === 'PAID')
  const cancelledOrders = orders.filter((o) => o.status === 'CANCELLED')
  const prevPaidOrders = prevOrders.filter((o) => o.status === 'PAID')

  const totalSales = paidOrders.reduce((s, o) => s + o.total, 0)
  const prevTotalSales = prevPaidOrders.reduce((s, o) => s + o.total, 0)
  const totalTax = paidOrders.reduce((s, o) => s + o.taxAmount, 0)
  const totalDiscount = paidOrders.reduce((s, o) => s + o.discountAmount, 0)
  const totalReturns = await db.return.aggregate({
    where: { createdAt: { gte: from } },
    _sum: { totalRefund: true },
  })

  // Top items (current period)
  const itemMap: Record<string, { name: string; qty: number; total: number }> = {}
  for (const o of paidOrders) {
    for (const it of o.items) {
      if (!itemMap[it.name]) itemMap[it.name] = { name: it.name, qty: 0, total: 0 }
      itemMap[it.name].qty += it.quantity
      itemMap[it.name].total += it.total
    }
  }

  // Top items (previous period) - for trend comparison
  const prevItemMap: Record<string, number> = {}
  for (const o of prevPaidOrders) {
    for (const it of o.items) {
      prevItemMap[it.name] = (prevItemMap[it.name] || 0) + it.quantity
    }
  }

  // Build top items with trend info
  const topItemsRaw = Object.values(itemMap).sort((a, b) => b.qty - a.qty).slice(0, 10)
  const maxQty = topItemsRaw.length > 0 ? topItemsRaw[0].qty : 1
  const topItems = topItemsRaw.map((it) => {
    const prevQty = prevItemMap[it.name] || 0
    const change = it.qty - prevQty
    const changePct = prevQty > 0 ? ((change / prevQty) * 100) : (it.qty > 0 ? 100 : 0)
    return {
      ...it,
      prevQty,
      change,
      changePct,
      trend: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
      pctOfMax: Math.round((it.qty / maxQty) * 100),
    }
  })

  // Payment method breakdown
  const paymentBreakdown: Record<string, number> = {}
  for (const o of paidOrders) {
    const m = o.paymentMethod || 'CASH'
    paymentBreakdown[m] = (paymentBreakdown[m] || 0) + o.total
  }

  // Admin-only: total staff salary, paid this month
  let staffStats = null
  if (user.role === 'ADMIN') {
    const totalSalary = await db.employee.aggregate({ _sum: { salary: true } })
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)
    const paidThisMonth = await db.employeePayment.aggregate({
      where: { date: { gte: monthStart } },
      _sum: { amount: true },
    })
    staffStats = {
      totalSalary: totalSalary._sum.salary || 0,
      paidThisMonth: paidThisMonth._sum.amount || 0,
    }
  }

  // Compute trend percentages for KPIs
  const salesTrendPct = prevTotalSales > 0 ? ((totalSales - prevTotalSales) / prevTotalSales) * 100 : 0
  const ordersTrendPct = prevPaidOrders.length > 0 ? ((paidOrders.length - prevPaidOrders.length) / prevPaidOrders.length) * 100 : 0
  const avgOrderValue = paidOrders.length > 0 ? totalSales / paidOrders.length : 0
  const prevAvgOrderValue = prevPaidOrders.length > 0 ? prevTotalSales / prevPaidOrders.length : 0
  const avgOrderTrendPct = prevAvgOrderValue > 0 ? ((avgOrderValue - prevAvgOrderValue) / prevAvgOrderValue) * 100 : 0

  return Response.json({
    range,
    from,
    to: now,
    prevFrom,
    prevTo,
    orderCount: orders.length,
    paidCount: paidOrders.length,
    cancelledCount: cancelledOrders.length,
    totalSales,
    prevTotalSales,
    salesTrendPct,
    avgOrderValue,
    avgOrderTrendPct,
    ordersTrendPct,
    totalTax,
    totalDiscount,
    totalReturns: totalReturns._sum.totalRefund || 0,
    netSales: totalSales - (totalReturns._sum.totalRefund || 0),
    topItems,
    paymentBreakdown,
    staffStats,
  })
}
