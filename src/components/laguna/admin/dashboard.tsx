'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { fmtMoney, fmtDate } from '@/lib/format'
import { api } from '../use-auth'
import {
  TrendingUp, TrendingDown, Minus, Receipt, Wallet, Undo2, Users,
  CreditCard, Clock, ArrowUpRight, ArrowDownRight, Trophy, BarChart3, Activity, PieChart as PieIcon, LineChart
} from 'lucide-react'
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, AreaChart, Area, Tooltip, Legend,
} from 'recharts'

const PAYMENT_COLORS_HEX: Record<string, string> = {
  CASH: '#10b981',  // green
  VISA: '#3b82f6',  // blue
  OTHER: '#f59e0b', // amber
}
const PAYMENT_LABELS: Record<string, string> = { CASH: 'كاش', VISA: 'فيزا', OTHER: 'أخرى' }

export function AdminDashboard({ user }: { user: any }) {
  const [stats, setStats] = useState<any>(null)
  const [salesOverTime, setSalesOverTime] = useState<any[]>([])
  const [range, setRange] = useState<'today' | 'week' | 'month' | 'year'>('today')

  useEffect(() => {
    api(`/api/stats?range=${range}`).then(setStats)
    api<{ points: any[] }>(`/api/stats/sales-over-time?range=${range}`).then((d) => setSalesOverTime(d.points || []))
  }, [range])

  if (!stats) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <Activity className="w-10 h-10 mx-auto mb-3 animate-pulse opacity-50" />
        جاري تحميل الإحصائيات...
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-black text-ocean">مرحباً {user.name} 👋</h1>
          <p className="text-sm text-muted-foreground">نظرة عامة على أداء الكافيه مع مؤشرات التغيّر والرسوم البيانية</p>
        </div>
        <div className="flex gap-1 bg-muted/40 rounded-xl p-1">
          {(['today', 'week', 'month', 'year'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
                range === r ? 'bg-white shadow-md text-ocean' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {r === 'today' ? 'اليوم' : r === 'week' ? 'الأسبوع' : r === 'month' ? 'الشهر' : 'السنة'}
            </button>
          ))}
        </div>
      </div>

      {/* Top KPIs with trend arrows */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          title="إجمالي المبيعات"
          value={fmtMoney(stats.totalSales)}
          icon={<TrendingUp className="w-5 h-5" />}
          color="from-green-500 to-emerald-600"
          trendPct={stats.salesTrendPct}
          subtitle={`الفترة السابقة: ${fmtMoney(stats.prevTotalSales)}`}
        />
        <KpiCard
          title="عدد الفواتير"
          value={`${stats.paidCount}`}
          icon={<Receipt className="w-5 h-5" />}
          color="from-blue-500 to-ocean"
          trendPct={stats.ordersTrendPct}
          subtitle={`${stats.cancelledCount} ملغية`}
        />
        <KpiCard
          title="متوسط الفاتورة"
          value={fmtMoney(stats.avgOrderValue)}
          icon={<BarChart3 className="w-5 h-5" />}
          color="from-purple-500 to-violet-600"
          trendPct={stats.avgOrderTrendPct}
          subtitle="لكل فاتورة مدفوعة"
        />
        <KpiCard
          title="صافي المبيعات"
          value={fmtMoney(stats.netSales)}
          icon={<Wallet className="w-5 h-5" />}
          color="from-amber-500 to-orange-600"
          trendPct={stats.salesTrendPct}
          subtitle={`بعد ${fmtMoney(stats.totalReturns)} مرتجع`}
        />
      </div>

      {/* Sales Over Time - Area Chart (data flow) */}
      <Card className="border-ocean/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <LineChart className="w-5 h-5 text-ocean" />
            تدفّق المبيعات
            <Badge variant="secondary" className="text-xs mr-auto">
              {range === 'today' ? 'ساعة بساعة' : 'يوم بيوم'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {salesOverTime.length === 0 || salesOverTime.every((p) => p.sales === 0) ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Activity className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>لا توجد مبيعات في هذه الفترة</p>
              </div>
            </div>
          ) : (
            <div className="h-72 w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesOverTime} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0d4a5c" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#0d4a5c" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="ordersGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6b7280' }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} />
                  <Tooltip
                    contentStyle={{
                      direction: 'rtl',
                      borderRadius: '12px',
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      fontSize: '13px',
                    }}
                    formatter={(value: any, name: any) => {
                      if (name === 'sales') return [fmtMoney(value), 'المبيعات']
                      return [value, 'الفواتير']
                    }}
                  />
                  <Legend formatter={(value) => (value === 'sales' ? 'المبيعات' : 'الفواتير')} />
                  <Area
                    type="monotone"
                    dataKey="sales"
                    stroke="#0d4a5c"
                    strokeWidth={2.5}
                    fill="url(#salesGradient)"
                    name="sales"
                  />
                  <Area
                    type="monotone"
                    dataKey="orders"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#ordersGradient)"
                    name="orders"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Two columns: Bar chart for top items + Pie chart for payment methods */}
      <div className="grid lg:grid-cols-2 gap-3">
        {/* Bar chart for top items */}
        <Card className="border-ocean/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-ocean" />
              الأصناف الأكثر طلباً (رسم بياني)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.topItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">لا توجد مبيعات</p>
            ) : (
              <div className="h-72 w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stats.topItems.slice(0, 8).map((it: any, i: number) => ({
                      name: it.name.length > 12 ? it.name.substring(0, 12) + '…' : it.name,
                      qty: it.qty,
                      revenue: it.total,
                      fill: i === 0 ? '#f59e0b' : i === 1 ? '#9ca3af' : i === 2 ? '#fb923c' : '#0d4a5c',
                    }))}
                    layout="vertical"
                    margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#6b7280' }} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={90}
                      tick={{ fontSize: 11, fill: '#374151' }}
                      orientation="right"
                    />
                    <Tooltip
                      contentStyle={{
                        direction: 'rtl',
                        borderRadius: '12px',
                        border: '1px solid #e5e7eb',
                        fontSize: '13px',
                      }}
                      formatter={(value: any, name: any) => {
                        if (name === 'qty') return [`${value} مبيع`, 'الكمية']
                        return [fmtMoney(value), 'الإيراد']
                      }}
                    />
                    <Bar dataKey="qty" radius={[0, 8, 8, 0]} name="qty">
                      {stats.topItems.slice(0, 8).map((_: any, i: number) => (
                        <Cell key={i} fill={i === 0 ? '#f59e0b' : i === 1 ? '#9ca3af' : i === 2 ? '#fb923c' : '#0d4a5c'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pie chart for payment methods */}
        <Card className="border-ocean/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-ocean" />
              توزيع طرق الدفع
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(stats.paymentBreakdown).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">لا توجد بيانات</p>
            ) : (
              <div className="h-72 w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={Object.entries(stats.paymentBreakdown).map(([m, total]: any) => ({
                        name: PAYMENT_LABELS[m] || m,
                        value: total,
                        key: m,
                      }))}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      innerRadius={45}
                      paddingAngle={3}
                      label={(entry: any) => `${entry.name}: ${(entry.percent * 100).toFixed(0)}%`}
                      labelLine={false}
                      style={{ fontSize: '12px', fontWeight: 'bold' }}
                    >
                      {Object.entries(stats.paymentBreakdown).map(([m]: any) => (
                        <Cell key={m} fill={PAYMENT_COLORS_HEX[m] || '#9ca3af'} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        direction: 'rtl',
                        borderRadius: '12px',
                        border: '1px solid #e5e7eb',
                        fontSize: '13px',
                      }}
                      formatter={(value: any) => [fmtMoney(value), 'المبلغ']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top items - bar list with trend arrows (keep the list version too) */}
      <Card className="border-ocean/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            الأصناف الأكثر طلباً
            <Badge variant="secondary" className="text-xs mr-auto">مقارنة بالفترة السابقة</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.topItems.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">لا توجد مبيعات في هذه الفترة</p>
          ) : (
            <div className="space-y-3">
              {stats.topItems.map((it: any, i: number) => (
                <TopItemRow key={i} item={it} rank={i} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Staff stats */}
      {stats.staffStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <KpiCard
            title="إجمالي مرتبات الموظفين"
            value={fmtMoney(stats.staffStats.totalSalary)}
            icon={<Users className="w-5 h-5" />}
            color="from-purple-500 to-violet-600"
            subtitle="شهرياً"
          />
          <KpiCard
            title="المصروف هذا الشهر"
            value={fmtMoney(stats.staffStats.paidThisMonth)}
            icon={<Wallet className="w-5 h-5" />}
            color="from-red-500 to-rose-600"
            subtitle="مسلم للموظفين"
          />
          <KpiCard
            title="صافي الربح التقديري"
            value={fmtMoney(stats.netSales - stats.staffStats.paidThisMonth)}
            icon={<TrendingUp className="w-5 h-5" />}
            color="from-emerald-500 to-teal-600"
            subtitle="مبيعات - مصروفات"
          />
        </div>
      )}

      {/* Period summary */}
      <Card className="bg-muted/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4 text-ocean" />
            ملخص الفترة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">من</div>
              <div className="font-semibold num">{fmtDate(stats.from)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">إلى</div>
              <div className="font-semibold num">{fmtDate(stats.to)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">إجمالي الخصومات</div>
              <div className="font-semibold num text-destructive">{fmtMoney(stats.totalDiscount)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">إجمالي الفواتير</div>
              <div className="font-semibold num">{stats.orderCount}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ===== KPI Card with trend arrow =====
function KpiCard({
  title,
  value,
  icon,
  color,
  trendPct,
  subtitle,
}: {
  title: string
  value: string
  icon: React.ReactNode
  color: string
  trendPct?: number
  subtitle?: string
}) {
  const hasTrend = typeof trendPct === 'number' && isFinite(trendPct)
  const isUp = hasTrend && trendPct > 0
  const isDown = hasTrend && trendPct < 0
  const isStable = hasTrend && trendPct === 0

  return (
    <Card className="overflow-hidden relative card-lift group">
      {/* Gradient strip on top */}
      <div className={`h-1 bg-gradient-to-l ${color}`} />
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground font-bold">{title}</span>
          <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${color} text-white flex items-center justify-center shadow-md`}>
            {icon}
          </div>
        </div>
        <div className="text-2xl font-black num text-foreground">{value}</div>
        {/* Trend arrow */}
        {hasTrend && (
          <div className="flex items-center gap-1.5 mt-2">
            <div
              className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-xs font-bold ${
                isUp ? 'bg-green-100 text-green-700' :
                isDown ? 'bg-red-100 text-red-700' :
                'bg-muted text-muted-foreground'
              }`}
            >
              {isUp && <ArrowUpRight className="w-3 h-3" />}
              {isDown && <ArrowDownRight className="w-3 h-3" />}
              {isStable && <Minus className="w-3 h-3" />}
              <span className="num">{Math.abs(trendPct).toFixed(1)}%</span>
            </div>
            {subtitle && <span className="text-[10px] text-muted-foreground truncate">{subtitle}</span>}
          </div>
        )}
        {!hasTrend && subtitle && <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>}
      </CardContent>
    </Card>
  )
}

// ===== Top Item Row with bar + trend arrow =====
function TopItemRow({ item, rank }: { item: any; rank: number }) {
  const isUp = item.change > 0
  const isDown = item.change < 0
  const isStable = item.change === 0

  const rankColors = [
    'bg-amber-100 text-amber-700 border-amber-300',
    'bg-gray-200 text-gray-700 border-gray-300',
    'bg-orange-100 text-orange-700 border-orange-300',
    'bg-muted text-muted-foreground border-border',
  ]
  const rankBg = rankColors[rank] || rankColors[3]

  return (
    <div className="flex items-center gap-3 group">
      {/* Rank badge */}
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black border ${rankBg} shrink-0`}>
        {rank < 3 ? ['🥇', '🥈', '🥉'][rank] : rank + 1}
      </div>

      {/* Item name + bar */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-bold truncate">{item.name}</span>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs num text-muted-foreground">{item.qty} مبيع</span>
            <span className="text-sm font-bold num text-ocean">{fmtMoney(item.total)}</span>
          </div>
        </div>
        {/* Progress bar */}
        <div className="relative h-2.5 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              rank === 0 ? 'bg-gradient-to-l from-amber-400 to-amber-500' :
              rank === 1 ? 'bg-gradient-to-l from-gray-400 to-gray-500' :
              rank === 2 ? 'bg-gradient-to-l from-orange-400 to-orange-500' :
              'bg-gradient-to-l from-ocean to-lagoon'
            }`}
            style={{ width: `${item.pctOfMax}%` }}
          />
        </div>
      </div>

      {/* Trend arrow */}
      <div
        className={`flex items-center gap-0.5 px-2 py-1 rounded-md text-xs font-bold shrink-0 w-20 justify-center ${
          isUp ? 'bg-green-100 text-green-700' :
          isDown ? 'bg-red-100 text-red-700' :
          'bg-muted text-muted-foreground'
        }`}
        title={`السابقة: ${item.prevQty} | التغيّر: ${item.change > 0 ? '+' : ''}${item.change}`}
      >
        {isUp && <TrendingUp className="w-3.5 h-3.5" />}
        {isDown && <TrendingDown className="w-3.5 h-3.5" />}
        {isStable && <Minus className="w-3.5 h-3.5" />}
        <span className="num">
          {item.changePct > 999 ? '∞' : `${item.changePct > 0 ? '+' : ''}${item.changePct.toFixed(0)}%`}
        </span>
      </div>
    </div>
  )
}
