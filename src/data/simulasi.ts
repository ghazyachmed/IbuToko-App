/**
 * DATA SIMULASI Toko Santri (Gading & Palur).
 *
 * - Nama, kategori, satuan jual, dan harga jual berasal dari katalog referensi
 *   Toko Santri Nonongan. Nonongan BUKAN cabang Gading/Palur; stok dan
 *   transaksinya tidak disalin.
 * - Harga beli, supplier, nota, pembayaran, pemasukan, mutasi stok, dan batas
 *   minimum stok di file ini adalah SINTETIS (simulated: true).
 * - Data dibuat deterministik (seed dari nama produk + cabang). Tanggal relatif
 *   terhadap hari ini agar contoh "hari ini" tetap bermakna.
 * - Stok selalu = total barang masuk − total barang keluar, dan tidak pernah
 *   negatif pada titik mana pun dalam riwayat mutasi.
 */
import { normalizeName } from '@/lib/catalog'
import {
  type AccountView,
  type Branch,
  BRANCHES,
  type IncomeView,
  type InvoiceView,
  localDate,
  type PaymentView,
  type ProductView,
  type PurchaseRecord,
  type StockMovement,
} from '@/lib/toko-types'
import { CATALOG, CATEGORY_SUPPLIERS, minimumStock, SUPPLIERS } from './katalog'

type SupplierKey = keyof typeof SUPPLIERS

const SUPPLIER_CODE: Record<SupplierKey, string> = {
  permadani: 'PS',
  karpet: 'KJ',
  busa: 'BM',
  kain: 'KS',
  aksesoris: 'AT',
  lem: 'LP',
  terpal: 'TP',
  dakron: 'DK',
}
const SUPPLIER_KEYS = Object.keys(SUPPLIERS) as SupplierKey[]
const BRANCH_CODE: Record<Branch, string> = { Gading: 'GDG', Palur: 'PLR' }

function hash(text: string) {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function seeded(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const roundTo = (value: number, step: number) => Math.max(step, Math.round(value / step) * step)

export type SimulatedBase = {
  generatedFor: string
  invoices: Omit<InvoiceView, 'status' | 'amountPaid' | 'remainingBalance' | 'paidDates'>[]
  payments: PaymentView[]
  income: IncomeView[]
  accounts: Omit<AccountView, 'balance'>[]
  products: ProductView[]
}

export function buildSimulatedData(now = new Date()): SimulatedBase {
  const anchor = new Date(now)
  anchor.setHours(12, 0, 0, 0)
  const dayISO = (daysAgo: number) => {
    const date = new Date(anchor)
    date.setDate(date.getDate() - daysAgo)
    return localDate(date)
  }
  const compact = (iso: string) => iso.slice(2).replace(/-/g, '')

  /** Hari kirim tiap supplier (hari-yang-lalu), beda sehari antar cabang. */
  const deliveryDays = (supplier: SupplierKey, branch: Branch) => {
    const offset = SUPPLIER_KEYS.indexOf(supplier) * 2 + 3 + (branch === 'Palur' ? 1 : 0)
    const days: number[] = []
    for (let d = offset; d <= 165; d += 13) days.push(d)
    return days
  }
  /**
   * Nomor nota tetap (tidak berubah walau tanggal simulasi bergeser tiap hari),
   * mis. "GDG-KJ-012" = nota ke-12 dari supplier itu. Pembayaran yang dicatat
   * di HP mengacu ke nomor ini, jadi harus stabil.
   */
  const notaNumber = (branch: Branch, supplier: SupplierKey, daysAgo: number) => {
    const days = deliveryDays(supplier, branch)
    const sequence = days.length - days.indexOf(daysAgo)
    return `${BRANCH_CODE[branch]}-${SUPPLIER_CODE[supplier]}-${String(sequence).padStart(3, '0')}`
  }
  const snap = (target: number, supplier: SupplierKey, branch: Branch) =>
    deliveryDays(supplier, branch).reduce((best, day) =>
      Math.abs(day - target) < Math.abs(best - target) ? day : best,
    )

  const products: ProductView[] = []
  const invoiceMap = new Map<
    string,
    {
      branch: Branch
      supplier: SupplierKey
      daysAgo: number
      items: InvoiceView['items']
    }
  >()
  const salesByDay = new Map<string, { branch: Branch; daysAgo: number; value: number }>()
  const seenKeys = new Set<string>()

  for (const branch of BRANCHES) {
    CATALOG.forEach(([name, category, baseUnit, sellPrice, purchaseUnit, conversion], index) => {
      const key = normalizeName(name)
      const uniqueKey = `${branch}|${key}`
      if (seenKeys.has(uniqueKey)) throw new Error(`Produk ganda: ${name} (${branch})`)
      seenKeys.add(uniqueKey)

      const productRandom = seeded(hash(key))
      const ratio = 0.7 + productRandom() * 0.13
      const altFactor = 0.95 + productRandom() * 0.1
      const random = seeded(hash(`${key}|${branch}`))
      const [primary, alternate] = CATEGORY_SUPPLIERS[category] ?? ['kain', 'aksesoris']
      const id = `${BRANCH_CODE[branch].toLowerCase()}-${String(index + 1).padStart(3, '0')}`
      const minStock = minimumStock(baseUnit, conversion, sellPrice)

      // Pembelian: 2–4 kali, tanggal mengikuti hari kirim supplier.
      const count = 2 + Math.floor(random() * 3)
      const latestSupplier: SupplierKey = random() < 0.7 ? primary : alternate
      const plan: Array<{ supplier: SupplierKey; daysAgo: number }> = []
      for (let i = 0; i < count; i++) {
        const supplier =
          i === count - 1
            ? latestSupplier
            : i === 0
              ? latestSupplier === primary
                ? alternate
                : primary
              : random() < 0.5
                ? primary
                : alternate
        const target = Math.round(150 - (i * 140) / (count - 1) + (random() - 0.5) * 10)
        const daysAgo = snap(Math.max(2, target), supplier, branch)
        const previous = plan.at(-1)
        if (previous && daysAgo >= previous.daysAgo) continue
        plan.push({ supplier, daysAgo })
      }

      // Target stok akhir: kosong / sedikit / normal / banyak (beda tiap cabang).
      const band = random()
      const targetStock =
        band < 0.14
          ? 0
          : band < 0.36
            ? 1 + Math.floor(random() * 5)
            : band < 0.72
              ? 6 + Math.floor(random() * 25)
              : 31 + Math.floor(random() * Math.max(30, conversion * 2))

      const n = plan.length
      const plannedSales = Math.round(conversion * n * (0.6 + random() * 0.8))
      const totalUnits = Math.max(n, Math.ceil((targetStock + plannedSales) / conversion))
      const totalIn = totalUnits * conversion
      const totalOut = totalIn - targetStock

      const weights = plan.map(() => 0.5 + random())
      const weightSum = weights.reduce((sum, value) => sum + value, 0)

      const movements: StockMovement[] = []
      const history: PurchaseRecord[] = []
      let running = 0
      let sold = 0

      plan.forEach((purchase, i) => {
        const units = Math.floor(totalUnits / n) + (i < totalUnits % n ? 1 : 0)
        const drift = 1 + 0.045 * (n > 1 ? i / (n - 1) : 1)
        const factor = purchase.supplier === primary ? 1 : altFactor
        const perBase = sellPrice * ratio * drift * factor
        const rawUnitPrice = perBase * conversion
        const unitPrice = roundTo(rawUnitPrice, rawUnitPrice >= 100000 ? 500 : 100)
        const date = dayISO(purchase.daysAgo)
        const invoiceKey = `${branch}|${purchase.supplier}|${purchase.daysAgo}`
        const number = notaNumber(branch, purchase.supplier, purchase.daysAgo)
        const supplierName = SUPPLIERS[purchase.supplier]

        const invoice = invoiceMap.get(invoiceKey) ?? {
          branch,
          supplier: purchase.supplier,
          daysAgo: purchase.daysAgo,
          items: [],
        }
        invoice.items.push({
          productId: id,
          product: name,
          quantity: units,
          unit: purchaseUnit,
          unitPrice,
          total: units * unitPrice,
        })
        invoiceMap.set(invoiceKey, invoice)

        running += units * conversion
        movements.push({
          id: `${id}-in-${i}`,
          branch,
          productId: id,
          date,
          type: 'masuk',
          quantity: units,
          unit: purchaseUnit,
          baseQuantity: units * conversion,
          reference: number,
          supplier: supplierName,
          simulated: true,
        })
        history.push({
          date,
          source: 'Nota',
          invoice: number,
          supplier: supplierName,
          quantity: units,
          unit: purchaseUnit,
          unitPrice,
          shipping: 0,
          basePrice: Math.round((unitPrice / conversion) * 100) / 100,
          acosysRecorded: purchase.daysAgo > 30,
        })

        // Penjualan setelah pembelian ini, sebelum pembelian berikutnya.
        const isLast = i === n - 1
        let quantity = isLast
          ? totalOut - sold
          : Math.min(running, Math.round((totalOut * weights[i]) / weightSum))
        quantity = Math.max(0, Math.min(quantity, running))
        if (quantity > 0) {
          const nextDay = isLast ? 0 : plan[i + 1].daysAgo + 1
          const saleDay = isLast
            ? random() < 0.35
              ? 0
              : Math.min(purchase.daysAgo, Math.floor(random() * 5))
            : Math.max(nextDay, purchase.daysAgo - 1 - Math.floor(random() * 6))
          const saleDate = dayISO(saleDay)
          running -= quantity
          sold += quantity
          movements.push({
            id: `${id}-out-${i}`,
            branch,
            productId: id,
            date: saleDate,
            type: 'keluar',
            quantity,
            unit: baseUnit,
            baseQuantity: quantity,
            reference: `JUAL-${BRANCH_CODE[branch]}-${compact(saleDate)}`,
            simulated: true,
          })
          const dayKey = `${branch}|${saleDay}`
          const day = salesByDay.get(dayKey) ?? { branch, daysAgo: saleDay, value: 0 }
          day.value += quantity * sellPrice
          salesByDay.set(dayKey, day)
        }
      })

      const stock = movements.reduce(
        (sum, item) => sum + (item.type === 'masuk' ? item.baseQuantity : -item.baseQuantity),
        0,
      )
      if (stock < 0) throw new Error(`Stok negatif: ${name} (${branch})`)
      const sortedHistory = [...history].sort((a, b) => b.date.localeCompare(a.date))
      const lastPurchase = sortedHistory[0] ?? null
      products.push({
        id,
        branch,
        key,
        name,
        category,
        baseUnit,
        purchaseUnit,
        conversion,
        sellPrice,
        sellPriceChange: null,
        supplier: lastPurchase?.supplier ?? SUPPLIERS[primary],
        suppliers: [...new Set(history.map((item) => item.supplier))],
        minStock,
        stock,
        status: stock <= 0 ? 'Habis' : stock <= minStock ? 'Hampir habis' : 'Aman',
        totalIn: movements
          .filter((item) => item.type === 'masuk')
          .reduce((sum, item) => sum + item.baseQuantity, 0),
        totalOut: movements
          .filter((item) => item.type === 'keluar')
          .reduce((sum, item) => sum + item.baseQuantity, 0),
        lastPurchase,
        latestCost: lastPurchase,
        history: sortedHistory,
        movements: [...movements].sort(
          (a, b) => b.date.localeCompare(a.date) || (a.type === 'keluar' ? -1 : 1),
        ),
        simulated: true,
      })
    })
  }

  // Nota supplier + pembayaran simulasi.
  const invoices: SimulatedBase['invoices'] = []
  const payments: PaymentView[] = []
  const accountName = { bca: 'Bank BCA', bri: 'Bank BRI', cash: 'Kas toko' } as const
  const methodLabel = { bca: 'Transfer BCA', bri: 'Transfer BRI', cash: 'Tunai' } as const
  const outgoing = new Map<string, number>()

  for (const invoice of [...invoiceMap.values()].sort((a, b) => b.daysAgo - a.daysAgo)) {
    const date = dayISO(invoice.daysAgo)
    const number = notaNumber(invoice.branch, invoice.supplier, invoice.daysAgo)
    const random = seeded(hash(number))
    const total = invoice.items.reduce((sum, item) => sum + item.total, 0)
    const due = new Date(`${date}T12:00:00`)
    due.setDate(due.getDate() + 30)
    invoices.push({
      id: number,
      branch: invoice.branch,
      number,
      date,
      dueDate: localDate(due),
      supplier: SUPPLIERS[invoice.supplier],
      acosysRecorded: invoice.daysAgo > 30 || random() < 0.4,
      total,
      items: invoice.items,
      simulated: true,
    })

    const roll = random()
    const share =
      invoice.daysAgo > 40
        ? 1
        : invoice.daysAgo > 18
          ? roll < 0.7
            ? 1
            : 0.5
          : roll < 0.5
            ? 0
            : roll < 0.8
              ? 0.5
              : 1
    if (share <= 0) continue
    const method = random() < 0.5 ? 'bca' : random() < 0.6 ? 'bri' : 'cash'
    const amount = share === 1 ? total : roundTo(total * (0.4 + random() * 0.2), 1000)
    const payDay = Math.max(0, invoice.daysAgo - 3 - Math.floor(random() * 15))
    const accountId = `${BRANCH_CODE[invoice.branch].toLowerCase()}-${method}`
    outgoing.set(accountId, (outgoing.get(accountId) ?? 0) + amount)
    payments.push({
      id: `PAY-${number}`,
      branch: invoice.branch,
      invoiceId: number,
      date: dayISO(payDay),
      amount,
      method: methodLabel[method],
      proofName: `bukti-${number.toLowerCase()}.jpg (simulasi)`,
      proofUrl: null,
      acosysRecorded: payDay > 30 || random() < 0.5,
      simulated: true,
    })
  }

  // Pemasukan pelanggan (QRIS → BCA, transfer → BRI) dari penjualan harian.
  const income: IncomeView[] = []
  const incoming = new Map<string, number>()
  for (const day of [...salesByDay.values()].sort((a, b) => a.daysAgo - b.daysAgo)) {
    const date = dayISO(day.daysAgo)
    const code = BRANCH_CODE[day.branch]
    const random = seeded(hash(`${code}|${day.daysAgo}`))
    const qris = roundTo(day.value * (0.35 + random() * 0.15), 500)
    const transfer = roundTo(day.value * (0.15 + random() * 0.15), 500)
    const entries = [
      { method: 'QRIS', amount: qris, account: 'bca', customer: 'Penjualan eceran (QRIS)' },
      { method: 'Transfer', amount: transfer, account: 'bri', customer: 'Transfer pelanggan' },
    ]
    for (const entry of entries) {
      const accountId = `${code.toLowerCase()}-${entry.account}`
      incoming.set(accountId, (incoming.get(accountId) ?? 0) + entry.amount)
      income.push({
        id: `${entry.method}-${code}-H${day.daysAgo}`,
        branch: day.branch,
        date,
        customer: entry.customer,
        method: entry.method,
        amount: entry.amount,
        reference: `${entry.method.toUpperCase()}-${code}-H${day.daysAgo}`,
        accountId,
        simulated: true,
      })
    }
  }

  const accounts: SimulatedBase['accounts'] = []
  const baseBalance = { bca: 35_000_000, bri: 20_000_000, cash: 8_000_000 }
  for (const branch of BRANCHES) {
    for (const method of ['bca', 'bri', 'cash'] as const) {
      const id = `${BRANCH_CODE[branch].toLowerCase()}-${method}`
      const gap = (outgoing.get(id) ?? 0) - (incoming.get(id) ?? 0)
      accounts.push({
        id,
        branch,
        name: accountName[method],
        openingBalance: roundTo(Math.max(0, gap) + baseBalance[method], 100000),
        simulated: true,
      })
    }
  }

  return {
    generatedFor: dayISO(0),
    invoices: invoices.sort((a, b) => b.date.localeCompare(a.date)),
    payments: payments.sort((a, b) => b.date.localeCompare(a.date)),
    income: income.sort((a, b) => b.date.localeCompare(a.date)),
    accounts,
    products: products.sort((a, b) => a.name.localeCompare(b.name, 'id')),
  }
}
