// Generate demo orders + returns for richer dashboard
import { db } from '../src/lib/db'

async function main() {
  console.log('🚀 Generating demo orders...')

  const cashier1 = await db.user.findUnique({ where: { username: 'cashier1' } })
  const cashier2 = await db.user.findUnique({ where: { username: 'cashier2' } })
  const tables = await db.table.findMany()
  const menu = await db.menuItem.findMany()

  if (!cashier1 || !cashier2 || menu.length === 0) {
    console.log('Missing seed data, run seed first')
    return
  }

  // Get last invoice number
  const lastOrder = await db.order.findFirst({ orderBy: { invoiceNumber: 'desc' } })
  let inv = lastOrder?.invoiceNumber || 20250000

  // Generate 30 orders across last 7 days with varied items
  const paymentMethods = ['CASH', 'CASH', 'CASH', 'VISA', 'VISA', 'OTHER']
  const now = new Date()

  for (let i = 0; i < 30; i++) {
    const daysAgo = Math.floor(Math.random() * 7)
    const hoursAgo = Math.floor(Math.random() * 12) + 9 // 9am-9pm
    const createdAt = new Date(now)
    createdAt.setDate(createdAt.getDate() - daysAgo)
    createdAt.setHours(hoursAgo, Math.floor(Math.random() * 60))

    // Pick 1-5 random items
    const numItems = Math.floor(Math.random() * 4) + 1
    const items = []
    let subtotal = 0
    for (let j = 0; j < numItems; j++) {
      const mi = menu[Math.floor(Math.random() * menu.length)]
      const qty = Math.floor(Math.random() * 3) + 1
      const lineTotal = mi.price * qty
      subtotal += lineTotal
      items.push({ menuItemId: mi.id, name: mi.name, price: mi.price, quantity: qty, total: lineTotal })
    }

    const taxRate = 0
    const taxAmount = subtotal * (taxRate / 100)
    const discountRate = Math.random() < 0.2 ? 5 : 0
    const discountAmount = subtotal * (discountRate / 100)
    const total = subtotal + taxAmount - discountAmount

    const isCancelled = Math.random() < 0.05 // 5% cancelled
    const useTable = Math.random() < 0.85 // 85% with table
    const table = useTable ? tables[Math.floor(Math.random() * tables.length)] : null
    const cashier = Math.random() < 0.5 ? cashier1 : cashier2
    const payment = paymentMethods[Math.floor(Math.random() * paymentMethods.length)]

    inv = inv + 1
    const order = await db.order.create({
      data: {
        invoiceNumber: inv,
        tableId: table?.id || null,
        cashierId: cashier.id,
        status: isCancelled ? 'CANCELLED' : 'PAID',
        paymentMethod: isCancelled ? null : payment,
        subtotal,
        taxRate,
        taxAmount,
        discountRate,
        discountAmount,
        total,
        createdAt,
        paidAt: isCancelled ? null : createdAt,
        cancelledAt: isCancelled ? new Date(createdAt.getTime() + 60000) : null,
        cancelReason: isCancelled ? 'عميل غيّر رأيه' : null,
        items: { create: items },
      },
    })
  }

  console.log(`  ✓ Created 30 demo orders`)

  // Create 2 returns
  const paidOrders = await db.order.findMany({
    where: { status: 'PAID' },
    include: { items: true },
    take: 2,
    orderBy: { createdAt: 'desc' },
  })
  for (const o of paidOrders) {
    if (o.items.length === 0) continue
    const item = o.items[0]
    await db.return.create({
      data: {
        orderId: o.id,
        returnedById: cashier1.id,
        reason: 'عميل لم يعجبه الصنف',
        totalRefund: item.price * item.quantity,
        items: {
          create: [{
            orderItemId: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            total: item.price * item.quantity,
          }],
        },
      },
    })
    console.log(`  ✓ Return for order #${o.invoiceNumber}`)
  }

  // Create a few employee payments
  const employees = await db.employee.findMany()
  for (const e of employees.slice(0, 4)) {
    const amount = Math.floor(e.salary * 0.5)
    await db.employeePayment.create({
      data: {
        employeeId: e.id,
        amount,
        date: new Date(),
        notes: 'سلفة على المرتب',
        paidById: cashier1.id,
      },
    })
  }
  console.log(`  ✓ Created 4 employee payments`)

  console.log('\n✅ Demo data generated!')
  console.log(`   Total orders: ${await db.order.count()}`)
  console.log(`   Total returns: ${await db.return.count()}`)
  console.log(`   Total payments: ${await db.employeePayment.count()}`)
}

main().catch(console.error).finally(() => db.$disconnect())
