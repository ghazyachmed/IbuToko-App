export type Branch = 'Gading' | 'Palur'
export type BranchCode = 'gading' | 'palur'
export type InvoiceStatus = 'Belum Bayar' | 'Sebagian' | 'Lunas'

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
  items: Array<{
    productId: string
    product: string
    quantity: number
    unit: string
    unitPrice: number
    total: number
  }>
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
}

export type AccountView = {
  id: string
  branch: Branch
  name: string
  balance: number
}

export type ProductView = {
  id: string
  branch: Branch
  name: string
  supplier: string
  sellPrice: number
  baseUnit: string
  packaging: string
  conversion: number
  history: Array<{ date: string; invoice: string; unitPrice: number; unit: string }>
}

export type TokoData = {
  invoices: InvoiceView[]
  payments: PaymentView[]
  income: IncomeView[]
  accounts: AccountView[]
  products: ProductView[]
}

export const branchLabel = (branch: BranchCode): Branch =>
  branch === 'gading' ? 'Gading' : 'Palur'

export const branchCode = (branch: Branch): BranchCode => (branch === 'Gading' ? 'gading' : 'palur')

export const rupiah = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value)

export const shortDate = (value: string) =>
  new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
