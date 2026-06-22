// Database seed script for Laguna Café POS
// Run with: bun run /home/z/my-project/scripts/seed.ts
import { db } from '../src/lib/db'
import { MENU_CATEGORIES } from '../src/lib/menu-data'
import * as fs from 'fs'

// Load image pool
const imagePool: Record<string, string[]> = JSON.parse(
  fs.readFileSync('/home/z/my-project/scripts/menu-images.json', 'utf-8')
)

// Fallback per-category image if pool is missing
const FALLBACK_IMG: Record<string, string> = {
  coffee: 'https://sfile.chatglm.cn/images-ppt/coffee.jpg',
  tea: 'https://sfile.chatglm.cn/images-ppt/tea.jpg',
}

async function main() {
  console.log('🚀 Seeding database...')

  // 1) Users: 1 admin + 2 cashiers
  const users = [
    { username: 'admin', password: 'Laguna@2026', name: 'المدير العام', role: 'ADMIN' },
    { username: 'cashier1', password: 'Cashier@2026', name: 'أحمد محمد', role: 'CASHIER' },
    { username: 'cashier2', password: 'Cashier@2026', name: 'محمود علي', role: 'CASHIER' },
  ]
  for (const u of users) {
    const existing = await db.user.findUnique({ where: { username: u.username } })
    if (!existing) {
      await db.user.create({ data: u })
      console.log(`  ✓ User: ${u.username} (${u.role})`)
    } else {
      console.log(`  - User exists: ${u.username}`)
    }
  }

  // 2) Tables (20 tables)
  const tableCount = await db.table.count()
  if (tableCount === 0) {
    for (let i = 1; i <= 20; i++) {
      const qrToken = `LAGUNA-T${String(i).padStart(2, '0')}-${Math.random().toString(36).slice(2, 8)}`
      await db.table.create({
        data: {
          name: `ترابيزة ${i}`,
          number: i,
          qrToken,
          seats: i <= 5 ? 2 : i <= 15 ? 4 : 6,
        },
      })
    }
    console.log('  ✓ 20 tables created')
  } else {
    console.log(`  - Tables already exist: ${tableCount}`)
  }

  // 3) Categories & Menu Items
  const catCount = await db.category.count()
  if (catCount === 0) {
    for (let i = 0; i < MENU_CATEGORIES.length; i++) {
      const c = MENU_CATEGORIES[i]
      const images = imagePool[c.key] || []
      const category = await db.category.create({
        data: {
          name: c.key,
          nameAr: c.nameAr,
          icon: c.icon,
          coverUrl: images[0] || null,
          sortOrder: i,
        },
      })
      for (let j = 0; j < c.items.length; j++) {
        const item = c.items[j]
        const imgUrl = images.length > 0 ? images[j % images.length] : null
        await db.menuItem.create({
          data: {
            name: item.name,
            nameAr: item.name,
            price: item.price,
            categoryId: category.id,
            imageUrl: imgUrl,
            sortOrder: j,
          },
        })
      }
      console.log(`  ✓ Category: ${c.nameAr} (${c.items.length} items)`)
    }
  } else {
    console.log(`  - Categories already exist: ${catCount}`)
  }

  // 4) Settings
  await db.setting.upsert({
    where: { key: 'TAX_RATE' },
    create: { id: 'tax', key: 'TAX_RATE', value: '0' },
    update: {},
  })
  await db.setting.upsert({
    where: { key: 'CAFE_NAME' },
    create: { id: 'cafe', key: 'CAFE_NAME', value: 'لاجونا كافيه' },
    update: {},
  })
  await db.setting.upsert({
    where: { key: 'CAFE_ADDRESS' },
    create: { id: 'addr', key: 'CAFE_ADDRESS', value: 'الكورنيش - على البحر مباشرة' },
    update: {},
  })
  await db.setting.upsert({
    where: { key: 'CAFE_PHONE' },
    create: { id: 'phone', key: 'CAFE_PHONE', value: '01000000000' },
    update: {},
  })

  // 5) Sample employees
  const empCount = await db.employee.count()
  if (empCount === 0) {
    const employees = [
      { name: 'أحمد محمد', role: 'كاشير', phone: '01000000001', salary: 6000 },
      { name: 'محمود علي', role: 'كاشير', phone: '01000000002', salary: 6000 },
      { name: 'سعيد إبراهيم', role: 'ويتر', phone: '01000000003', salary: 5000 },
      { name: 'كريم حسن', role: 'ويتر', phone: '01000000004', salary: 5000 },
      { name: 'محمد عبد الله', role: 'باريستا', phone: '01000000005', salary: 7000 },
      { name: 'عمر خالد', role: 'مطبخ', phone: '01000000006', salary: 5500 },
    ]
    for (const e of employees) {
      await db.employee.create({ data: e })
    }
    console.log('  ✓ 6 employees created')
  } else {
    console.log(`  - Employees already exist: ${empCount}`)
  }

  // 6) Sample attendance for last 7 days
  const attCount = await db.attendance.count()
  if (attCount === 0) {
    const allEmps = await db.employee.findMany()
    const today = new Date()
    for (let d = 6; d >= 0; d--) {
      const date = new Date(today)
      date.setDate(today.getDate() - d)
      date.setHours(0, 0, 0, 0)
      for (const emp of allEmps) {
        // Random presence pattern
        const rnd = Math.random()
        const checkIn = new Date(date)
        checkIn.setHours(9 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60))
        const checkOut = new Date(date)
        checkOut.setHours(17 + Math.floor(Math.random() * 3), Math.floor(Math.random() * 60))
        let status = 'PRESENT'
        if (rnd < 0.1) status = 'ABSENT'
        else if (rnd < 0.2) status = 'LATE'
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
    console.log('  ✓ 7 days of attendance created')
  }

  console.log('\n✅ Seed complete!')
  console.log('   Admin login:    admin / admin123')
  console.log('   Cashier login:  cashier1 / cash123')
  console.log('   Cashier login:  cashier2 / cash123')
}

main()
  .catch((e) => {
    console.error('Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
