import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Legend } from 'recharts'
import type { Result } from './calc'
import { eur } from './format'

const COLORS = ['#0ea5e9', '#eab308', '#a855f7', '#64748b', '#f97316', '#22c55e', '#14b8a6', '#ef4444']

export function StructurePie({ r }: { r: Result }) {
  const data = [
    ['Material', r.material], ['Elektrika', r.electricity], ['Amortizacija', r.wear],
    ['Lepilo', r.adhesive], ['Potrošni material', r.consumables + r.otherDirect], ['Rezerva', r.reserve],
    ['Aktivno delo', r.services + r.digital], ['Pribitek', r.markup],
    ['Prevoz in ostalo', r.transport + r.packaging + r.delivery + r.otherCosts],
  ].map(([name, value]) => ({ name: name as string, value: Math.max(0, Math.round((value as number) * 100) / 100) })).filter((d) => d.value > 0)
  return (
    <div className="h-72">
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="45%" outerRadius="80%" paddingAngle={2}>
            {data.map((d, i) => <Cell key={d.name} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip formatter={(v: number) => eur(v)} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

export function PriceVsCost({ r }: { r: Result }) {
  const data = [{ name: 'Naročilo', Stroški: +r.realCosts.toFixed(2), 'Fiksni + davek': +(r.fixedShare + r.tax).toFixed(2), Zaslužek: +Math.max(0, r.earnings).toFixed(2), Cena: +r.net.toFixed(2) }]
  return (
    <div className="h-56">
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ left: 10, right: 10 }}>
          <XAxis type="number" tickFormatter={(v) => `${v} €`} fontSize={11} />
          <YAxis type="category" dataKey="name" hide />
          <Tooltip formatter={(v: number) => eur(v)} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="Stroški" stackId="a" fill="#f97316" />
          <Bar dataKey="Fiksni + davek" stackId="a" fill="#64748b" />
          <Bar dataKey="Zaslužek" stackId="a" fill="#22c55e" />
          <Bar dataKey="Cena" fill="#0ea5e9" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
