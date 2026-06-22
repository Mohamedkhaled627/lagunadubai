'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Logo, WaveDivider } from './shared/logo'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from './use-auth'

export function LoginView() {
  const { toast } = useToast()
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const user = await login(username, password)
      toast({ title: 'تم تسجيل الدخول', description: `مرحباً ${user.name}` })
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'فشل الدخول', description: e.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-lagoon/10 via-background to-sand/20">
      {/* Hero header */}
      <div className="laguna-gradient text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'radial-gradient(circle at 30% 50%, white 1px, transparent 1px), radial-gradient(circle at 70% 30%, white 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />
        <div className="max-w-md mx-auto px-6 pt-12 pb-8 relative">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="bg-white rounded-full p-2 shadow-2xl">
              <Logo size={88} />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tight">لاجونا</h1>
              <p className="text-sm text-white/80 mt-1">كافيه · على البحر مباشرة</p>
            </div>
          </div>
        </div>
        <WaveDivider />
      </div>

      {/* Login form */}
      <div className="flex-1 flex items-start justify-center px-4 pt-4 pb-12">
        <Card className="w-full max-w-md shadow-xl border-ocean/10">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl text-ocean">تسجيل الدخول</CardTitle>
            <p className="text-sm text-muted-foreground">اختر حسابك للدخول إلى النظام</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">اسم المستخدم</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin / cashier1"
                  autoComplete="username"
                  className="h-12 text-lg"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">كلمة المرور</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••"
                  autoComplete="current-password"
                  className="h-12 text-lg"
                  required
                />
              </div>
              <Button
                type="submit"
                size="lg"
                disabled={loading}
                className="w-full h-12 text-lg laguna-gradient hover:opacity-90 text-white border-0"
              >
                {loading ? 'جاري الدخول...' : 'دخول'}
              </Button>
            </form>

            <div className="mt-6 pt-4 border-t border-border/60 text-center">
              <p className="text-xs text-muted-foreground">
                لتسجيل الدخول، استخدم اسم المستخدم وكلمة المرور الخاصة بك
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
