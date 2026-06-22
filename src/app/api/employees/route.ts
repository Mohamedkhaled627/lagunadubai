import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

export const runtime = 'nodejs'

// GET /api/employees - available to both ADMIN and CASHIER
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return Response.json({ error: 'غير مصرح' }, { status: 401 })

  const employees = await db.employee.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { attendance: true, payments: true } },
    },
  })
  // Include total paid
  const enriched = await Promise.all(
    employees.map(async (e) => {
      const totalPaid = await db.employeePayment.aggregate({
        where: { employeeId: e.id },
        _sum: { amount: true },
      })
      return {
        ...e,
        totalPaid: totalPaid._sum.amount || 0,
      }
    })
  )
  return Response.json({ employees: enriched, actor: { id: user.id, name: user.name, role: user.role } })
}

// POST - create or update employee (ADMIN and CASHIER allowed)
export async function POST(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return Response.json({ error: 'غير مصرح' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { id, name, role, phone, salary, active } = body
  if (!name) return Response.json({ error: 'الاسم مطلوب' }, { status: 400 })

  let employee
  if (id) {
    employee = await db.employee.update({
      where: { id },
      data: {
        name,
        role: role || 'موظف',
        phone: phone || null,
        salary: Number(salary) || 0,
        active: typeof active === 'boolean' ? active : true,
      },
    })
  } else {
    employee = await db.employee.create({
      data: {
        name,
        role: role || 'موظف',
        phone: phone || null,
        salary: Number(salary) || 0,
        active: typeof active === 'boolean' ? active : true,
      },
    })
  }
  return Response.json({ employee, actor: { id: user.id, name: user.name, role: user.role } })
}

// DELETE - hard delete (cascades attendance/payments); available to ADMIN and CASHIER
export async function DELETE(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return Response.json({ error: 'غير مصرح' }, { status: 401 })

  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  const soft = url.searchParams.get('soft') === '1'
  if (!id) return Response.json({ error: 'معرف الموظف مطلوب' }, { status: 400 })

  if (soft) {
    // Soft delete: just mark as inactive (keeps history)
    await db.employee.update({ where: { id }, data: { active: false } })
  } else {
    // Hard delete: actually remove the employee and all related records
    await db.employee.delete({ where: { id } })
  }
  return Response.json({ ok: true, actor: { id: user.id, name: user.name, role: user.role } })
}
