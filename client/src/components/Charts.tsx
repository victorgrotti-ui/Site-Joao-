import type { ReactNode } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatGBP } from '../lib/format'
import type { NamedSlice, SeriesPoint } from '../lib/types'

const TYPE_COLOURS = ['#0B63D6', '#1677E8', '#60A5FA', '#172033', '#93C5FD']

function poundsTick(value: number) {
  const pounds = value / 100
  if (Math.abs(pounds) >= 1000) return `£${(pounds / 1000).toFixed(1)}k`
  return `£${Math.round(pounds)}`
}

function tooltipValue(value: unknown) {
  const amount = Array.isArray(value) ? value[0] : value
  return formatGBP(Number(amount ?? 0))
}

export function ChartCard({
  title,
  subtitle,
  empty,
  children,
}: {
  title: string
  subtitle?: string
  empty?: boolean
  children: ReactNode
}) {
  return (
    <section className="rounded-2xl border border-line bg-white p-4 shadow-card sm:p-5">
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      {subtitle ? <p className="mt-1 text-sm text-ink-muted">{subtitle}</p> : null}
      <div className="mt-4 h-72">
        {empty ? (
          <div className="flex h-full items-center justify-center rounded-xl bg-brand-soft px-6 text-center">
            <div>
              <p className="font-semibold text-ink">No financial data for this period</p>
              <p className="mt-1 text-sm text-ink-muted">Charts use the records saved in your database.</p>
            </div>
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  )
}

export function seriesIsEmpty(series: SeriesPoint[]) {
  return series.length === 0 || series.every((point) => point.revenue === 0 && point.expenses === 0 && point.profit === 0)
}

export function MoneyBars({ data }: { data: SeriesPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} barGap={4}>
        <CartesianGrid vertical={false} stroke="#E6EAF0" />
        <XAxis dataKey="label" tick={{ fill: '#667085', fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={poundsTick} tick={{ fill: '#667085', fontSize: 12 }} axisLine={false} tickLine={false} width={56} />
        <Tooltip formatter={tooltipValue} cursor={{ fill: '#F5F9FF' }} />
        <Legend />
        <Bar dataKey="revenue" name="Revenue" fill="#0B63D6" radius={[6, 6, 0, 0]} maxBarSize={28} />
        <Bar dataKey="expenses" name="Expenses" fill="#F59E0B" radius={[6, 6, 0, 0]} maxBarSize={28} />
        <Bar dataKey="profit" name="Profit" fill="#16A34A" radius={[6, 6, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function ProfitBars({ data }: { data: Array<{ label: string; profit: number }> }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid vertical={false} stroke="#E6EAF0" />
        <XAxis dataKey="label" tick={{ fill: '#667085', fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={poundsTick} tick={{ fill: '#667085', fontSize: 12 }} axisLine={false} tickLine={false} width={56} />
        <Tooltip formatter={tooltipValue} cursor={{ fill: '#F5F9FF' }} />
        <Bar dataKey="profit" name="Profit" fill="#0B63D6" radius={[6, 6, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function EmployeeBars({ data }: { data: NamedSlice[] }) {
  const rows = data.map((item) => ({
    ...item,
    short: item.label.length > 16 ? `${item.label.slice(0, 15)}…` : item.label,
  }))
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 8 }}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="short" width={108} tick={{ fill: '#172033', fontSize: 12 }} axisLine={false} tickLine={false} />
        <Tooltip formatter={(value) => [String(Array.isArray(value) ? value[0] : value ?? 0), 'Services']} />
        <Bar dataKey="count" name="Services" fill="#1677E8" radius={[0, 6, 6, 0]} maxBarSize={22} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function TypeDonut({ data }: { data: NamedSlice[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} dataKey="count" nameKey="label" innerRadius={58} outerRadius={88} paddingAngle={2}>
          {data.map((entry, index) => (
            <Cell key={entry.key} fill={TYPE_COLOURS[index % TYPE_COLOURS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}
