'use client'

import Image from 'next/image'
import NextLink from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  createContext,
  type FormEvent,
  type ReactNode,
  useContext,
  useEffect,
  useState,
  useTransition,
} from 'react'
import { logoutAction, recordPaymentAction } from '@/app/(frontend)/actions'
import {
  type AccountView,
  type Branch,
  branchCode,
  type IncomeView,
  type InvoiceView,
  type PaymentView,
  type ProductView,
  rupiah,
  shortDate,
  type TokoData,
} from '@/lib/toko-types'

type PaymentMethod = 'bca' | 'bri' | 'cash'
type Invoice = InvoiceView
type Payment = PaymentView

type InstallEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}
type StoreContext = {
  branch: Branch | null
  setBranch: (branch: Branch | null) => void
  invoices: Invoice[]
  payments: Payment[]
  customerIncome: IncomeView[]
  balances: AccountView[]
  products: ProductView[]
  allowedBranches: Branch[]
}

const TokoContext = createContext<StoreContext | null>(null)

function Link({
  to,
  className,
  children,
}: {
  to: string
  className?: string
  children: ReactNode
}) {
  return (
    <NextLink href={to} className={className}>
      {children}
    </NextLink>
  )
}

function Navigate({ to }: { to: string; replace?: boolean }) {
  const router = useRouter()
  useEffect(() => router.replace(to), [router, to])
  return null
}

const useNavigate = () => {
  const router = useRouter()
  return (to: string) => router.push(to)
}

const iconPaths = {
  ledger: (
    <>
      <path d="M7 3.5h10a2 2 0 0 1 2 2v15H7a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2Z" />
      <path d="M9 3.5v17M12 8h4M12 12h4M12 16h3" />
    </>
  ),
  cash: (
    <>
      <rect x="3" y="6" width="18" height="13" rx="3" />
      <path d="M7 10a2 2 0 0 0 2-2h6a2 2 0 0 0 2 2v5a2 2 0 0 0-2 2H9a2 2 0 0 0-2-2v-5Z" />
      <circle cx="12" cy="12.5" r="2" />
    </>
  ),
  tag: (
    <>
      <path d="m20 13-7 7-9-9V4h7l9 9Z" />
      <circle cx="8.5" cy="8.5" r="1.25" />
    </>
  ),
  ask: (
    <>
      <path d="M20 11.5a7.5 7.5 0 0 1-8 7.5 9 9 0 0 1-3.5-.7L4 20l1.4-4A7.8 7.8 0 0 1 4 11.5 7.5 7.5 0 0 1 12 4a7.5 7.5 0 0 1 8 7.5Z" />
      <path d="M9.7 9.5a2.4 2.4 0 0 1 4.6 1c0 1.8-2.3 1.8-2.3 3M12 16.5h.01" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10" width="14" height="10" rx="3" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </>
  ),
  bell: (
    <>
      <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </>
  ),
}

function Icon({ name }: { name: keyof typeof iconPaths }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {iconPaths[name]}
    </svg>
  )
}

function MenuIllustration({ name }: { name: 'ledger' | 'cash' | 'tag' | 'ask' }) {
  const rays = (
    <g className="menu-rays">
      <path d="M99 14v-9M106 18l7-6M109 26h8" />
    </g>
  )
  if (name === 'ledger')
    return (
      <svg className="menu-illustration" viewBox="-5 -5 132 100" aria-hidden="true">
        {rays}
        <path
          className="menu-soft"
          d="M13 25c17-5 31-3 47 7 16-10 30-12 47-7v49c-16-4-30-2-47 8-17-10-31-12-47-8Z"
        />
        <path
          className="menu-fill"
          d="M18 20c15-3 28 0 42 9v47c-14-9-27-12-42-9Zm84 0c-15-3-28 0-42 9v47c14-9 27-12 42-9Z"
        />
        <path
          className="menu-line"
          d="M18 20c15-3 28 0 42 9 14-9 27-12 42-9v47c-15-3-28 0-42 9-14-9-27-12-42-9Zm42 9v47M28 34c8-1 15 1 22 5m-22 9c8-1 15 1 22 5m42-19c-8-1-15 1-22 5m22 9c-8-1-15 1-22 5"
        />
        <path className="menu-accent" d="m52 70 8 6 8-6v15l-8-4-8 4Z" />
      </svg>
    )
  if (name === 'cash')
    return (
      <svg className="menu-illustration" viewBox="-5 -5 132 100" aria-hidden="true">
        {rays}
        <path className="money-paper" d="m45 25 45-14 8 29-45 14Z" />
        <circle className="money-dot" cx="72" cy="32" r="8" />
        <path
          className="menu-soft"
          d="M17 31h75c8 0 13 5 13 13v31H24c-8 0-13-5-13-13V38c0-4 2-7 6-7Z"
        />
        <path
          className="menu-fill"
          d="M19 27h72c7 0 11 4 11 11v36H25c-8 0-12-4-12-12V35c0-5 2-8 6-8Z"
        />
        <path
          className="menu-line"
          d="M19 27h72c7 0 11 4 11 11v36H25c-8 0-12-4-12-12V35c0-5 2-8 6-8Zm5 11h55"
        />
        <rect className="menu-accent" x="76" y="43" width="38" height="22" rx="8" />
        <rect className="menu-line" x="76" y="43" width="38" height="22" rx="8" />
        <circle className="money-dot" cx="91" cy="54" r="5" />
        <path className="wallet-stitch" d="M25 68h42" />
      </svg>
    )
  if (name === 'tag')
    return (
      <svg className="menu-illustration" viewBox="-5 -5 132 100" aria-hidden="true">
        {rays}
        <path className="box-left" d="M19 31 58 12l1 48-40 20Z" />
        <path className="box-right" d="m59 12 42 14-2 48-40-14Z" />
        <path className="box-top" d="M19 31 58 12l43 14-42 20Z" />
        <path
          className="menu-line"
          d="M19 31 58 12l43 14-2 48-40 9-40-23Zm40 15v37M19 31l40 15 42-20"
        />
        <path className="box-tape" d="m43 19 17-7 14 5-18 8v17l-13-5Z" />
        <rect className="box-label" x="65" y="60" width="25" height="12" rx="2" />
        <path className="barcode" d="M70 63v6m4-6v6m4-6v6m5-6v6" />
      </svg>
    )
  return (
    <svg className="menu-illustration" viewBox="-5 -5 132 100" aria-hidden="true">
      {rays}
      <path
        className="bubble-back"
        d="M57 42c0-17 13-27 31-27 17 0 29 10 29 25 0 14-12 24-29 24-5 0-10-1-14-3l-14 6 4-13c-4-3-7-7-7-12Z"
      />
      <path
        className="menu-line"
        d="M57 42c0-17 13-27 31-27 17 0 29 10 29 25 0 14-12 24-29 24-5 0-10-1-14-3l-14 6 4-13c-4-3-7-7-7-12Z"
      />
      <circle className="bubble-dot" cx="85" cy="41" r="3" />
      <circle className="bubble-dot" cx="98" cy="41" r="3" />
      <path
        className="menu-fill"
        d="M7 35C7 16 22 5 43 5c22 0 37 12 37 31 0 18-15 30-37 30-5 0-11-1-16-3L11 72l5-16c-6-5-9-12-9-21Z"
      />
      <path
        className="menu-line"
        d="M7 35C7 16 22 5 43 5c22 0 37 12 37 31 0 18-15 30-37 30-5 0-11-1-16-3L11 72l5-16c-6-5-9-12-9-21Z"
      />
      <path
        className="question-mark"
        d="M34 26c1-7 6-10 12-10 7 0 12 4 12 10 0 9-11 9-11 17m0 9h.01"
      />
    </svg>
  )
}

function Brand() {
  return (
    <span className="brand" aria-label="Toko Santri">
      <span />
      <i />
    </span>
  )
}

function Kitten() {
  return (
    <Image
      className="kitten"
      src="/assets/hello-kitty.png"
      width="512"
      height="512"
      alt="Hello Kitty melambaikan tangan"
    />
  )
}

function StoreRoot({
  data,
  allowedBranches,
  children,
}: {
  data: TokoData
  allowedBranches: Branch[]
  children: ReactNode
}) {
  const [branch, updateBranch] = useState<Branch | null>(allowedBranches[0] ?? null)

  useEffect(() => {
    const stored = localStorage.getItem('toko-santri-branch') as Branch | null
    updateBranch(stored && allowedBranches.includes(stored) ? stored : (allowedBranches[0] ?? null))
    if ('serviceWorker' in navigator)
      navigator.serviceWorker.register('/sw.js').catch(() => undefined)
  }, [allowedBranches])

  function setBranch(value: Branch | null) {
    if (value) localStorage.setItem('toko-santri-branch', value)
    else localStorage.removeItem('toko-santri-branch')
    updateBranch(value)
  }

  return (
    <TokoContext.Provider
      value={{
        branch,
        setBranch,
        invoices: data.invoices,
        payments: data.payments,
        customerIncome: data.income,
        balances: data.accounts,
        products: data.products,
        allowedBranches,
      }}
    >
      {children}
    </TokoContext.Provider>
  )
}

const useStore = () => {
  const value = useContext(TokoContext)
  if (!value) throw new Error('TokoApp must be rendered inside StoreRoot.')
  return value
}

function Welcome() {
  const { branch } = useStore()
  const navigate = useNavigate()
  const [installPrompt, setInstallPrompt] = useState<InstallEvent | null>(null)
  const [showIOS, setShowIOS] = useState(false)
  const [message, setMessage] = useState('')
  const [welcomed, setWelcomed] = useState(false)

  useEffect(() => {
    setWelcomed(localStorage.getItem('toko-santri-welcomed') === 'yes')
    const handler = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as InstallEvent)
    }
    const installed = () => next()
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', installed)
    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', installed)
    }
  }, [])

  const next = () => {
    localStorage.setItem('toko-santri-welcomed', 'yes')
    setWelcomed(true)
    navigate(branch ? '/app' : '/login')
  }
  async function install() {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      next()
      return
    }
    if (installPrompt) {
      await installPrompt.prompt()
      const result = await installPrompt.userChoice
      setInstallPrompt(null)
      if (result.outcome === 'accepted') next()
    } else if (/iphone|ipad|ipod/i.test(navigator.userAgent)) setShowIOS(true)
    else if (window.top !== window.self) setMessage('Instal langsung aktif di situs publik.')
    else setMessage('Instal langsung belum tersedia di browser ini.')
  }

  if (welcomed) return <Navigate to={branch ? '/app' : '/login'} replace />

  return (
    <main className="welcome">
      <div className="glow" />
      <section className="welcome-card">
        <Brand />
        <h1>Pasang Toko Santri</h1>
        <p className="intro">Ikonnya muncul di Beranda HP.</p>
        <div className="phone" aria-hidden="true">
          <div>
            <b />
            <i />
          </div>
          <span />
          <em />
          <section>
            <i />
            <i />
            <i />
            <i />
          </section>
        </div>
        <div className="actions">
          <button className="primary" onClick={install}>
            Pasang Aplikasi
          </button>
          <button onClick={next}>Lewati</button>
        </div>
      </section>
      {showIOS && (
        <div className="backdrop" onClick={() => setShowIOS(false)}>
          <section className="sheet" onClick={(e) => e.stopPropagation()}>
            <i />
            <h2>Pasang di iPhone</h2>
            <ol>
              <li>
                Ketuk tombol <b>Bagikan</b> di Safari.
              </li>
              <li>
                Pilih <b>Tambah ke Layar Utama</b>.
              </li>
              <li>
                Ketuk <b>Tambah</b>.
              </li>
            </ol>
            <button className="primary" onClick={next}>
              Saya Mengerti
            </button>
          </section>
        </div>
      )}
      {message && <Toast text={message} />}
    </main>
  )
}

function BranchPicker() {
  const { setBranch, allowedBranches } = useStore()
  const navigate = useNavigate()
  const choose = (branch: Branch) => {
    setBranch(branch)
    navigate('/app')
  }
  return (
    <main className="page branch-page">
      <div className="brand-lockup">
        <Brand />
        <b>Toko Santri</b>
      </div>
      <section className="branch-content">
        <h1>Pilih Toko</h1>
        <div className="branch-options">
          {allowedBranches.map((item) => (
            <button className="branch-card" key={item} onClick={() => choose(item)}>
              <span>{item[0]}</span>
              <div>
                <b>{item}</b>
              </div>
              <em>›</em>
            </button>
          ))}
        </div>
      </section>
    </main>
  )
}

function Home() {
  const { branch, setBranch, invoices } = useStore()
  const navigate = useNavigate()
  const unpaid = invoices.filter(
    (invoice) => invoice.branch === branch && invoice.status !== 'Lunas',
  ).length
  const cards = [
    ['Buku Besar', 'ledger', '/app/buku-besar', 'rose'],
    ['Buku Uang', 'cash', '/app/buku-uang', 'pink'],
    ['Harga Barang', 'tag', '/app/harga-barang', 'peach'],
    ['Tanya Data', 'ask', '/app/tanya-data', 'lilac'],
  ] as const
  return (
    <main className="page home">
      <div className="home-brand">
        <Brand />
        <b>Toko Santri</b>
      </div>
      <header className="store-switch">
        <div>
          <h1>{branch}</h1>
        </div>
        <button
          onClick={() => {
            setBranch(null)
            navigate('/pilih-toko')
          }}
        >
          ⇄ Ganti Toko
        </button>
      </header>
      <section className="greeting">
        <Kitten />
        <div className="speech-bubble">
          <svg viewBox="0 0 220 150" preserveAspectRatio="none" aria-hidden="true">
            <path
              className="speech-shape"
              d="M24 99C12 87 6 74 6 59 6 25 47 5 109 5c63 0 105 26 105 69 0 42-41 71-104 71-37 0-66-10-83-28L7 130l15-26Z"
            />
          </svg>
          <h2>Mau lihat apa, Bu?</h2>
        </div>
      </section>
      <section className="features">
        {cards.map(([name, icon, to, color]) => (
          <Link className="feature" key={name} to={to}>
            <span className={color}>
              <MenuIllustration name={icon} />
            </span>
            <b>{name}</b>
          </Link>
        ))}
      </section>
      <Link className="reminder" to="/app/buku-besar">
        <span>
          <Icon name="bell" />
        </span>
        <div>
          <b>{unpaid} nota belum lunas</b>
        </div>
        <em>›</em>
      </Link>
    </main>
  )
}

function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className="inner-head">
      <Link to="/app" aria-label="Kembali">
        ‹
      </Link>
      <div>
        <small>{subtitle}</small>
        <h1>{title}</h1>
      </div>
    </header>
  )
}

function Ledger() {
  const { branch, invoices, payments } = useStore()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('Semua')
  const navigate = useNavigate()
  const branchInvoices = invoices.filter((invoice) => invoice.branch === branch)
  const filtered = branchInvoices.filter((invoice) => {
    const haystack =
      `${invoice.supplier} ${invoice.number} ${invoice.date} ${shortDate(invoice.date)} ${invoice.items.map((item) => item.product).join(' ')}`.toLowerCase()
    return (
      haystack.includes(query.toLowerCase()) && (status === 'Semua' || invoice.status === status)
    )
  })
  const openTotal = branchInvoices
    .filter((invoice) => invoice.status !== 'Lunas')
    .reduce(
      (sum, invoice) =>
        sum +
        invoice.total -
        payments
          .filter((payment) => payment.invoiceId === invoice.id)
          .reduce((paid, payment) => paid + payment.amount, 0),
      0,
    )
  return (
    <main className="page inner">
      <PageHeader title="Buku Besar" subtitle={`${branch}`} />
      <section>
        <div className="summary">
          <span>
            <small>Sisa belum dibayar</small>
            <b>{rupiah(openTotal)}</b>
          </span>
          <span>
            <small>Nota aktif</small>
            <b>{branchInvoices.filter((item) => item.status !== 'Lunas').length} nota</b>
          </span>
        </div>
        <label className="search">
          <span>⌕</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Supplier, nota, produk, atau tanggal"
          />
        </label>
        <div className="filters">
          {['Semua', 'Belum Bayar', 'Sebagian', 'Lunas'].map((item) => (
            <button
              className={status === item ? 'active' : ''}
              onClick={() => setStatus(item)}
              key={item}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="invoice-list">
          {filtered.map((invoice) => (
            <InvoiceCard
              key={invoice.id}
              invoice={invoice}
              onOpen={() => navigate(`/app/buku-besar/${encodeURIComponent(invoice.number)}`)}
            />
          ))}
        </div>
        {!filtered.length && <Empty text="Nota tidak ditemukan. Coba kata pencarian lain." />}
      </section>
    </main>
  )
}

function InvoiceCard({ invoice, onOpen }: { invoice: Invoice; onOpen: () => void }) {
  return (
    <article className="invoice-card" onClick={onOpen}>
      <div className="invoice-top">
        <span className={`status ${invoice.status.replace(' ', '-').toLowerCase()}`}>
          {invoice.status}
        </span>
        <small>{shortDate(invoice.date)}</small>
      </div>
      <h2>{invoice.supplier}</h2>
      <p>{invoice.number}</p>
      <div className="invoice-products">
        {invoice.items.map((item) => (
          <span key={item.product}>
            {item.product}{' '}
            <b>
              {item.quantity} {item.unit}
            </b>
          </span>
        ))}
      </div>
      <footer>
        <span>
          <small>Total</small>
          <b>{rupiah(invoice.total)}</b>
        </span>
        <button>Lihat rincian</button>
      </footer>
    </article>
  )
}

function InvoiceDetail() {
  const { invoices, payments } = useStore()
  const pathname = usePathname()
  const invoiceId = pathname.split('/').filter(Boolean).at(-1)
  const navigate = useNavigate()
  const invoice = invoices.find((item) => item.id === invoiceId || item.number === invoiceId)
  const [showPayment, setShowPayment] = useState(false)
  const [toast, setToast] = useState('')
  if (!invoice) return <Navigate to="/app/buku-besar" replace />
  const invoicePayments = payments.filter((payment) => payment.invoiceId === invoice.id)
  const paid = invoicePayments.reduce((sum, payment) => sum + payment.amount, 0)
  const remaining = invoice.remainingBalance
  return (
    <main className="page inner">
      <PageHeader title={invoice.number} subtitle={`${invoice.branch} • ${invoice.supplier}`} />
      <section>
        <div className="detail-hero">
          <span className={`status ${invoice.status.replace(' ', '-').toLowerCase()}`}>
            {invoice.status}
          </span>
          <p>
            Tanggal nota {shortDate(invoice.date)} • Jatuh tempo {shortDate(invoice.dueDate)}
          </p>
          <h2>{rupiah(invoice.total)}</h2>
          <div>
            <span>
              Sudah dibayar <b>{rupiah(paid)}</b>
            </span>
            <span>
              Sisa <b>{rupiah(remaining)}</b>
            </span>
          </div>
        </div>
        <section className="detail-block">
          <h3>Barang masuk</h3>
          {invoice.items.map((item) => (
            <div className="item-row" key={item.product}>
              <div>
                <b>{item.product}</b>
                <small>
                  {item.quantity} {item.unit} × {rupiah(item.unitPrice)}
                </small>
              </div>
              <strong>{rupiah(item.total)}</strong>
            </div>
          ))}
        </section>
        <section className="detail-block">
          <h3>Riwayat pembayaran</h3>
          {invoicePayments.map((payment) => (
            <div className="payment-row" key={payment.id}>
              <span>✓</span>
              <div>
                <b>{rupiah(payment.amount)}</b>
                <small>
                  {shortDate(payment.date)} • {payment.method} •{' '}
                  {payment.proofUrl ? (
                    <a href={payment.proofUrl} target="_blank" rel="noreferrer">
                      {payment.proofName}
                    </a>
                  ) : (
                    payment.proofName
                  )}
                </small>
              </div>
              <em className={payment.acosysRecorded ? 'done' : ''}>
                {payment.acosysRecorded ? 'Sudah di ACOSYS' : 'Belum di ACOSYS'}
              </em>
            </div>
          ))}
          {!invoicePayments.length && <p className="muted">Belum ada pembayaran.</p>}
        </section>
        {invoice.status !== 'Lunas' && (
          <button className="primary sticky-action" onClick={() => setShowPayment(true)}>
            Sudah Bayar
          </button>
        )}
        <button className="secondary-action" onClick={() => navigate('/app/buku-uang')}>
          Lihat di Buku Uang
        </button>
      </section>
      {showPayment && (
        <PaymentModal
          invoice={invoice}
          remaining={remaining}
          onClose={() => setShowPayment(false)}
          onSaved={() => {
            setShowPayment(false)
            setToast('Pembayaran tersimpan dan otomatis muncul di Buku Uang.')
          }}
        />
      )}{' '}
      {toast && <Toast text={toast} />}
    </main>
  )
}

function PaymentModal({
  invoice,
  remaining,
  onClose,
  onSaved,
}: {
  invoice: Invoice
  remaining: number
  onClose: () => void
  onSaved: () => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [amount, setAmount] = useState(String(remaining))
  const [method, setMethod] = useState<PaymentMethod>('bca')
  const [proofName, setProofName] = useState('')
  const [acosys, setAcosys] = useState(false)
  const [error, setError] = useState('')
  function submit(event: FormEvent) {
    event.preventDefault()
    const numericAmount = Number(amount)
    if (!date || numericAmount <= 0 || numericAmount > remaining || !proofName)
      return setError('Lengkapi data dan pastikan jumlah tidak melebihi sisa tagihan.')
    const formData = new FormData(event.currentTarget as HTMLFormElement)
    formData.set('invoiceId', invoice.id)
    formData.set('amount', String(numericAmount))
    formData.set('date', date)
    formData.set('method', method)
    if (acosys) formData.set('acosysRecorded', 'on')
    startTransition(async () => {
      const result = await recordPaymentAction(formData)
      if (!result.ok) {
        setError(result.error ?? 'Pembayaran gagal disimpan.')
        return
      }
      router.refresh()
      onSaved()
    })
  }
  return (
    <div className="backdrop" onClick={onClose}>
      <form className="payment-modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="modal-head">
          <div>
            <small>KONFIRMASI PEMBAYARAN</small>
            <h2>{invoice.supplier}</h2>
            <p>
              {invoice.number} • Sisa {rupiah(remaining)}
            </p>
          </div>
          <button type="button" onClick={onClose}>
            ×
          </button>
        </div>
        <label>
          Tanggal pembayaran
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label>
          Jumlah dibayar
          <div className="money-input">
            <span>Rp</span>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
        </label>
        <label>
          Metode
          <select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
            <option value="bca">Transfer BCA</option>
            <option value="bri">Transfer BRI</option>
            <option value="cash">Tunai</option>
          </select>
        </label>
        <label>
          Bukti pembayaran
          <span className="upload">
            <input
              type="file"
              name="proof"
              accept="image/*,.pdf"
              onChange={(e) => setProofName(e.target.files?.[0]?.name || '')}
            />
            {proofName || 'Pilih foto atau PDF'}
          </span>
        </label>
        <label className="check">
          <input type="checkbox" checked={acosys} onChange={(e) => setAcosys(e.target.checked)} />
          <span>
            <b>Sudah dicatat di ACOSYS</b>
            <small>Hanya penanda. Integrasi ACOSYS masih dinonaktifkan.</small>
          </span>
        </label>
        {error && <p className="form-error">{error}</p>}
        <button className="primary" type="submit" disabled={pending}>
          {pending ? 'Menyimpan...' : 'Simpan Pembayaran'}
        </button>
      </form>
    </div>
  )
}

function CashBook() {
  const { branch, payments, invoices, customerIncome, balances } = useStore()
  const [tab, setTab] = useState<'Transaksi' | 'Saldo'>('Transaksi')
  const branchPayments = payments.filter((payment) => payment.branch === branch)
  const income = customerIncome.filter((item) => item.branch === branch)
  const transactions = [
    ...income.map((item) => ({
      id: item.id,
      date: item.date,
      title: item.customer,
      detail: `${item.method} • ${item.reference}`,
      amount: item.amount,
      type: 'in' as const,
      source: '',
    })),
    ...branchPayments.map((payment) => {
      const invoice = invoices.find((item) => item.id === payment.invoiceId)!
      return {
        id: payment.id,
        date: payment.date,
        title: `Bayar ${invoice.supplier}`,
        detail: `${payment.method} • ${invoice.number}`,
        amount: payment.amount,
        type: 'out' as const,
        source: invoice.number,
      }
    }),
  ].sort((a, b) => b.date.localeCompare(a.date))
  const branchBalances = balances.filter((item) => item.branch === branch)
  const totalBalance = branchBalances.reduce((sum, item) => sum + item.balance, 0)
  return (
    <main className="page inner">
      <PageHeader title="Buku Uang" subtitle={`${branch}`} />
      <section>
        <div className="balance">
          <small>Total kas & bank</small>
          <b>{rupiah(totalBalance)}</b>
          <span>Saldo dari transaksi tercatat</span>
        </div>
        <div className="segment">
          <button
            className={tab === 'Transaksi' ? 'active' : ''}
            onClick={() => setTab('Transaksi')}
          >
            Transaksi
          </button>
          <button className={tab === 'Saldo' ? 'active' : ''} onClick={() => setTab('Saldo')}>
            Saldo
          </button>
        </div>
        {tab === 'Transaksi' ? (
          <div className="list">
            {transactions.map((item) => (
              <div className="row" key={item.id}>
                <span className={`money ${item.type}`}>{item.type === 'in' ? '+' : '−'}</span>
                <div>
                  <b>{item.title}</b>
                  <small>
                    {shortDate(item.date)} • {item.detail}
                  </small>
                  {item.source && (
                    <Link to={`/app/buku-besar/${item.source}`}>Buka nota sumber</Link>
                  )}
                </div>
                <strong className={item.type}>
                  {item.type === 'in' ? '+' : '−'}
                  {rupiah(item.amount)}
                </strong>
              </div>
            ))}
          </div>
        ) : (
          <div className="balance-list">
            {branchBalances.map((item) => (
              <div key={item.name}>
                <span>
                  <b>{item.name}</b>
                  <small>Saldo tercatat</small>
                </span>
                <strong>{rupiah(item.balance)}</strong>
              </div>
            ))}
          </div>
        )}
        <p className="info-note">
          Pembayaran supplier berasal langsung dari Buku Besar agar tidak tercatat dua kali.
        </p>
      </section>
    </main>
  )
}

function Prices() {
  const { branch, products } = useStore()
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const filtered = products.filter(
    (product) =>
      product.branch === branch &&
      `${product.name} ${product.supplier}`.toLowerCase().includes(query.toLowerCase()),
  )
  return (
    <main className="page inner">
      <PageHeader title="Harga Barang" subtitle={`${branch}`} />
      <section>
        <label className="search">
          <span>⌕</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari produk atau supplier"
          />
        </label>
        <div className="product-list">
          {filtered.map((product) => {
            const latest = product.history[0]
            const warning = latest ? product.sellPrice < latest.unitPrice : false
            const open = openId === product.id
            return (
              <article className="product-card" key={product.id}>
                <button onClick={() => setOpenId(open ? null : product.id)}>
                  <div className="product-icon">□</div>
                  <span>
                    <small>{product.supplier}</small>
                    <b>{product.name}</b>
                    <em>{product.packaging}</em>
                  </span>
                  <strong>
                    {rupiah(product.sellPrice)}
                    <small>harga jual / {product.baseUnit}</small>
                  </strong>
                </button>
                {warning && latest && (
                  <p className="cost-warning">
                    ! Harga jual {rupiah(latest.unitPrice - product.sellPrice)} di bawah harga beli
                    terakhir.
                  </p>
                )}
                {open && (
                  <div className="price-history">
                    <div className="conversion">
                      <span>Konversi kemasan</span>
                      <b>
                        {product.packaging} ({product.conversion} {product.baseUnit})
                      </b>
                    </div>
                    <h3>Perbandingan harga beli</h3>
                    {product.history.map((history, index) => (
                      <div key={history.invoice}>
                        <span>
                          <i className={index ? '' : 'current'} />
                          <span>
                            <b>
                              {rupiah(history.unitPrice)} / {history.unit}
                            </b>
                            <small>
                              {shortDate(history.date)} • {history.invoice}
                            </small>
                          </span>
                        </span>
                        {index === 0 && product.history[1] && (
                          <em
                            className={
                              history.unitPrice > product.history[1].unitPrice ? 'up' : 'down'
                            }
                          >
                            {history.unitPrice > product.history[1].unitPrice ? 'Naik' : 'Turun'}{' '}
                            {rupiah(Math.abs(history.unitPrice - product.history[1].unitPrice))}
                          </em>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </article>
            )
          })}
        </div>
        {!filtered.length && <Empty text="Produk atau supplier tidak ditemukan." />}
      </section>
    </main>
  )
}

type Answer = { text: string; sources: Array<{ label: string; to: string }> }

function AskData() {
  const { branch, invoices, payments, customerIncome, products } = useStore()
  const [input, setInput] = useState('')
  const [answer, setAnswer] = useState<Answer | null>(null)
  const examples = [
    'Nota mana yang belum lunas?',
    'Berapa transfer masuk hari ini?',
    'Barang apa dijual di bawah modal?',
    'Pembayaran mana belum masuk ACOSYS?',
  ]
  function ask(question: string) {
    setInput(question)
    const q = question.toLowerCase()
    const branchInvoices = invoices.filter((invoice) => invoice.branch === branch)
    if (q.includes('belum lunas') || q.includes('belum bayar')) {
      const matches = branchInvoices.filter((invoice) => invoice.status !== 'Lunas')
      const remaining = matches.reduce(
        (sum, invoice) =>
          sum +
          invoice.total -
          payments
            .filter((payment) => payment.invoiceId === invoice.id)
            .reduce((paid, payment) => paid + payment.amount, 0),
        0,
      )
      setAnswer({
        text: matches.length
          ? `Ada ${matches.length} nota belum lunas dengan sisa total ${rupiah(remaining)}.`
          : 'Tidak ada nota yang belum lunas.',
        sources: matches.map((invoice) => ({
          label: `${invoice.number} • ${invoice.supplier}`,
          to: `/app/buku-besar/${encodeURIComponent(invoice.number)}`,
        })),
      })
    } else if (q.includes('transfer') || q.includes('qris') || q.includes('masuk hari')) {
      const today = new Date().toISOString().slice(0, 10)
      const matches = customerIncome.filter(
        (item) =>
          item.branch === branch &&
          item.date.slice(0, 10) === today &&
          (q.includes('qris') ? item.method === 'QRIS' : true),
      )
      const total = matches.reduce((sum, item) => sum + item.amount, 0)
      setAnswer({
        text: matches.length
          ? `Pemasukan hari ini adalah ${rupiah(total)} dari ${matches.length} transaksi.`
          : 'Tidak ada transaksi yang cocok pada catatan cabang ini.',
        sources: matches.map((item) => ({
          label: `${item.reference} • ${item.method}`,
          to: '/app/buku-uang',
        })),
      })
    } else if (q.includes('modal') || q.includes('bawah') || q.includes('harga')) {
      const matches = products.filter(
        (product) =>
          product.branch === branch &&
          product.history[0] &&
          product.sellPrice < product.history[0].unitPrice,
      )
      setAnswer({
        text: matches.length
          ? `${matches.map((item) => item.name).join(', ')} dijual di bawah harga beli terakhir. Tinjau harga jual sebelum transaksi berikutnya.`
          : 'Tidak ada produk yang dijual di bawah harga beli terakhir.',
        sources: matches.map((item) => ({
          label: `${item.name} • ${item.history[0]?.invoice ?? 'Harga terakhir'}`,
          to: '/app/harga-barang',
        })),
      })
    } else if (q.includes('acosys')) {
      const matches = branchInvoices.filter((invoice) => !invoice.acosysRecorded)
      setAnswer({
        text: matches.length
          ? `${matches.length} nota belum ditandai masuk ACOSYS. Integrasi otomatis tetap dinonaktifkan.`
          : 'Semua nota telah ditandai masuk ACOSYS.',
        sources: matches.map((invoice) => ({
          label: invoice.number,
          to: `/app/buku-besar/${encodeURIComponent(invoice.number)}`,
        })),
      })
    } else {
      setAnswer({
        text: 'Saya belum menemukan jawaban dari catatan yang tersedia. Coba tanyakan nota, transfer, QRIS, harga modal, atau status ACOSYS.',
        sources: [],
      })
    }
  }
  return (
    <main className="page inner">
      <PageHeader title="Tanya Data" subtitle={`${branch}`} />
      <section className="ask-panel">
        <div className="ask-intro">
          <span>
            <Icon name="ask" />
          </span>
          <h2>Tanyakan tentang toko</h2>
          <p>Jawaban hanya dibuat jika ada catatan sumbernya.</p>
        </div>
        <div className="suggestions">
          {examples.map((text) => (
            <button key={text} onClick={() => ask(text)}>
              {text}
            </button>
          ))}
        </div>
        {answer && (
          <div className="answer">
            <small>JAWABAN DARI DATA {branch?.toUpperCase()}</small>
            <p>{answer.text}</p>
            {answer.sources.length > 0 && (
              <div className="sources">
                <b>Sumber</b>
                {answer.sources.map((source) => (
                  <Link to={source.to} key={source.label}>
                    {source.label}
                    <span>›</span>
                  </Link>
                ))}
              </div>
            )}
            {!answer.sources.length && (
              <p className="no-source">Tidak ada angka keuangan yang dibuat tanpa sumber.</p>
            )}
          </div>
        )}
        <form
          className="ask-form"
          onSubmit={(e) => {
            e.preventDefault()
            if (input.trim()) ask(input.trim())
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Contoh: Nota mana belum lunas?"
          />
          <button aria-label="Kirim">↑</button>
        </form>
      </section>
    </main>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <div className="empty">
      <b>Tidak ada hasil</b>
      <p>{text}</p>
    </div>
  )
}
function Toast({ text }: { text: string }) {
  return (
    <div className="toast" role="status">
      {text}
    </div>
  )
}
function NotFound() {
  return (
    <main className="welcome">
      <section className="welcome-card">
        <Brand />
        <h1>Halaman tidak ditemukan</h1>
        <Link className="primary link-button" to="/app">
          Kembali ke Beranda
        </Link>
      </section>
    </main>
  )
}

export default function TokoApp({
  data,
  allowedBranches,
}: {
  data: TokoData
  allowedBranches: Branch[]
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [, startLogout] = useTransition()

  let screen: ReactNode = <NotFound />
  if (pathname === '/') screen = <Welcome />
  else if (pathname === '/pilih-toko') screen = <BranchPicker />
  else if (pathname === '/app') screen = <Home />
  else if (pathname === '/app/buku-besar') screen = <Ledger />
  else if (pathname.startsWith('/app/buku-besar/')) screen = <InvoiceDetail />
  else if (pathname === '/app/buku-uang') screen = <CashBook />
  else if (pathname === '/app/harga-barang') screen = <Prices />
  else if (pathname === '/app/tanya-data') screen = <AskData />

  const protectedScreen = pathname.startsWith('/app')
  return (
    <StoreRoot data={data} allowedBranches={allowedBranches}>
      {screen}
      {protectedScreen && (
        <button
          className="logout-button"
          onClick={() =>
            startLogout(async () => {
              await logoutAction()
              router.push('/login')
              router.refresh()
            })
          }
        >
          Keluar
        </button>
      )}
    </StoreRoot>
  )
}
