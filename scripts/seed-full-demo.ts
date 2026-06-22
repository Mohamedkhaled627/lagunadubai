// Generate comprehensive demo data for the admin dashboard
import { db } from '../src/lib/db'

async function main() {
  console.log('🚀 Generating comprehensive demo data...')

  const cashier1 = await db.user.findUnique({ where: { username: 'cashier1' } })
  const cashier2 = await db.user.findUnique({ where: { username: 'cashier2' } })
  const admin = await db.user.findUnique({ where: { username: 'admin' } })
  const tables = await db.table.findMany()
  const menu = await db.menuItem.findMany()
  const employees = await db.employee.findMany()

  if (!cashier1 || !cashier2 || menu.length === 0 || tables.length === 0) {
    console.log('Missing base data, run seed first')
    return
  }

  const lastOrder = await db.order.findFirst({ orderBy: { invoiceNumber: 'desc' } })
  let inv = lastOrder?.invoiceNumber || 20250000
  const now = new Date()

  // ===== 1. Generate 80 orders across last 30 days =====
  console.log('📊 Generating 80 orders...')
  const paymentMethods = ['CASH', 'CASH', 'CASH', 'CASH', 'VISA', 'VISA', 'VISA', 'OTHER']
  const existingOrdersCount = await db.order.count()
  const targetOrders = 80

  for (let i = existingOrdersCount; i < targetOrders; i++) {
    const daysAgo = Math.floor(Math.random() * 30)
    const hoursAgo = Math.floor(Math.random() * 14) + 8 // 8am-10pm
    const createdAt = new Date(now)
    createdAt.setDate(createdAt.getDate() - daysAgo)
    createdAt.setHours(hoursAgo, Math.floor(Math.random() * 60))

    const numItems = Math.floor(Math.random() * 5) + 1
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
    const discountRate = Math.random() < 0.15 ? 5 : 0
    const discountAmount = subtotal * (discountRate / 100)
    const total = subtotal + taxAmount - discountAmount

    const isCancelled = Math.random() < 0.03 // 3% cancelled
    const useTable = Math.random() < 0.85
    const table = useTable ? tables[Math.floor(Math.random() * tables.length)] : null
    const cashier = Math.random() < 0.5 ? cashier1 : cashier2
    const payment = paymentMethods[Math.floor(Math.random() * paymentMethods.length)]

    inv = inv + 1
    await db.order.create({
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
  console.log(`  ✓ Total orders now: ${await db.order.count()}`)

  // ===== 2. Generate returns for 8 paid orders =====
  console.log('↩️ Generating returns...')
  const paidOrders = await db.order.findMany({
    where: { status: 'PAID', returns: { none: {} } },
    include: { items: true },
    take: 8,
    orderBy: { createdAt: 'desc' },
  })
  const returnReasons = ['عميل لم يعجبه الصنف', 'صنف تالف', 'طلب خاطئ', 'تأخر الطلب', 'العميل غادر قبل الاستلام']
  let returnsCount = 0
  for (const o of paidOrders) {
    if (o.items.length === 0) continue
    // Return 1-2 items
    const itemsToReturn = o.items.slice(0, Math.min(2, o.items.length))
    let totalRefund = 0
    const returnItems = itemsToReturn.map((it) => {
      const qty = Math.min(it.quantity, Math.floor(Math.random() * 2) + 1)
      totalRefund += it.price * qty
      return {
        orderItemId: it.id,
        name: it.name,
        price: it.price,
        quantity: qty,
        total: it.price * qty,
      }
    })
    await db.return.create({
      data: {
        orderId: o.id,
        returnedById: cashier1.id,
        reason: returnReasons[Math.floor(Math.random() * returnReasons.length)],
        totalRefund,
        items: { create: returnItems },
        createdAt: new Date(o.createdAt.getTime() + 3600000), // 1h after order
      },
    })
    returnsCount++
  }
  console.log(`  ✓ Created ${returnsCount} returns`)

  // ===== 3. Generate employee payments =====
  console.log('💰 Generating employee payments...')
  const paymentsCount = await db.employeePayment.count()
  if (paymentsCount < 15) {
    for (let i = 0; i < 15; i++) {
      const emp = employees[Math.floor(Math.random() * employees.length)]
      const isSalary = Math.random() < 0.4
      const amount = isSalary ? emp.salary : Math.floor(emp.salary * (0.1 + Math.random() * 0.3))
      const date = new Date(now)
      date.setDate(date.getDate() - Math.floor(Math.random() * 25))
      await db.employeePayment.create({
        data: {
          employeeId: emp.id,
          amount,
          date,
          notes: isSalary ? 'صرف مرتب كامل' : 'سلفة على المرتب',
          paidById: admin.id,
        },
      })
    }
    console.log(`  ✓ Created 15 payments`)
  }

  // ===== 4. Generate attendance for all employees for last 14 days =====
  console.log('📅 Generating attendance...')
  const existingAtt = await db.attendance.count()
  if (existingAtt < 100) {
    for (let d = 13; d >= 0; d--) {
      const date = new Date(now)
      date.setDate(date.getDate() - d)
      date.setHours(0, 0, 0, 0)
      for (const emp of employees) {
        if (!emp.active) continue
        // Skip if already exists
        const exists = await db.attendance.findFirst({ where: { employeeId: emp.id, date } })
        if (exists) continue

        const rnd = Math.random()
        const checkIn = new Date(date)
        checkIn.setHours(9 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60))
        const checkOut = new Date(date)
        checkOut.setHours(17 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 60))

        let status = 'PRESENT'
        if (rnd < 0.08) status = 'ABSENT'
        else if (rnd < 0.18) status = 'LATE'

        await db.attendance.create({
          data: {
            employeeId: emp.id,
            date,
            checkIn: status === 'ABSENT' ? null : checkIn,
            checkOut: status === 'ABSENT' ? null : checkOut,
            status,
          },
        })
      }
    }
    console.log(`  ✓ Attendance records: ${await db.attendance.count()}`)
  }

  // ===== 5. Update settings with realistic data =====
  await db.setting.upsert({
    where: { key: 'CAFE_NAME' },
    create: { id: 'cafe', key: 'CAFE_NAME', value: 'لاجونا كافيه' },
    update: { value: 'لاجونا كافيه' },
  })
  await db.setting.upsert({
    where: { key: 'CAFE_ADDRESS' },
    create: { id: 'addr', key: 'CAFE_ADDRESS', value: 'الكورنيش - على البحر مباشرة' },
    update: { value: 'الكورنيش - على البحر مباشرة' },
  })
  await db.setting.upsert({
    where: { key: 'CAFE_PHONE' },
    create: { id: 'phone', key: 'CAFE_PHONE', value: '01000000000' },
    update: { value: '01000000000' },
  })
  await db.setting.upsert({
    where: { key: 'TAX_RATE' },
    create: { id: 'tax', key: 'TAX_RATE', value: '14' },
    update: { value: '14' },
  })

  // ===== Final summary =====
  console.log('\n✅ Demo data complete!')
  console.log(`   Orders: ${await db.order.count()}`)
  console.log(`   Returns: ${await db.return.count()}`)
  console.log(`   Payments: ${await db.employeePayment.count()}`)
  console.log(`   Attendance: ${await db.attendance.count()}`)
  console.log(`   Tables: ${await db.table.count()}`)
  console.log(`   Employees: ${await db.employee.count()}`)
}

main()
  .catch((e) => {
    console.error('Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
