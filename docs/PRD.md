# PRD — Toko Santri

> Dokumen kebutuhan produk (Product Requirements Document) untuk aplikasi
> pencatatan toko **Gading** dan **Palur**. Baca dokumen ini sebelum menambah
> database, login, AI/chatbot, OCR, atau integrasi ACOSYS.
>
> Terakhir diperbarui: 22 Nov 2026 · Versi aplikasi: **v1 (data simulasi)**

---

## 1. Ringkasan

Toko Santri adalah PWA (bisa dipasang di HP/komputer) untuk **Ibu**, pemilik dua
toko (Gading dan Palur) yang mengurus keuangan sendiri. Ibu bukan orang teknis,
membaca dari HP, dan butuh jawaban cepat tanpa membuka ACOSYS atau buku catatan.

Masalah yang diselesaikan:

- Nota supplier menumpuk dan sulit dicek "sudah lunas atau belum" saat sales menagih.
- Harga beli dari supplier berubah-ubah (kabar lewat WA), padahal harga jual harus
  menyesuaikan HPP.
- ACOSYS sering telat diisi (di Gading hanya satu staf yang bisa menginput).
- Pertanyaan harian ("uang ada berapa?", "barang ini kemarin beli berapa?") butuh
  jawaban singkat dengan bukti nota.

## 2. Pengguna

| Pengguna | Kebutuhan | Catatan |
|---|---|---|
| **Ibu (pemilik)** | Cek nota, tandai bayar, tanya harga/stok, catat harga baru | Utama. Non-teknis, pakai HP, butuh huruf besar dan kalimat pendek |
| Staf toko | (Nanti) input nota/stok | Belum ada di v1 |
| Sales supplier | Tidak memakai aplikasi | Menanyakan status tagihan ke Ibu |

## 3. Glosarium (sudut pandang penjual)

| Istilah | Arti |
|---|---|
| **Harga jual** | Harga ke pelanggan. Referensi: katalog Toko Santri Nonongan |
| **HPP** | Harga dari supplier per satuan |
| **Harga beli** | **HPP + ongkir**, dihitung per satuan jual |
| **Selisih** | Harga jual − harga beli. **Bukan untung bersih** (belum susut, diskon, operasional) |
| **Profit "digulung"** | Uang dari penjualan barang yang sama sejak pembelian terakhir, dipakai lagi untuk beli stok. Ditampilkan sebagai "untuk beli lagi butuh ±Rp X (Y%)" |
| **Buku Besar** | Rekap nota barang datang, per supplier. Isinya sama dengan ACOSYS |
| **Buku Uang** | Buku pengeluaran (bayar supplier) dan pemasukan (transfer/QRIS pelanggan) |
| **Nota** | Nota barang datang dari supplier |
| **Nota tagihan** | Nota dari sales saat jatuh tempo |
| **ACOSYS** | Software akuntansi toko yang sudah dipakai. Integrasi belum aktif |
| **Satuan beli / satuan dasar** | Satuan saat membeli (KOLI, ROLL, BAL, DUS, KRG, PACK, GROSS…) dan satuan jual (PCS, MTR, LBR, ½ LBR, KG…). Isi per kemasan **berbeda per barang**, mis. 1 PACK = 10 PCS, 1 KRG = 20 KG |

Satuan yang didukung: PCS, PACK, PAK, ROLL, ROL, BAL, KOLI, LBR, 1/2 LBR, MTR,
KG, KRG, DUS, GROSS, GALLON.

## 4. Alur kerja Ibu (dasar desain)

1. Ibu pesan barang ke supplier.
2. Barang dan nota datang → nota dicatat di **Buku Besar** (per supplier).
3. Saat jatuh tempo, sales memberi **nota tagihan**.
4. Ibu memastikan harga, jumlah koli, dan kuantitas sesuai nota.
5. Ibu membayar (transfer BCA/BRI atau tunai).
6. Setelah transfer: catat di **Buku Uang** dan isi **tanggal bayar** di nota Buku Besar.
7. Sales bertanya → Ibu memastikan nota sudah lunas dari kedua buku.

Kasus jarang (belum prioritas): barang tidak datang tapi ikut ditagih (salah turun).

Ibu membayar saat **ditagih** (dichat sales). Sales tidak bertanya ke kantor,
tapi langsung konfirmasi ke Ibu, jadi Ibu harus bisa cepat menjawab "sudah lunas
atau belum" beserta bukti transfernya.

### 4.1 Dua buku yang dipakai (per toko: Gading dan Palur)

**A. Buku Besar** = rekap nota barang datang, **diurutkan per supplier**, sesuai
nota dari supplier. Kolom:

| Kolom | Isi | Status v1 |
|---|---|---|
| Tanggal nota | Tanggal barang datang | ✅ "Datang 17 Nov" di kartu nota |
| Nomor nota | Teks bebas sesuai nota | ✅ |
| Nama produk | Jenis + ukuran/warna, **tampil 1 baris seperti di nota** (di database boleh dipisah jenis/ukuran/warna, tapi tampilan tetap digabung agar sama dengan nota) | ✅ 1 baris |
| Kuantitas × harga per kuantitas | Termasuk kemasan: koli → pack, rol, bal, lembar, dus, pcs, karung, meter, kilogram. Isi kemasan per barang (1 pack = 10 pcs, 1 karung = 20 kg, 1 rol/bal = sekian lembar/meter) | ✅ "3 ROLL × Rp 3.583.500" |
| Harga total | Total nota | ✅ |
| Tanggal bayar | **Diisi setelah transfer** | ✅ "Lunas 21 Nov" / "Belum dibayar" |

**B. Buku Pengeluaran & Pemasukan** (di aplikasi: **Buku Uang**) — bukunya
tidak terlalu besar:

- Pengeluaran: pembayaran ke supplier (tertaut ke nota di Buku Besar).
- Pemasukan: pelanggan bayar lewat **transfer / QRIS**.

### 4.2 Masalah dengan ACOSYS

- Buku Besar seharusnya sama dengan ACOSYS, tapi **ACOSYS sering telat diisi**
  karena di Gading hanya satu staf yang bisa menginput.
- **Error yang pernah terjadi:** harga jual baru diinput lebih murah dari harga beli
  lama. Solusinya jadi aturan: harga jual di bawah harga beli **ditolak** (lihat §6).
- Karena itu setiap catatan punya tanda **Sudah / Belum di ACOSYS**, agar Ibu tahu
  apa yang masih harus dimasukkan ke ACOSYS.

## 5. Status sekarang — v1 (data simulasi)

**Teknologi:** React 19 + Vite 8 + TypeScript, PWA, hosting Cloudflare
(`ibu.urbacorp.biz.id`). **Belum ada server, database, login, atau AI.**
Semua data dibundel di aplikasi dan diberi tanda `simulated: true`.

### 5.1 Layar

| Layar | Isi |
|---|---|
| **Pilih Toko** | Muncul pertama kali dibuka / setelah dipasang. Gading atau Palur. Ada tombol Pasang Aplikasi |
| **Pasang Aplikasi** | Hanya di browser (bukan aplikasi terpasang). Android/Chrome: dialog pasang langsung. iPhone: langkah Bagikan → Tambah ke Layar Utama |
| **Beranda** | Satu layar: header pink, Ganti Toko, Hello Kitty + "Mau lihat apa, Bu?", kartu Buku Besar, Buku Uang, **Tanya & Catat** (kartu utama), pengingat nota belum lunas |
| **Buku Besar** | Daftar **supplier** (urut nama) → daftar nota supplier → rincian nota. Tombol **Sudah Bayar per nota**. Tampil tanggal datang, nomor nota, barang (qty × harga), total, tanggal bayar |
| **Buku Uang** | Per hari: uang masuk (QRIS/transfer) dan bayar supplier (tertaut ke nota). Ringkasan masuk/keluar bulan ini. Tidak ada daftar saldo bank |
| **Tanya & Catat** | Chat: menjawab pertanyaan **dan** mencatat harga beli baru / mengubah harga jual setelah konfirmasi. Harga Barang (pencarian, harga, stok, supplier, riwayat) ada di sini, bukan halaman sendiri |

### 5.2 Data produk

- 80 produk per toko dari katalog **Toko Santri Nonongan**
  (tokosantrinonongan.com/katalog, ekspor iPos 29 Sep 2026): nama, kategori,
  satuan jual, dan **harga jual eceran** sama persis dengan katalog.
- **Nonongan bukan cabang Gading/Palur.** Stok dan transaksinya tidak disalin.
  Status "Tersedia" di katalog tidak berarti stok Gading/Palur ada.
- Sintetis (karangan, ditandai): harga beli, supplier, riwayat harga, nota,
  pembayaran, pemasukan, mutasi stok, batas minimum stok.
- Supplier simulasi: Mitra, Kondang Jaya, APP (nama dari catatan Ibu), CV Permadani
  Sentosa, Toko Kain Sumber Rejeki, UD Aksesoris Tas Makmur, UD Terpal Peredam
  Sejahtera, CV Dakron Kapuk Lestari.

### 5.3 Pertanyaan yang sudah bisa dijawab (rule-based, di HP)

| Kebutuhan Ibu | Contoh pertanyaan |
|---|---|
| Uang ada berapa (cashflow) | "Uang ada berapa?" |
| Barang laris / belum laku | "Barang apa yang laris?" |
| Stok tersisa / perlu beli | "Apa yang hampir habis di Palur?", "Berapa stok Lem Fox Biru di Gading?" |
| Isi 1 kemasan | "Isi 1 koli Africa 115 X 155?" |
| Barang datang kapan (per supplier) | "Barang Kondang Jaya datang kapan?" |
| Tagihan supplier lunas/belum | "Tagihan APP sudah lunas?" |
| Harga lama (beli/jual) | "Spon ati 9mm dari Kondang Jaya kemarin berapa?" |
| Bandingkan murah mana | "Karpet Mitra sama Planet murah mana?", "Busa Ati 9 mm dari supplier mana paling murah?" |
| Beli terakhir vs jual | "Berapa harga beli terakhir dibandingkan harga jual?" |
| Profit digulung | "Profit Lem Fox Biru berapa?" |
| **Catat harga baru dari WA** | "Catat harga Busa Ati 9 mm Hitam dari Kondang Jaya Rp 86.000 per LBR ongkir 2.000" |
| **Ubah harga jual** | "Ubah harga jual Lem Fox Biru jadi Rp 54.000" |

Setiap jawaban menampilkan **sumber** (nomor nota/penjualan + tanggal). Kalau
data tidak ada, jawabannya "belum ketemu", tidak dikarang.

### 5.4 Yang disimpan di HP (localStorage)

Pembayaran yang dicatat, info harga dari supplier, perubahan harga jual, dan
pilihan toko. **Hanya di HP itu**, tidak sinkron antar perangkat, bukti bayar
tidak diunggah. Ini batasan v1 yang diselesaikan oleh database di Fase 2.

## 6. Aturan bisnis (wajib dipertahankan di semua versi)

1. **Harga jual baru tidak boleh lebih murah dari harga beli terakhir** → ditolak
   (mencegah error yang pernah terjadi di ACOSYS).
2. Harga beli = HPP + ongkir, dibandingkan per satuan jual.
3. Selisih jual − beli selalu disebut "selisih", **tidak pernah "untung bersih"**.
4. Stok = total masuk − total keluar, **tidak boleh negatif** di titik mana pun.
5. Data Gading dan Palur **terpisah**.
6. Konversi kemasan disimpan **per produk**, tidak disamaratakan.
7. Tidak ada produk ganda karena beda huruf besar/kecil (kunci nama dinormalisasi).
8. Nomor nota **stabil** (mis. `GDG-KJ-012`), bukan dari tanggal. ID dan seed
   tidak boleh dibuat dari tanggal.
9. Pembayaran **per nota**, bukan per supplier. Status nota: Belum Bayar / Sebagian / Lunas.
10. Tanda "Sudah di ACOSYS" berupa pilihan **Sudah / Belum** (bukan checkbox),
    untuk nota, pembayaran, info harga, dan harga jual.
11. Jangan menghapus nota atau pembayaran yang dicatat pengguna. Jangan mengubah
    data keuangan asli.
12. Jawaban chatbot **tidak boleh dibuat tanpa data**. Selalu sertakan sumber.

## 7. Prinsip desain & UX

- **Bahasa:** Indonesia sehari-hari, singkat, ramah untuk orang tua. Hindari istilah teknis.
- **Huruf:** besar dan **mengikuti setelan ukuran teks HP** (semua ukuran pakai
  `rem`; iPhone ikut Dynamic Type). Teks utama ≥ 1rem, catatan kecil ≥ 0.875rem.
- **Jawaban chat:** kalimat pembuka pendek + **kartu** (judul barang/supplier,
  baris "label — nilai") + catatan kecil. Warna: hijau = aman/termurah,
  oranye = perhatian, merah = rugi/habis.
- **Tampilan:** tema pink, karakter Hello Kitty yang sudah terpasang (tidak
  digambar ulang, hanya diberi hiasan di sekitarnya), animasi lembut.
- **Responsif:** HP tegak (Beranda pas satu layar), HP tidur (Kitty kiri, menu
  kanan), tablet (menu 2×2), desktop (3 kartu sebaris, header pink penuh).
- **PWA:** bisa dipasang di Android, iPhone, Windows/Mac (Chrome/Edge).
  Update otomatis: saat versi baru terdeteksi muncul bar "Versi baru tersedia → Muat ulang".
- Semua angka keuangan diberi label **Data simulasi** selama masih simulasi.

> ⚠️ Hello Kitty adalah karakter milik Sanrio. Aman untuk pemakaian pribadi keluarga,
> tapi perlu izin/lisensi atau diganti maskot sendiri bila aplikasi dibuka untuk umum.

## 8. Rencana Fase 2 — Database + Login + AI Chatbot

### 8.1 Tujuan

- Data nyata, sama di semua perangkat (HP Ibu, laptop, staf).
- Chatbot memahami pertanyaan bebas, tapi **murah dan tidak mengarang**.
- Input nota lebih cepat (OCR), sinkron dengan ACOSYS.

### 8.2 Urutan menjawab chatbot (WAJIB)

```
Pertanyaan
  1. Aturan (rule-based) di HP  ── cocok? → jawab (gratis, instan)
  2. Cache jawaban              ── pernah ditanya & data belum berubah? → jawab
  3. Server: fungsi data tetap  ── query DB lewat fungsi yang sudah ditentukan
  4. AI (LLM)                   ── hanya untuk memahami kalimat → pilih fungsi (3)
                                   dan merangkum hasil. Tidak boleh mengarang angka.
```

- **Cache:** kunci = pertanyaan dinormalisasi (huruf kecil, tanpa tanda baca) +
  toko + hari + **versi data**. Versi data naik setiap ada nota/pembayaran/harga
  baru, sehingga cache otomatis basi bila data berubah. v1 sudah punya cache di HP
  (`AskData` di `TokoApp.tsx`). Fase 2 menambah cache di server untuk pertanyaan
  yang sama dari perangkat lain.
- **Pratinjau "Simpan?" tidak di-cache.** Pencatatan selalu dikonfirmasi ulang.
- **AI memakai "tools"/fungsi** seperti `cariProduk`, `riwayatHargaBeli`,
  `stokToko`, `tagihanSupplier`, `bandingkanSupplier`, `ringkasanUang`. **Tanpa
  SQL bebas** dari AI.
- Setiap jawaban AI tetap mengembalikan **sumber** (id nota/transaksi). Jawaban
  tanpa sumber ditolak dan diganti "data belum ada".
- **Kendali biaya:** batasi jumlah panggilan AI per hari, catat setiap kali AI
  dipakai (agar aturan bisa ditambah untuk pertanyaan yang sering), targetkan
  sebagian besar pertanyaan selesai di langkah 1–2.
- Model: pakai model Claude terbaru. Model kecil/murah untuk memahami kalimat,
  model besar hanya bila perlu.

### 8.3 Usulan model data

| Tabel | Isi utama |
|---|---|
| `branches` | Gading, Palur |
| `users`, `user_branches` | Akun, peran (pemilik/staf), akses per toko |
| `suppliers` | Nama, alias (mis. "kondang"), kontak sales |
| `products` | Nama, kunci nama ternormalisasi (unik), kategori, satuan jual, harga jual |
| `product_units` | Satuan beli + isi per satuan dasar, **per produk** |
| `invoices` (nota) | Toko, supplier, nomor nota, tanggal datang, jatuh tempo, total, status, `acosys_recorded` |
| `invoice_items` | Produk, qty, satuan, HPP per satuan, ongkir, subtotal |
| `payments` | Nota, tanggal bayar, jumlah, metode, akun, bukti (file), `acosys_recorded` |
| `cash_transactions` | Pemasukan QRIS/transfer pelanggan per toko |
| `stock_movements` | Masuk (dari nota) / keluar (penjualan/penyesuaian), jumlah dalam satuan dasar |
| `price_quotes` | Info harga dari WA/sales (belum dibeli): supplier, HPP, ongkir, tanggal |
| `sell_price_changes` | Riwayat harga jual + siapa/kapan + `acosys_recorded` |
| `audit_log` | Siapa mengubah apa, kapan |
| `data_versions` | Versi data per toko, untuk membatalkan cache |

Constraint di database: stok tidak negatif, harga jual ≥ harga beli terakhir
(atau wajib alasan), nama produk unik per toko tanpa beda huruf, semua tabel
punya `branch_id`.

### 8.4 Arsitektur yang diusulkan

- Tetap di **Cloudflare** (sudah dipakai untuk hosting dan domain): Workers untuk
  API, D1 (SQL) untuk data, R2 untuk foto nota/bukti bayar. Alternatif:
  Supabase (Postgres + Auth + Storage). Putuskan sebelum mulai Fase 2.
- **Login wajib** sebelum memakai data nyata (di v1 login sengaja dihapus karena
  datanya simulasi). Hak akses per toko.
- Kunci API (AI, ACOSYS) **hanya di server**, tidak pernah di aplikasi/HP.
- Service worker tetap **tidak boleh meng-cache respons API/keuangan**. Cache
  jawaban chatbot disimpan terkontrol (IndexedDB/server), bukan di cache SW.

### 8.5 Daftar fitur lengkap & prioritas

Dari catatan Ibu, solusinya ada tiga bagian: **Dashboard + Chatbot + OCR**, di atas
**database yang tersambung ke ACOSYS** (lihat Lampiran A).

Status: ✅ ada di v1 (simulasi) · 🟡 sebagian · 🔜 belum (Fase 2+)

| # | Fitur | Untuk masalah apa | Status | Fase | Catatan |
|---|---|---|---|---|---|
| F1 | **Buku Besar per supplier** | Rekap nota barang datang | ✅ | v1 | Kolom sesuai §4.1 |
| F2 | **Sudah Bayar per nota** + tanggal bayar | Sales konfirmasi lunas ke Ibu | ✅ | v1 | Status Belum Bayar / Sebagian / Lunas |
| F3 | **Buku Uang** (bayar supplier + pemasukan transfer/QRIS) | Buku pengeluaran & pemasukan | ✅ | v1 | Per hari, tertaut ke nota |
| F4 | **Tanya & Catat** (chatbot rule-based) | Daftar pertanyaan Ibu | ✅ | v1 | Lihat §8.6 |
| F5 | **Catat harga baru** dari WA/sales + ongkir | Harga beli naik/turun, perlu ubah harga jual? | ✅ | v1 | Disimpan setelah konfirmasi |
| F6 | **Ubah harga jual** + aturan tolak di bawah harga beli | Error ACOSYS | ✅ | v1 | Aturan §6 no. 1 |
| F7 | **Tanda Sudah/Belum di ACOSYS** | ACOSYS telat diisi | ✅ | v1 | Untuk nota, bayar, info harga, harga jual |
| F8 | **Bukti transfer tersimpan** | Bukti saat ditagih sales | 🟡 | 2 | v1 hanya nama file; Fase 2 unggah foto ke penyimpanan (R2) |
| F9 | **Sinkron antar perangkat + login** | Data sama di HP Ibu, laptop, staf | 🔜 | 2 | Wajib sebelum data nyata |
| F10 | **Input nota oleh staf** | Mengurangi ketergantungan pada satu staf ACOSYS | 🔜 | 2 | Staf input di aplikasi, Ibu cek |
| F11 | **OCR nota → database** | Ketik nota lama & sering telat | 🔜 | 2 | Foto nota → baris terbaca → **Ibu cek & konfirmasi** → Buku Besar. Tidak langsung simpan tanpa dicek |
| F12 | **Ekspor untuk ACOSYS** (CSV/daftar yang belum masuk) | Sebelum ada akses DB ACOSYS | 🔜 | 2 | Jembatan sementara: daftar catatan "Belum di ACOSYS" yang bisa disalin/diimpor |
| F13 | **Integrasi ACOSYS** (baca/tulis) | Buku Besar = ACOSYS | 🔜 | 3 | Butuh akses DB ACOSYS (PR utama). Tanda ACOSYS jadi otomatis |
| F14 | **Dashboard ringkas** | Lihat cepat tanpa bertanya | 🔜 | 2 | Uang tercatat, nota jatuh tempo, barang perlu dibeli, harga naik. Tanpa grafik ramai |
| F15 | **Klasifikasi stok** (laris / sedang / lambat) | "Kapan terakhir beli untuk ngisi stok" sebagai ukuran laris | 🟡 | 2 | v1: daftar laris & belum laku 30 hari. Fase 2: kelas per barang |
| F16 | **Rekomendasi beli** | Stok habis biasanya baru tahu dari staf | 🟡 | 2 | v1: "hampir habis" vs batas minimum. Fase 2: jumlah saran + supplier termurah |
| F17 | **Cashflow balancing** ("uang ada berapa? profit") | Keseimbangan uang masuk/keluar | 🟡 | 2 | v1: uang tercatat + masuk/keluar bulan ini. Fase 2: termasuk tunai, per periode |
| F18 | **Profit "digulung" per barang** | Berapa persen dipakai beli lagi | 🟡 | 2 | v1: perhitungan sejak beli terakhir. Fase 2: persen target per jenis barang (to-do §9) |
| F19 | **Pengingat jatuh tempo** | Tidak terlewat bayar | 🔜 | 2 | Notifikasi PWA |
| F20 | **Cek "barang tidak datang tapi ditagih"** | Salah turun barang | 🔜 | 3 | Jarang, prioritas rendah: tandai item nota "tidak datang" |
| F21 | **Chatbot AI** (kalimat bebas) | Pertanyaan di luar aturan | 🔜 | 2 | Urutan wajib §8.2: aturan → cache → server → AI |

### 8.6 Daftar pertanyaan Ibu → status

| Pertanyaan Ibu | v1 (sekarang) | Fase 2 |
|---|---|---|
| Uang ada berapa? profit (cashflow balancing) | ✅ uang tercatat, masuk & bayar supplier bulan ini | Tambah tunai, per periode, di dashboard |
| Klasifikasi stok / kelarisan ("kapan terakhir beli untuk ngisi stok") | 🟡 laris 30 hari + belum laku + tanggal beli terakhir | Kelas laris/sedang/lambat per barang |
| Isi 1 koli berapa banyak | ✅ konversi per barang | Data isi kemasan nyata |
| Barang datang tanggal berapa (per supplier) | ✅ 3 nota terakhir supplier | — |
| Sudah bayar supplier lunas atau belum + bukti transfer, sudah ditulis di buku atau belum | ✅ status per nota, tanggal bayar, Sudah Bayar per nota | Foto bukti transfer tersimpan (F8) |
| Stok tersisa / rekomendasi beli | ✅ stok per toko, hampir habis | Saran jumlah & supplier (F16) |
| Harga lama berapa (jual atau beli) + bisa input harga + keterangan sudah/belum di ACOSYS | ✅ riwayat harga, catat harga baru, ubah harga jual, Sudah/Belum ACOSYS | Sinkron ke ACOSYS (F13) |
| "Spon ati 9mm dari Kondang Jaya kemarin harga berapa? mau bandingin sama sales supplier lain yang baru" | ✅ riwayat per supplier + pembanding + catat supplier baru | — |
| "Karpet Mitra sama Planet murah mana?" | ✅ bandingkan dua sisi (barang sejenis) | — |
| "Tagihan APP sudah dibayar belum?" | ✅ nota belum lunas + sisa + jatuh tempo | — |

## 9. Pertanyaan terbuka / To-do

- [ ] **Akses database ACOSYS** (PR utama untuk integrasi).
- [ ] Daftar supplier nyata + alias panggilan (mis. "Kondang", "APP", "Mitra").
- [ ] Isi kemasan nyata per produk (koli, bal, rol, dus, karung).
- [ ] Aturan persen profit "digulung" per jenis barang: berapa persen dipakai beli lagi?
- [ ] Pilih platform database: Cloudflare D1 vs Supabase.
- [ ] Siapa saja yang login (Ibu, staf Gading, staf Palur) dan haknya.
- [ ] Penanganan kasus "barang tidak datang tapi ditagih" (prioritas rendah).
- [ ] Lisensi Hello Kitty bila aplikasi dibuka untuk umum.
- [ ] Penjualan tunai di laci belum tercatat; perlu dicatat atau tidak?
- [ ] Format nota supplier yang paling sering (untuk OCR): foto contoh dari tiap supplier.
- [ ] Format impor ACOSYS (untuk ekspor sementara F12) sebelum ada akses DB.
- [ ] Nama produk di database: dipisah jenis / ukuran / warna atau tetap satu teks?
  (Tampilan tetap satu baris seperti nota.)

## 10. Catatan keputusan

| Tanggal | Keputusan |
|---|---|
| 19 Nov 2026 | Pindah dari Next.js + Payload (Figma Make) ke PWA statis Vite di Cloudflare. Tanpa database dulu, data simulasi |
| 19 Nov 2026 | Login dihapus untuk v1 (data simulasi). Wajib ada lagi sebelum data nyata |
| 19 Nov 2026 | Tema pink + Hello Kitty yang sudah ada; menu Harga Barang digabung ke Tanya Data |
| 19 Nov 2026 | Buku Besar per supplier; Sudah Bayar per nota; Buku Uang per hari tanpa daftar saldo |
| 19 Nov 2026 | Pilih Toko muncul pertama kali / setelah pasang; tombol pasang selalu tersedia |
| 20 Nov 2026 | Domain sendiri `ibu.urbacorp.biz.id` (workers.dev terblokir di sebagian jaringan) |
| 20 Nov 2026 | Tanya Data → **Tanya & Catat** (bisa bertanya dan mencatat) |
| 20 Nov 2026 | Update otomatis aplikasi terpasang ("Versi baru tersedia") |
| 20 Nov 2026 | Nomor nota stabil, tidak bergantung tanggal |
| 22 Nov 2026 | Huruf lebih besar dan ikut setelan HP; jawaban chat berbentuk kartu |
| 22 Nov 2026 | Harga Barang tetap di Tanya & Catat. Chatbot: aturan → cache → server → AI |
| 22 Nov 2026 | PRD dilengkapi dari catatan Ibu: kolom Buku Besar, daftar fitur F1–F21, pemetaan pertanyaan, lampiran catatan asli |

---

## Lampiran A — Catatan asli kebutuhan Ibu

> Disalin apa adanya sebagai sumber kebutuhan. Nama staf diganti "[staf Gading]".
> Tanda `->` di daftar pertanyaan = usulan solusi.

**Glossarium (definisi diksi) — sudut pandang seller**

- harga jual: harga menjual ke customer
- harga beli: harga beli dari supplier = hpp + ongkir
- profit: yang dipake buat beli barang lagi berapa persen? atur-atur sesuai barang
  terakhir beli kapan karena berarti sudah ada profit dari penjualan barang yang
  sama itu, JADI kayak digulung aja
- buku besar = acosys, TAPI acosys kadang telat input karena staf Gading yang bisa
  hanya [staf Gading]

**Flow**

ibu pesan barang → barang & nota datang → nota dimasukkan ke Buku Besar → pas
jatuh tempo: sales ngasih Nota Tagihan → ibu make sure harga & koli + semua
(jumlah kuantitas dll) → ibu bayar → after transfer: masukin ke Buku
Pengeluaran/Pembayaran ke Supplier & Pemasukan dari Customer bayar Transfer/QRIS +
ngasih tanggal bayar ke Buku Besar → ditanya sales: make sure Nota Tagihan lunas
dari 2 buku

*ibu bayar pas ditagih, yang berarti dichat sales. Ada kasus barang tidak datang
tapi ditagih karena salah turun, tapi JARANG, jadi mungkin tidak perlu jadi prioritas.

**Buku Pengeluaran/Pembayaran ke Supplier & Pemasukan dari Customer (Transfer/QRIS)**
— bukunya tidak terlalu besar.

**Buku Besar** — rekapitulasi nota (barang datang) order by supplier. Kolom:

- tanggal nota (barang datang)
- nomor nota (teks aja mungkin)
- nama produk (jenis + ukuran/warna) — bisa nanti dipisah, TAPI tampilan akhir
  tetap jadi 1 agar sesuai nota dan enak untuk ibu; preview display baru yang rapi
  juga bisa mempermudah
- kuantitas × harga per kuantitas (ada paket pembelian & pembungkusan: koli → pack,
  rol, bal, lembar, dus, pcs, karung, meter, kilogram) — 1 rol/bal/pack = beberapa
  lembar atau meter; benang 1 pack = 10 pcs; 1 karung = 20 kg
- harga total
- tanggal — diisi setelah transfer
- semua sesuai nota dari supplier

Ada 2 toko yang memakai kedua buku: **Gading** dan **Palur**.

**Issue**

- Nota ke ACOSYS → OCR ke DB
- Daftar pertanyaan → Chatbot & Dashboard
- DB × ACOSYS

**Daftar pertanyaan**

- uang ada berapa? profit — cashflow balancing
- klasifikasi/klastering stok (perbandingan kelarisan, ATAU "kapan terakhir beli
  barang buat ngisi stok" untuk menentukan larisnya)
- isi 1 koli berapa banyak
- barang datang di tanggal berapa ya — berdasarkan supplier
- udah bayar supplier lunas atau belum (sales tidak tanya ke kantor tapi langsung
  konfirmasi ke ibu) untuk bukti transfer, SAMA cek lunas/sukses transfer sudah
  ditulis atau belum di buku → klik sudah (lunas) atau belum bayar
- stok tersisa / rekomendasi beli supply — tidak pernah ditanya KARENA dapat
  informasi dari staf toko bahwa barang/stok habis
- harga lama berapa? baik jual atau beli → bisa input harga DAN ada keterangan
  sudah/belum di ACOSYS
- spesifik: "Spon ati 9mm dari Kondang Jaya itu kemarin harga berapa ya? mau
  bandingin sama sales di supplier lain yang baru", "karpet Mitra sama Planet
  harganya murah mana", "tagihan APP itu sudah dibayar belum ya" — semua itu nama
  supplier untuk produk tertentu

**Error ACOSYS**

- harga jual baru lebih murah dari harga beli lama → dijadikan aturan

**Solusi**

- Dashboard
- \+ Chatbot
- \+ OCR

**PR / To-do**

- akses DB ACOSYS
