export type Branch = 'Gading' | 'Palur'
export type BranchCode = 'gading' | 'palur'
export type InvoiceStatus = 'Belum Bayar' | 'Sebagian' | 'Lunas'
export const BRANCHES: Branch[] = ['Gading', 'Palur']

export type InvoiceItem = {
  productId: string
  product: string
  quantity: number
  unit: string
  unitPrice: number
  total: number
}

export type InvoiceView = {
  id: string
  branch: Branch
  number: string
  date: string
  dueDate: string
  supplier: string
  status: InvoiceStatus
  acosysRecorded: boolean
  total: number
  amountPaid: number
  remainingBalance: number
  /** Tanggal-tanggal pembayaran (diisi setelah transfer). */
  paidDates: string[]
  items: InvoiceItem[]
  /** Selalu true: seluruh nota di aplikasi ini adalah data simulasi. */
  simulated: true
}

export type PaymentView = {
  id: string
  branch: Branch
  invoiceId: string
  date: string
  amount: number
  method: string
  proofName: string
  proofUrl: string | null
  acosysRecorded: boolean
  simulated: true
  /** true jika dicatat pengguna di perangkat ini (localStorage). */
  local?: boolean
}

export type IncomeView = {
  id: string
  branch: Branch
  date: string
  customer: string
  method: string
  amount: number
  reference: string
  accountId: string
  simulated: true
}

export type AccountView = {
  id: string
  branch: Branch
  name: string
  openingBalance: number
  balance: number
  simulated: true
}

export type PurchaseRecord = {
  date: string
  /** 'Nota' = barang datang (Buku Besar); 'Info harga' = kabar harga dari WA/sales, belum dibeli. */
  source: 'Nota' | 'Info harga'
  /** Nomor nota supplier sumber, atau kode info harga. */
  invoice: string
  supplier: string
  quantity: number
  /** Satuan pembelian, mis. ROLL / KRG / DUS. */
  unit: string
  /** HPP per satuan (harga dari supplier). */
  unitPrice: number
  /** Ongkir per satuan yang sama. */
  shipping: number
  /** Harga beli (HPP + ongkir) setara per satuan dasar (satuan jual). */
  basePrice: number
  acosysRecorded: boolean
  note?: string
}

/** Info harga beli baru yang dicatat dari Tanya & Catat (mis. dari WA supplier). */
export type PriceEntry = {
  id: string
  branch: Branch
  productKey: string
  date: string
  supplier: string
  unit: string
  unitPrice: number
  shipping: number
  acosysRecorded: boolean
  note: string
}

/** Perubahan harga jual yang dicatat dari Tanya & Catat. */
export type SellPriceEntry = {
  id: string
  branch: Branch
  productKey: string
  date: string
  sellPrice: number
  previous: number
  acosysRecorded: boolean
}

export type StockMovement = {
  id: string
  branch: Branch
  productId: string
  date: string
  type: 'masuk' | 'keluar'
  quantity: number
  unit: string
  /** Jumlah dalam satuan dasar. */
  baseQuantity: number
  reference: string
  supplier?: string
  simulated: true
}

export type StockStatus = 'Habis' | 'Hampir habis' | 'Aman'

export type ProductView = {
  id: string
  branch: Branch
  /** Kunci nama ternormalisasi (huruf kecil) untuk mencegah duplikasi. */
  key: string
  name: string
  category: string
  /** Satuan dasar = satuan jual eceran dari katalog. */
  baseUnit: string
  purchaseUnit: string
  /** Isi 1 satuan pembelian dalam satuan dasar. */
  conversion: number
  sellPrice: number
  sellPriceChange: SellPriceEntry | null
  /** Supplier dari pembelian terakhir. */
  supplier: string
  suppliers: string[]
  minStock: number
  stock: number
  status: StockStatus
  totalIn: number
  totalOut: number
  /** Pembelian terakhir berdasarkan nota (barang benar-benar datang). */
  lastPurchase: PurchaseRecord | null
  /** Harga beli terbaru dari nota ATAU info harga, untuk cek harga jual. */
  latestCost: PurchaseRecord | null
  /** Riwayat harga beli (nota + info harga), terbaru lebih dulu. */
  history: PurchaseRecord[]
  movements: StockMovement[]
  simulated: true
}

export type TokoData = {
  invoices: InvoiceView[]
  payments: PaymentView[]
  income: IncomeView[]
  accounts: AccountView[]
  products: ProductView[]
}

export const branchCode = (branch: Branch): BranchCode => (branch === 'Gading' ? 'gading' : 'palur')

export const rupiah = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value)

export const numberID = (value: number) =>
  new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(value)

/** "22 KG", atau "22 × 1/2 LBR" agar satuan pecahan tidak terbaca 22 1/2. */
export const unitLabel = (unit: string) => unit.replace('1/2 ', '½ ')
export const qtyText = (value: number, unit: string) =>
  unit.includes('/') ? `${numberID(value)} × ${unitLabel(unit)}` : `${numberID(value)} ${unit}`

/** Tanggal disimpan sebagai 'YYYY-MM-DD' (zona waktu lokal). */
export const shortDate = (value: string) =>
  new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${value.slice(0, 10)}T12:00:00`))

export const localDate = (date: Date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export const todayISO = () => localDate(new Date())
