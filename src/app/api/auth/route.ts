import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createSession, getSessionUser, hashPassword } from '@/lib/auth'

export const runtime = 'nodejs'
export const SESSION_COOKIE = 'laguna_session'

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ user: null })
  return NextResponse.json({
    user: { id: user.id, name: user.name, role: user.role, username: user.username },
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { action } = body

  if (action === 'logout') {
    return NextResponse.json(
      { ok: true },
      {
        headers: {
          'Set-Cookie': `${SESSION_COOKIE}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT`,
        },
      }
    )
  }

  // LOGIN
  const { username, password } = body
  if (!username || !password) {
    return NextResponse.json({ error: 'اسم المستخدم وكلمة المرور مطلوبان' }, { status: 400 })
  }
  const user = await db.user.findUnique({ where: { username } })
  if (!user) return NextResponse.json({ error: 'بيانات الدخول غير صحيحة' }, { status: 401 })
  if (!user.active) return NextResponse.json({ error: 'الحساب موقوف' }, { status: 403 })

  // Accept plaintext password OR hashed (sha256)
  const passOk = user.password === password || hashPassword(password) === user.password
  if (!passOk) {
    return NextResponse.json({ error: 'بيانات الدخول غير صحيحة' }, { status: 401 })
  }

  // If password was stored as plaintext, hash it now (lazy migration)
  if (user.password === password) {
    await db.user.update({ where: { id: user.id }, data: { password: hashPassword(password) } })
  }

  const token = await createSession(user.id)
  const expires = new Date()
  expires.setDate(expires.getDate() + 7)
  return NextResponse.json(
    { user: { id: user.id, name: user.name, role: user.role, username: user.username } },
    {
      headers: {
        'Set-Cookie': `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Expires=${expires.toUTCString()}`,
      },
    }
  )
}
