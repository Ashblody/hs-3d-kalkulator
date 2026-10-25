const eurF = new Intl.NumberFormat('sl-SI', { style: 'currency', currency: 'EUR' })
const numF = new Intl.NumberFormat('sl-SI', { maximumFractionDigits: 2 })
export const eur = (x: number) => eurF.format(Number.isFinite(x) ? x : 0)
export const num = (x: number) => numF.format(Number.isFinite(x) ? x : 0)
/** sprejme vejico ali piko kot decimalno ločilo */
export const parseNum = (s: string) => { const v = parseFloat(s.replace(/\s/g, '').replace(',', '.')); return Number.isFinite(v) ? v : 0 }
export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
