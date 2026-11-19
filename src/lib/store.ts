import { buildSimulatedData, type SimulatedBase } from '@/data/simulasi'
import type {
  AccountView,
  InvoiceView,
  PaymentView,
  PriceEntry,
  ProductView,
  PurchaseRecord,
  SellPriceEntry,
  TokoData,
} from './toko-types'

const KEYS = {
  payments: 'toko-santri-simulasi-pembayaran-v1',
  prices: 'toko-santri-simulasi-info-harga-v1',
  sells: 'toko-santri-simulasi-harga-jual-v1',
} as const

/** Catatan yang dibuat pengguna di perangkat ini (mode simulasi). */
export type LocalRecords = {
  payments: PaymentView[]
  prices: PriceEntry[]
  sells: SellPriceEntry[]
}

let base: SimulatedBase | null = null
export const getBase = () => (base ??= buildSimulatedData())

function readList<T>(key: string, valid: (item: T) => boolean): T[] {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw) as T[]
    return Array.isArray(parsed) ? parsed.filter((item) => item && valid(item)) : []
  } catch {
    return []
  }
}

export function loadLocalRecords(): LocalRecords {
  return {
    payments: readList<PaymentView>(
      KEYS.payments,
      (item) => typeof item.amount === 'number' && Boolean(item.invoiceId),
    ),
    prices: readList<PriceEntry>(
      KEYS.prices,
      (item) => typeof item.unitPrice === 'number' && Boolean(item.productKey),
    ),
    sells: readList<SellPriceEntry>(
      KEYS.sells,
      (item) => typeof item.sellPrice === 'number' && Boolean(item.productKey),
    ),
  }
}

export function saveLocalRecords(records: LocalRecords) {
  try {
    localStorage.setItem(KEYS.payments, JSON.stringify(records.payments))
    localStorage.setItem(KEYS.prices, JSON.stringify(records.prices))
    localStorage.setItem(KEYS.sells, JSON.stringify(records.sells))
  } catch {
    /* penyimpanan perangkat tidak tersedia; catatan tetap tampil sampai halaman ditutup */
  }
}

/** Harga beli per satuan dasar dari info harga (HPP + ongkir). */
export function entryBasePrice(product: ProductView, unit: string, unitPrice: number, shipping: number) {
  const perUnit = unitPrice + shipping
  const value = unit === product.baseUnit ? perUnit : perUnit / product.conversion
  return Math.round(value * 100) / 100
}

function mergeProduct(product: ProductView, local: LocalRecords): ProductView {
  const priceInfo: PurchaseRecord[] = local.prices
    .filter((entry) => entry.branch === product.branch && entry.productKey === product.key)
    .map((entry) => ({
      date: entry.date,
      source: 'Info harga',
      invoice: entry.id,
      supplier: entry.supplier,
      quantity: 0,
      unit: entry.unit,
      unitPrice: entry.unitPrice,
      shipping: entry.shipping,
      basePrice: entryBasePrice(product, entry.unit, entry.unitPrice, entry.shipping),
      acosysRecorded: entry.acosysRecorded,
      note: entry.note,
    }))
  const sellChange =
    local.sells
      .filter((entry) => entry.branch === product.branch && entry.productKey === product.key)
      .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))[0] ?? null
  if (!priceInfo.length && !sellChange) return product
  const history = [...priceInfo, ...product.history].sort(
    (a, b) =>
      b.date.localeCompare(a.date) || (a.source === b.source ? 0 : a.source === 'Info harga' ? -1 : 1),
  )
  return {
    ...product,
    sellPrice: sellChange?.sellPrice ?? product.sellPrice,
    sellPriceChange: sellChange,
    history,
    latestCost: history[0] ?? null,
    suppliers: [...new Set(history.map((item) => item.supplier))],
  }
}

/** Gabungkan data simulasi dengan catatan yang dibuat di perangkat ini. */
export function composeData(local: LocalRecords): TokoData {
  const data = getBase()
  const knownInvoices = new Set(data.invoices.map((invoice) => invoice.id))
  const payments = [
    ...local.payments.filter((payment) => knownInvoices.has(payment.invoiceId)),
    ...data.payments,
  ].sort((a, b) => b.date.localeCompare(a.date))

  const paidByInvoice = new Map<string, number>()
  const datesByInvoice = new Map<string, string[]>()
  for (const payment of payments) {
    paidByInvoice.set(payment.invoiceId, (paidByInvoice.get(payment.invoiceId) ?? 0) + payment.amount)
    datesByInvoice.set(payment.invoiceId, [...(datesByInvoice.get(payment.invoiceId) ?? []), payment.date])
  }

  const invoices: InvoiceView[] = data.invoices.map((invoice) => {
    const amountPaid = Math.min(invoice.total, paidByInvoice.get(invoice.id) ?? 0)
    const remainingBalance = Math.max(0, invoice.total - amountPaid)
    return {
      ...invoice,
      amountPaid,
      remainingBalance,
      paidDates: (datesByInvoice.get(invoice.id) ?? []).sort(),
      status: amountPaid <= 0 ? 'Belum Bayar' : remainingBalance <= 0 ? 'Lunas' : 'Sebagian',
    }
  })

  const accountFor = (payment: PaymentView) =>
    `${payment.branch === 'Gading' ? 'gdg' : 'plr'}-${
      payment.method === 'Transfer BCA' ? 'bca' : payment.method === 'Transfer BRI' ? 'bri' : 'cash'
    }`
  const accounts: AccountView[] = data.accounts.map((account) => {
    const incoming = data.income
      .filter((item) => item.accountId === account.id)
      .reduce((sum, item) => sum + item.amount, 0)
    const outgoing = payments
      .filter((payment) => accountFor(payment) === account.id)
      .reduce((sum, payment) => sum + payment.amount, 0)
    return { ...account, balance: account.openingBalance + incoming - outgoing }
  })

  return {
    invoices,
    payments,
    income: data.income,
    accounts,
    products: data.products.map((product) => mergeProduct(product, local)),
  }
}
