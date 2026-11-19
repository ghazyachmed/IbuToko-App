import { SUPPLIER_ALIASES } from '@/data/katalog'
import { matchesQuery, searchTokens } from './catalog'
import { entryBasePrice } from './store'
import {
  type Branch,
  numberID,
  type ProductView,
  type PurchaseRecord,
  qtyText,
  rupiah,
  shortDate,
  type StockMovement,
  type TokoData,
  todayISO,
  unitLabel,
} from './toko-types'

/*
 * Gaya jawaban: singkat, bahasa sehari-hari, angka penting dulu.
 * Setiap angka harus punya sumber (nota / penjualan / info harga).
 */

export type PendingAction =
  | {
      kind: 'price'
      branch: Branch
      productKey: string
      productName: string
      supplier: string
      unit: string
      unitPrice: number
      shipping: number
      date: string
    }
  | {
      kind: 'sell'
      branch: Branch
      productKey: string
      productName: string
      sellPrice: number
      previous: number
      date: string
    }

export type Answer = {
  branch: Branch
  lines: string[]
  sources: Array<{ label: string; to: string }>
  tone?: 'warning' | 'error'
  action?: PendingAction
}

const STOP_WORDS = new Set(
  `berapa berapakah brp brapa harga harganya stok stoknya stock sisa kapan terakhir terakhirnya membeli
  beli dibeli pembelian belanja dari ke supplier suplier pemasok mana yang paling termurah murah mahal
  termahal lebih di toko cabang gading palur apa saja barang produk item hampir habis menipis rendah
  dibandingkan dibanding banding bandingkan vs versus dengan jual dijual sekarang saat ini untuk ada
  dan nya tolong cek lihat info hari masuk tersedia per satuan kali kah sih bu dong ya punya kita
  minimum batas kemarin lama dulu sebelumnya riwayat itu mau bandingin sama sales lain baru isi
  banyak profit untung laba digulung modal lagi tagihan nota sudah udah dah belum lunas bayar dibayar
  datang tanggal kirim gimana bagaimana tadi kata katanya koli pack pak roll rol bal lembar meter
  karung dus gross gallon galon kilo`
    .split(/\s+/)
    .filter(Boolean),
)
const INPUT_WORDS = new Set(
  `catat catatkan input masukkan masukin tambah tambahkan update simpan ubah ganti jadi jadikan naik
  turun baru rp ongkir ongkos hpp kirim wa whatsapp setelah`
    .split(/\s+/)
    .filter(Boolean),
)
const NOT_PROFIT = 'Ini selisih kotor, belum untung bersih.'

const tgl = (value: string) =>
  value.slice(0, 4) === todayISO().slice(0, 4)
    ? shortDate(value).replace(/\s\d{4}$/, '')
    : shortDate(value)
const per = (value: number, unit: string) => `${rupiah(Math.round(value))}/${unitLabel(unit)}`
const qty = qtyText
const pct = (value: number) => `${numberID(Math.round(value * 100))}%`
const roundUp = (value: number, step = 500) => Math.ceil(value / step) * step

const invoiceLink = (number: string) => `/app/buku-besar/${encodeURIComponent(number)}`
const purchaseSource = (purchase: PurchaseRecord) =>
  purchase.source === 'Nota'
    ? { label: `Nota ${purchase.invoice} • ${tgl(purchase.date)}`, to: invoiceLink(purchase.invoice) }
    : { label: `Info harga ${purchase.supplier} • ${tgl(purchase.date)}`, to: '/app/tanya-data' }
const movementSource = (movement: StockMovement) => ({
  label: `${movement.type === 'masuk' ? 'Nota' : 'Penjualan'} ${movement.reference} • ${tgl(movement.date)}`,
  to: movement.type === 'masuk' ? invoiceLink(movement.reference) : '/app/buku-uang',
})

function latestPerSupplier(product: ProductView, supplier?: string) {
  const map = new Map<string, PurchaseRecord>()
  for (const purchase of product.history)
    if (!map.has(purchase.supplier) && (!supplier || purchase.supplier === supplier))
      map.set(purchase.supplier, purchase)
  return [...map.values()].sort((a, b) => a.basePrice - b.basePrice)
}

/* ---------- supplier, angka, satuan ---------- */

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function knownSuppliers(data: TokoData) {
  const names = new Set<string>(Object.keys(SUPPLIER_ALIASES))
  for (const product of data.products) for (const supplier of product.suppliers) names.add(supplier)
  return [...names].map((name) => ({
    name,
    aliases: [...(SUPPLIER_ALIASES[name] ?? []), name.toLowerCase()].sort((a, b) => b.length - a.length),
  }))
}

function findSuppliers(text: string, data: TokoData) {
  const lower = text.toLowerCase()
  const found: Array<{ name: string; alias: string }> = []
  for (const supplier of knownSuppliers(data)) {
    const alias = supplier.aliases.find((item) => new RegExp(`\\b${escapeRegex(item)}\\b`).test(lower))
    if (alias) found.push({ name: supplier.name, alias })
  }
  return found
}

function stripSuppliers(text: string, found: Array<{ alias: string }>) {
  let result = text.toLowerCase()
  for (const item of found) result = result.replace(new RegExp(`\\b${escapeRegex(item.alias)}\\b`, 'g'), ' ')
  return result
}

type Money = { value: number; raw: string; shipping: boolean }

function parseMoney(text: string): Money[] {
  const lower = text.toLowerCase()
  const pattern = /(rp\.?\s*)?(\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d+)?)\s*(rb|ribu|k|jt|juta)?\b/g
  const result: Money[] = []
  for (const match of lower.matchAll(pattern)) {
    const [raw, currency, digits, suffix] = match
    const grouped = /^\d{1,3}([.,]\d{3})+$/.test(digits)
    let value = grouped ? Number(digits.replace(/[.,]/g, '')) : Number(digits.replace(',', '.'))
    if (suffix === 'rb' || suffix === 'ribu' || suffix === 'k') value *= 1000
    if (suffix === 'jt' || suffix === 'juta') value *= 1_000_000
    if (!currency && !grouped && !suffix && value < 1000) continue
    if (!Number.isFinite(value) || value <= 0) continue
    const before = lower.slice(Math.max(0, (match.index ?? 0) - 14), match.index ?? 0)
    result.push({ value, raw, shipping: /ongkir|ongkos/.test(before) })
  }
  return result
}

const UNIT_WORDS: Array<[RegExp, string[]]> = [
  [/^(1\/2\s*lbr|1\/2\s*lembar|setengah\s*lembar)$/, ['1/2 LBR']],
  [/^(lbr|lembar)$/, ['LBR']],
  [/^(mtr|meter|m)$/, ['MTR']],
  [/^(roll|rol)$/, ['ROLL', 'ROL']],
  [/^(kg|kilo|kilogram)$/, ['KG']],
  [/^(krg|karung)$/, ['KRG']],
  [/^(pcs|biji|buah|pc)$/, ['PCS']],
  [/^(pack|pak)$/, ['PACK', 'PAK']],
  [/^bal$/, ['BAL']],
  [/^koli$/, ['KOLI']],
  [/^(dus|box|kardus)$/, ['DUS']],
  [/^(gross|gros)$/, ['GROSS']],
  [/^(gallon|galon)$/, ['GALLON']],
]

function unitFromWord(word: string, product: ProductView) {
  const entry = UNIT_WORDS.find(([pattern]) => pattern.test(word.trim().toLowerCase()))
  if (!entry) return null
  return entry[1].find((unit) => unit === product.purchaseUnit || unit === product.baseUnit) ?? entry[1][0]
}

function parseUnitPhrase(text: string) {
  const match = text
    .toLowerCase()
    .match(/(?:per|\/|tiap|setiap)\s*(1\/2\s*(?:lbr|lembar)|setengah\s*lembar|[a-z]+)/)
  return match ? { word: match[1], raw: match[0] } : null
}

const titleCase = (value: string) =>
  value
    .trim()
    .split(/\s+/)
    .map((word) => (word.length <= 3 ? word.toUpperCase() : word[0].toUpperCase() + word.slice(1)))
    .join(' ')

/* ---------- setelah info harga / harga jual disimpan ---------- */

export function priceAnalysis(product: ProductView, entryId: string): string[] {
  const entry = product.history.find((item) => item.invoice === entryId)
  if (!entry) return []
  const previous = product.history.filter((item) => item.invoice !== entryId)[0]
  const lines = [`Tersimpan ✓ ${product.name}: beli ${per(entry.basePrice, product.baseUnit)} dari ${entry.supplier}.`]

  if (previous) {
    const diff = entry.basePrice - previous.basePrice
    lines.push(
      diff === 0
        ? `Harga sama seperti terakhir (${previous.supplier}, ${tgl(previous.date)}).`
        : `${diff > 0 ? 'Naik' : 'Turun'} ${rupiah(Math.abs(Math.round(diff)))} dari terakhir ${per(previous.basePrice, product.baseUnit)} (${previous.supplier}, ${tgl(previous.date)}).`,
    )
  }

  const oldMargin = previous ? (product.sellPrice - previous.basePrice) / product.sellPrice : null
  const margin = (product.sellPrice - entry.basePrice) / product.sellPrice
  if (entry.basePrice >= product.sellPrice) {
    const target = oldMargin && oldMargin > 0 ? oldMargin : 0.2
    lines.push(`⚠ Harga jual ${rupiah(product.sellPrice)} sudah rugi. Naikkan ke ±${rupiah(roundUp(entry.basePrice / (1 - target)))}.`)
  } else if (oldMargin !== null && margin < oldMargin - 0.005) {
    lines.push(`Harga jual ${rupiah(product.sellPrice)} sebaiknya naik ke ±${rupiah(roundUp(entry.basePrice / (1 - oldMargin)))}.`)
  } else {
    lines.push(`Harga jual ${rupiah(product.sellPrice)} masih aman.`)
  }

  const cheaper = latestPerSupplier(product).find(
    (item) => item.supplier !== entry.supplier && item.basePrice < entry.basePrice,
  )
  lines.push(
    product.status === 'Aman'
      ? `Stok masih ${qty(product.stock, product.baseUnit)}, belum perlu beli.`
      : `Stok tinggal ${qty(product.stock, product.baseUnit)}, perlu beli lagi.`,
  )
  if (cheaper) lines.push(`${cheaper.supplier} lebih murah (${per(cheaper.basePrice, product.baseUnit)}, ${tgl(cheaper.date)}).`)
  if (!entry.acosysRecorded) lines.push('Belum dicatat di ACOSYS.')
  return lines
}

export function sellAnalysis(product: ProductView): string[] {
  const change = product.sellPriceChange
  if (!change) return []
  return [
    `Tersimpan ✓ Harga jual ${product.name}: ${rupiah(change.previous)} → ${per(change.sellPrice, product.baseUnit)}.`,
    ...(change.acosysRecorded ? [] : ['Jangan lupa ubah juga di ACOSYS.']),
  ]
}

/* ---------- mencatat dari chat ---------- */

function inputAnswer(question: string, branch: Branch, data: TokoData, money: Money[]): Answer {
  const lower = question.toLowerCase()
  const isSell = /\bjual\b/.test(lower)
  const amount = money.find((item) => !item.shipping)!
  const shipping = money.find((item) => item.shipping)?.value ?? 0
  const suppliers = findSuppliers(question, data)
  const unitPhrase = parseUnitPhrase(question)

  let rest = stripSuppliers(question, suppliers)
  for (const item of money) rest = rest.replace(item.raw, ' ')
  if (unitPhrase) rest = rest.replace(unitPhrase.raw, ' ')
  let newSupplier = ''
  if (!isSell && !suppliers.length) {
    const fromMatch = rest.match(
      /\bdari\s+([a-z][a-z0-9 .&-]*?)(?=\s+(?:harga|hpp|per|ongkir|ongkos|sekarang|jadi)\b|\s*$)/,
    )
    if (fromMatch) {
      newSupplier = titleCase(fromMatch[1])
      rest = rest.replace(fromMatch[0], ' ')
    }
  }
  const tokens = searchTokens(rest).filter((token) => !STOP_WORDS.has(token) && !INPUT_WORDS.has(token))
  const products = data.products.filter((product) => product.branch === branch)
  const matches = tokens.length ? products.filter((product) => matchesQuery(product.name, tokens)) : []

  if (!matches.length)
    return {
      branch,
      tone: 'warning',
      lines: [`Barangnya belum ketemu. Tulis nama seperti di nota, misal "Busa Ati 9 mm Hitam".`],
      sources: [],
    }
  if (matches.length > 1)
    return {
      branch,
      tone: 'warning',
      lines: ['Barang yang mana, Bu?', ...matches.slice(0, 5).map((product) => `• ${product.name}`)],
      sources: [],
    }
  const product = matches[0]
  const unit = unitPhrase ? unitFromWord(unitPhrase.word, product) : null
  if (unitPhrase && (!unit || (unit !== product.baseUnit && unit !== product.purchaseUnit)))
    return {
      branch,
      tone: 'warning',
      lines: [`Satuannya pakai ${product.purchaseUnit} atau ${product.baseUnit} ya, Bu.`],
      sources: [],
    }

  if (isSell) {
    const sellUnit = unit ?? product.baseUnit
    const sellPrice = Math.round(sellUnit === product.baseUnit ? amount.value : amount.value / product.conversion)
    const cost = product.latestCost
    if (cost && sellPrice < cost.basePrice)
      return {
        branch,
        tone: 'error',
        lines: [
          `Tidak bisa disimpan. Harga jual ${rupiah(sellPrice)} lebih murah dari harga beli ${per(cost.basePrice, product.baseUnit)} (${cost.supplier}, ${tgl(cost.date)}).`,
        ],
        sources: [purchaseSource(cost)],
      }
    return {
      branch,
      lines: [
        `Ubah harga jual ${product.name}?`,
        `${rupiah(product.sellPrice)} → ${per(sellPrice, product.baseUnit)}`,
        ...(cost ? [`Harga beli terakhir ${per(cost.basePrice, product.baseUnit)}.`] : []),
      ],
      sources: cost ? [purchaseSource(cost)] : [],
      action: {
        kind: 'sell',
        branch,
        productKey: product.key,
        productName: product.name,
        sellPrice,
        previous: product.sellPrice,
        date: todayISO(),
      },
    }
  }

  const supplier = suppliers[0]?.name ?? newSupplier
  if (!supplier)
    return {
      branch,
      tone: 'warning',
      lines: [`Dari supplier mana, Bu? Tambahkan "dari ..." ya.`],
      sources: [],
    }
  const buyUnit = unit ?? product.purchaseUnit
  const base = entryBasePrice(product, buyUnit, amount.value, shipping)
  const previous = product.latestCost
  return {
    branch,
    lines: [
      `Simpan harga baru ${product.name}?`,
      `${supplier}${suppliers.length ? '' : ' (baru)'}: ${per(amount.value, buyUnit)}${shipping ? ` + ongkir ${rupiah(shipping)}` : ''}${buyUnit !== product.baseUnit ? ` (= ${per(base, product.baseUnit)})` : ''}`,
      ...(previous ? [`Terakhir: ${per(previous.basePrice, product.baseUnit)} dari ${previous.supplier}, ${tgl(previous.date)}.`] : []),
    ],
    sources: previous ? [purchaseSource(previous)] : [],
    action: {
      kind: 'price',
      branch,
      productKey: product.key,
      productName: product.name,
      supplier,
      unit: buyUnit,
      unitPrice: amount.value,
      shipping,
      date: todayISO(),
    },
  }
}

/* ---------- pertanyaan tentang barang ---------- */

function productAnswer(question: string, branch: Branch, matches: ProductView[], supplier?: string): Answer {
  const q = question.toLowerCase()
  const list = matches.slice(0, 5)
  const lines: string[] = []
  const sources: Answer['sources'] = []
  const more = matches.length > list.length ? [`+${matches.length - list.length} barang lain. Sebut lebih lengkap ya.`] : []
  const done = (extra: string[] = []) => ({ branch, lines: [...lines, ...more, ...extra], sources })

  if (/murah|mahal/.test(q)) {
    for (const product of list) {
      const offers = latestPerSupplier(product)
      if (!offers.length) {
        lines.push(`${product.name}: belum ada harga beli.`)
        continue
      }
      const [best, ...others] = offers
      lines.push(
        `${product.name}: paling murah ${best.supplier} ${per(best.basePrice, product.baseUnit)} (${tgl(best.date)}).${others.length ? ` Lainnya: ${others.map((item) => `${item.supplier} ${rupiah(Math.round(item.basePrice))}`).join(', ')}.` : ''}`,
      )
      offers.forEach((offer) => sources.push(purchaseSource(offer)))
    }
    return done()
  }

  if (/banding|selisih|\bvs\b/.test(q) || (/\bbeli\b/.test(q) && /\bjual\b/.test(q))) {
    for (const product of list) {
      const cost = product.latestCost
      if (!cost) {
        lines.push(`${product.name}: jual ${per(product.sellPrice, product.baseUnit)}, harga beli belum ada.`)
        continue
      }
      const gap = product.sellPrice - cost.basePrice
      lines.push(
        `${product.name}: beli ${rupiah(Math.round(cost.basePrice))}, jual ${per(product.sellPrice, product.baseUnit)}. Selisih ${rupiah(Math.round(gap))} (${pct(gap / product.sellPrice)}).${gap < 0 ? ' ⚠ Rugi!' : ''}`,
      )
      sources.push(purchaseSource(cost))
    }
    return done([NOT_PROFIT])
  }

  if (/profit|untung|laba|digulung|modal lagi|beli lagi/.test(q)) {
    for (const product of list) {
      const last = product.lastPurchase
      const cost = product.latestCost
      if (!last || !cost) {
        lines.push(`${product.name}: belum ada pembelian.`)
        continue
      }
      const sold = product.movements
        .filter((item) => item.type === 'keluar' && item.date >= last.date)
        .reduce((sum, item) => sum + item.baseQuantity, 0)
      const revenue = sold * product.sellPrice
      const restock = sold * cost.basePrice
      lines.push(
        sold
          ? `${product.name}: sejak beli ${tgl(last.date)} laku ${qty(sold, product.baseUnit)} = ${rupiah(revenue)}. Untuk beli lagi butuh ±${rupiah(Math.round(restock))} (${pct(restock / revenue)}). Sisa ±${rupiah(Math.round(revenue - restock))}.`
          : `${product.name}: belum laku sejak beli ${tgl(last.date)}.`,
      )
      sources.push(purchaseSource(last))
    }
    return done([NOT_PROFIT])
  }

  if (/\bisi\b|berapa banyak/.test(q)) {
    for (const product of list) {
      lines.push(
        product.conversion === 1 && product.purchaseUnit === product.baseUnit
          ? `${product.name}: dibeli satuan ${product.baseUnit}, tidak ada isi kemasan.`
          : `1 ${product.purchaseUnit} ${product.name} = ${qty(product.conversion, product.baseUnit)}.`,
      )
      if (product.lastPurchase) sources.push(purchaseSource(product.lastPurchase))
    }
    return done()
  }

  if (/kapan|datang/.test(q) || /terakhir\s+(mem)?beli|beli\s+terakhir/.test(q)) {
    for (const product of list) {
      const last = product.history.find(
        (item) => item.source === 'Nota' && (!supplier || item.supplier === supplier),
      )
      if (!last) {
        lines.push(`${product.name}: belum pernah beli${supplier ? ` dari ${supplier}` : ''}.`)
        continue
      }
      lines.push(`${product.name}: terakhir beli ${tgl(last.date)} dari ${last.supplier}, ${qty(last.quantity, last.unit)}.`)
      sources.push(purchaseSource(last))
    }
    return done()
  }

  if (/stok|stock|sisa/.test(q)) {
    for (const product of list) {
      const lastMove = product.movements[0]
      lines.push(
        `${product.name}: stok ${qty(product.stock, product.baseUnit)}${product.status === 'Aman' ? '.' : ` — ${product.status.toLowerCase()}!`}`,
      )
      if (lastMove) sources.push(movementSource(lastMove))
    }
    return done()
  }

  if (supplier || /lama|dulu|kemarin|sebelum|riwayat/.test(q)) {
    for (const product of list) {
      const history = product.history.filter((item) => !supplier || item.supplier === supplier).slice(0, 3)
      if (!history.length) {
        lines.push(`${product.name}: belum ada harga${supplier ? ` dari ${supplier}` : ''}.`)
        continue
      }
      lines.push(
        `${product.name}${supplier ? ` (${supplier})` : ''}: ${history
          .map((item) => `${tgl(item.date)} ${rupiah(Math.round(item.basePrice))}${supplier ? '' : ` ${item.supplier}`}`)
          .join(' • ')} per ${unitLabel(product.baseUnit)}.`,
      )
      history.forEach((item) => sources.push(purchaseSource(item)))
      if (supplier) {
        const other = latestPerSupplier(product).find((item) => item.supplier !== supplier)
        if (other) lines.push(`Pembanding: ${other.supplier} ${per(other.basePrice, product.baseUnit)} (${tgl(other.date)}).`)
      }
    }
    return done()
  }

  for (const product of list) {
    const cost = product.latestCost
    lines.push(
      `${product.name}: jual ${per(product.sellPrice, product.baseUnit)}${cost ? `, beli ${rupiah(Math.round(cost.basePrice))} (${cost.supplier}, ${tgl(cost.date)})` : ''}.`,
    )
    if (cost) sources.push(purchaseSource(cost))
  }
  return done()
}

/* ---------- "A sama B murah mana" ---------- */

function compareAnswer(question: string, branch: Branch, data: TokoData): Answer | null {
  const parts = question.split(/\s+(?:sama|vs\.?|versus|atau|dengan|dan)\s+/i)
  if (parts.length < 2) return null
  const products = data.products.filter((product) => product.branch === branch)
  const sides = parts.slice(0, 2).map((part) => {
    const suppliers = findSuppliers(part, data)
    const supplier = suppliers[0]?.name
    const tokens = searchTokens(stripSuppliers(part, suppliers)).filter((token) => !STOP_WORDS.has(token))
    const candidates = products.filter(
      (product) =>
        (!tokens.length || matchesQuery(product.name, tokens)) &&
        (!supplier || product.history.some((item) => item.supplier === supplier)),
    )
    return { supplier, tokens, candidates }
  })
  // Bandingkan barang sejenis: pakai kategori dari sisi yang paling spesifik.
  const specific = [...sides].filter((side) => side.candidates.length).sort((a, b) => a.candidates.length - b.candidates.length)[0]
  const categories = new Set(specific?.candidates.map((product) => product.category))
  const resolved = sides.map(({ supplier, tokens, candidates }) => {
    const sameKind = candidates.filter((product) => categories.has(product.category))
    const offers = (sameKind.length ? sameKind : candidates)
      .flatMap((product) => latestPerSupplier(product, supplier).map((offer) => ({ product, offer })))
      .sort((a, b) => a.offer.basePrice - b.offer.basePrice)
    return {
      label: [titleCase(tokens.join(' ')), supplier ? `(${supplier})` : ''].filter(Boolean).join(' '),
      empty: !tokens.length && !supplier,
      best: offers[0],
    }
  })
  if (resolved.some((item) => item.empty)) return null
  const lines: string[] = []
  const sources: Answer['sources'] = []
  for (const item of resolved) {
    if (!item.best) {
      lines.push(`${item.label}: belum ada datanya.`)
      continue
    }
    const { product, offer } = item.best
    lines.push(`${item.label}: ${product.name} ${per(offer.basePrice, product.baseUnit)} (${offer.supplier}, ${tgl(offer.date)}).`)
    sources.push(purchaseSource(offer))
  }
  const [a, b] = resolved
  if (a.best && b.best) {
    if (a.best.product.baseUnit !== b.best.product.baseUnit) lines.push('Satuannya beda, tidak bisa dibandingkan langsung.')
    else {
      const diff = a.best.offer.basePrice - b.best.offer.basePrice
      lines.push(diff === 0 ? 'Harganya sama.' : `Lebih murah: ${diff < 0 ? a.label : b.label}, beda ${rupiah(Math.abs(Math.round(diff)))}.`)
    }
  }
  return { branch, lines, sources }
}

/* ---------- pertanyaan tentang supplier ---------- */

function supplierAnswer(question: string, branch: Branch, data: TokoData, supplier: string): Answer {
  const q = question.toLowerCase()
  const invoices = data.invoices
    .filter((invoice) => invoice.branch === branch && invoice.supplier === supplier)
    .sort((a, b) => b.date.localeCompare(a.date))
  if (!invoices.length) return { branch, lines: [`Belum ada nota dari ${supplier}.`], sources: [] }
  const source = (invoice: (typeof invoices)[number]) => ({
    label: `Nota ${invoice.number} • ${tgl(invoice.date)}`,
    to: invoiceLink(invoice.number),
  })

  if (/bayar|lunas|tagihan|hutang|utang|tempo/.test(q)) {
    const open = invoices.filter((invoice) => invoice.status !== 'Lunas')
    if (!open.length) {
      const lastPaid = invoices.find((invoice) => invoice.paidDates.length)
      return {
        branch,
        lines: [`Sudah lunas semua ✓${lastPaid ? ` Terakhir bayar ${tgl(lastPaid.paidDates.at(-1)!)}.` : ''}`],
        sources: lastPaid ? [source(lastPaid)] : [],
      }
    }
    const total = open.reduce((sum, invoice) => sum + invoice.remainingBalance, 0)
    return {
      branch,
      tone: 'warning',
      lines: [
        `Belum lunas: ${open.length} nota, sisa ${rupiah(total)}.`,
        ...open.map(
          (invoice) => `• ${invoice.number}: sisa ${rupiah(invoice.remainingBalance)}, tempo ${tgl(invoice.dueDate)}`,
        ),
      ],
      sources: open.map(source),
    }
  }

  const recent = invoices.slice(0, 3)
  return {
    branch,
    lines: [
      `Barang ${supplier} terakhir datang ${tgl(recent[0].date)}.`,
      ...recent.map((invoice) => `• ${tgl(invoice.date)}: ${invoice.items.length} barang, ${invoice.status.toLowerCase()}`),
    ],
    sources: recent.map(source),
  }
}

/* ---------- jawaban utama ---------- */

export function answerQuestion(question: string, currentBranch: Branch, data: TokoData): Answer {
  const q = question.toLowerCase()
  const branch: Branch = /\bgading\b/.test(q) ? 'Gading' : /\bpalur\b/.test(q) ? 'Palur' : currentBranch
  const products = data.products.filter((product) => product.branch === branch)
  const invoices = data.invoices.filter((invoice) => invoice.branch === branch)

  const money = parseMoney(question)
  const wantsInput =
    money.some((item) => !item.shipping) &&
    (/\b(catat|catatkan|input|masukkan|masukin|tambah|tambahkan|update|simpan|ubah|ganti|jadi|jadikan|naik|turun|baru|sekarang)\b/.test(q) ||
      /harga\s+(beli|jual|baru)|\bhpp\b/.test(q))
  if (wantsInput) return inputAnswer(question, branch, data, money)

  const suppliers = findSuppliers(question, data)
  if (/murah|mahal/.test(q)) {
    const compared = compareAnswer(question, branch, data)
    if (compared) return compared
  }

  const withoutPack = question.replace(
    /\b(satu|1)\s+(koli|pack|pak|roll|rol|bal|lbr|lembar|meter|mtr|kg|krg|karung|dus|gross|pcs|gallon|galon)\b/gi,
    ' ',
  )
  const tokens = searchTokens(stripSuppliers(withoutPack, suppliers)).filter((token) => !STOP_WORDS.has(token))
  const matches = tokens.length ? products.filter((product) => matchesQuery(product.name, tokens)) : []
  if (matches.length) return productAnswer(question, branch, matches, suppliers[0]?.name)
  if (suppliers.length && !tokens.length) return supplierAnswer(question, branch, data, suppliers[0].name)

  if (/\buang\b|saldo|\bkas\b|cashflow|cash flow|\bduit\b/.test(q)) {
    const month = todayISO().slice(0, 7)
    const total = data.accounts
      .filter((account) => account.branch === branch)
      .reduce((sum, account) => sum + account.balance, 0)
    const incoming = data.income
      .filter((item) => item.branch === branch && item.date.startsWith(month))
      .reduce((sum, item) => sum + item.amount, 0)
    const outgoing = data.payments
      .filter((item) => item.branch === branch && item.date.startsWith(month))
      .reduce((sum, item) => sum + item.amount, 0)
    return {
      branch,
      lines: [
        `Uang tercatat: ${rupiah(total)}.`,
        `Bulan ini masuk ${rupiah(incoming)}, keluar ${rupiah(outgoing)}.`,
        'Uang tunai di laci belum termasuk.',
      ],
      sources: [{ label: `Buku Uang • bulan ini`, to: '/app/buku-uang' }],
    }
  }

  if (/laris|laku|kelarisan|klasifikasi|klaster/.test(q)) {
    const since = new Date()
    since.setDate(since.getDate() - 30)
    const from = since.toISOString().slice(0, 10)
    const ranked = products
      .map((product) => {
        const sales = product.movements.filter((item) => item.type === 'keluar' && item.date >= from)
        const sold = sales.reduce((sum, item) => sum + item.baseQuantity, 0)
        return { product, sold, value: sold * product.sellPrice, lastSale: sales[0] }
      })
      .sort((a, b) => b.value - a.value)
    const top = ranked.filter((item) => item.sold > 0).slice(0, 5)
    const slow = ranked.filter((item) => item.sold === 0).slice(0, 3)
    return {
      branch,
      lines: [
        'Paling laris (30 hari):',
        ...top.map(({ product, sold }) => `• ${product.name} — ${qty(sold, product.baseUnit)}`),
        ...(slow.length ? ['Belum laku:', ...slow.map(({ product }) => `• ${product.name}`)] : []),
      ],
      sources: top.filter((item) => item.lastSale).map(({ lastSale }) => movementSource(lastSale!)),
    }
  }

  if (/hampir habis|menipis|stok rendah|habis|minimum|rekomendasi beli|perlu beli/.test(q)) {
    const low = products
      .filter((product) => product.status !== 'Aman')
      .sort((a, b) => a.stock / Math.max(1, a.minStock) - b.stock / Math.max(1, b.minStock))
    return {
      branch,
      tone: low.length ? 'warning' : undefined,
      lines: low.length
        ? [
            `${low.length} barang perlu dibeli:`,
            ...low.slice(0, 8).map((product) => `• ${product.name} — ${product.stock ? qty(product.stock, product.baseUnit) : 'habis'}`),
            ...(low.length > 8 ? [`+${low.length - 8} lainnya`] : []),
          ]
        : ['Stok aman semua ✓'],
      sources: low
        .slice(0, 8)
        .filter((product) => product.movements[0])
        .map((product) => movementSource(product.movements[0])),
    }
  }

  if (/\bbeli\b.*\bjual\b|\bjual\b.*\bbeli\b|banding|selisih/.test(q)) {
    const tight = products
      .filter((product) => product.latestCost)
      .map((product) => ({ product, cost: product.latestCost!, gap: (product.sellPrice - product.latestCost!.basePrice) / product.sellPrice }))
      .sort((a, b) => a.gap - b.gap)
      .slice(0, 5)
    return {
      branch,
      lines: tight.length
        ? [
            'Selisih paling tipis:',
            ...tight.map(({ product, gap }) => `• ${product.name} — ${pct(gap)}`),
            'Sebut nama barangnya untuk detail.',
          ]
        : ['Belum ada harga beli tercatat.'],
      sources: tight.map(({ cost }) => purchaseSource(cost)),
    }
  }

  if (/belum lunas|belum bayar|belum dibayar|tagihan/.test(q)) {
    const open = invoices.filter((invoice) => invoice.status !== 'Lunas')
    const remaining = open.reduce((sum, invoice) => sum + invoice.remainingBalance, 0)
    return {
      branch,
      lines: [open.length ? `${open.length} nota belum lunas, sisa ${rupiah(remaining)}.` : 'Semua nota sudah lunas ✓'],
      sources: open.map((invoice) => ({
        label: `${invoice.supplier} • ${invoice.number}`,
        to: invoiceLink(invoice.number),
      })),
    }
  }

  if (/transfer|qris|masuk hari|pemasukan/.test(q)) {
    const today = todayISO()
    const items = data.income.filter(
      (item) => item.branch === branch && item.date === today && (q.includes('qris') ? item.method === 'QRIS' : true),
    )
    const total = items.reduce((sum, item) => sum + item.amount, 0)
    return {
      branch,
      lines: [items.length ? `Masuk hari ini ${rupiah(total)}.` : 'Belum ada uang masuk hari ini.'],
      sources: items.map((item) => ({ label: `${item.method} • ${tgl(item.date)}`, to: '/app/buku-uang' })),
    }
  }

  if (/modal|di bawah|rugi/.test(q)) {
    const under = products.filter((product) => product.latestCost && product.sellPrice < product.latestCost.basePrice)
    return {
      branch,
      tone: under.length ? 'warning' : undefined,
      lines: [under.length ? `Dijual rugi: ${under.map((item) => item.name).join(', ')}.` : 'Tidak ada barang yang dijual rugi ✓'],
      sources: under.map((product) => purchaseSource(product.latestCost!)),
    }
  }

  if (q.includes('acosys')) {
    const notRecorded = invoices.filter((invoice) => !invoice.acosysRecorded)
    return {
      branch,
      lines: [notRecorded.length ? `${notRecorded.length} nota belum masuk ACOSYS.` : 'Semua nota sudah di ACOSYS ✓'],
      sources: notRecorded.map((invoice) => ({ label: `Nota ${invoice.number} • ${tgl(invoice.date)}`, to: invoiceLink(invoice.number) })),
    }
  }

  if (suppliers.length) return supplierAnswer(question, branch, data, suppliers[0].name)

  const productish = ['harga', 'stok', 'beli', 'supplier', 'murah', 'kapan', 'isi'].some((word) => q.includes(word))
  return {
    branch,
    lines: [
      productish && tokens.length
        ? `"${tokens.join(' ')}" belum ketemu. Coba tulis seperti di nota.`
        : 'Maaf, belum paham. Coba tekan salah satu contoh di atas.',
    ],
    sources: [],
  }
}
