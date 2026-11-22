# Toko Santri

PWA pencatatan toko **Gading** dan **Palur**: Buku Besar (nota supplier), Buku Uang,
dan Tanya & Catat (tanya + catat harga baru). Semua angka keuangan dan stok adalah
**data simulasi**; nama, kategori, satuan, dan harga jual eceran barang mengacu ke
katalog Toko Santri Nonongan (bukan cabang Gading/Palur).

Kebutuhan produk, aturan bisnis, dan rencana database + AI chatbot ada di
**[docs/PRD.md](docs/PRD.md)**.

## Menjalankan lokal

```bash
pnpm install
pnpm dev
```

Cek dan build produksi:

```bash
pnpm run typecheck
pnpm run build
pnpm preview
```

## Deploy ke Cloudflare Pages

1. Push repo ini ke GitHub (branch `main`).
2. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** →
   **Connect to Git** → pilih repo ini.
3. Build settings:
   - Framework preset: **None** (atau Vite)
   - Production branch: `main`
   - Build command: `pnpm run build`
   - Build output directory: `dist`
4. Environment variables (Production dan Preview):
   - `NODE_VERSION` = `22`
   - `PNPM_VERSION` = `10.34.3`
5. **Save and Deploy**.

Catatan:

- Tidak ada `404.html`, jadi Cloudflare Pages otomatis melayani `index.html`
  untuk rute aplikasi seperti `/app/harga-barang` (mode SPA).
- `public/_headers` membuat `sw.js`, `index.html`, dan manifest tidak di-cache
  lama, sedangkan `/assets/*` (nama file ber-hash) di-cache permanen.
- Service worker hanya meng-cache file statis publik. Tidak ada API atau data
  keuangan dari server.
- Pembayaran yang dicatat di aplikasi hanya tersimpan di perangkat (localStorage)
  dan bukti pembayaran tidak diunggah.
