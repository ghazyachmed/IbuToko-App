import type { ProductUnit } from '@/lib/catalog'

/**
 * Produk referensi dari katalog Toko Santri Nonongan
 * (tokosantrinonongan.com/katalog, ekspor 29 Sep 2026).
 * Nama, kategori, satuan jual, dan HARGA JUAL eceran diambil dari katalog.
 * Satuan pembelian + isi konversi adalah data SIMULASI per produk.
 *
 * Kolom: [nama, kategori, satuan jual (dasar), harga jual, satuan beli, isi per satuan beli]
 */
export type CatalogRow = [string, string, ProductUnit, number, ProductUnit, number]

export const CATALOG: CatalogRow[] = [
  // PERMADANI
  ['Africa 115 X 155', 'PERMADANI', 'PCS', 195000, 'KOLI', 4],
  ['Africa 160 X 210', 'PERMADANI', 'PCS', 340000, 'KOLI', 4],
  ['Africa 190 X 260', 'PERMADANI', 'PCS', 445000, 'KOLI', 4],
  ['Almaya 210 X 310', 'PERMADANI', 'PCS', 580000, 'KOLI', 2],
  // SAJADAH MASJID
  ['Al Imam Hijau Bintik', 'SAJADAH MASJID', 'MTR', 460000, 'ROLL', 25],
  ['Al Namaz Hijau Polos', 'SAJADAH MASJID', 'MTR', 380000, 'ROLL', 25],
  ['Almira Merah Lis 1 Bintik', 'SAJADAH MASJID', 'MTR', 170000, 'ROLL', 25],
  // BUSA ATI
  ['Busa Ati 2 mm Hitam', 'BUSA ATI', 'LBR', 25500, 'BAL', 10],
  ['Busa Ati 5 mm Hitam KW1', 'BUSA ATI', 'LBR', 61000, 'BAL', 10],
  ['Busa Ati 9 mm Hitam', 'BUSA ATI', '1/2 LBR', 58000, 'LBR', 2],
  ['Busa Ati 9 mm Putih', 'BUSA ATI', '1/2 LBR', 58000, 'LBR', 2],
  // KARPET
  ['Karpet Bintang Hitam 836', 'KARPET', 'MTR', 54000, 'ROLL', 30],
  ['Karpet Borneo Abu 02', 'KARPET', 'MTR', 185000, 'ROLL', 25],
  ['Karpet Kaha Merah 157', 'KARPET', 'MTR', 80000, 'ROLL', 30],
  ['Planet/Safira/Kartika Hijau Lumut', 'KARPET', 'MTR', 47000, 'ROLL', 30],
  // BISBAN
  ['Ban L10 R 36 Y Hitam', 'BISBAN', 'ROLL', 15000, 'PACK', 10],
  ['Ban L20 R 36 Y Merah', 'BISBAN', 'ROLL', 20000, 'PACK', 10],
  ['Ban L25 F 20 Y Pink', 'BISBAN', 'ROLL', 19000, 'BAL', 20],
  // BAHAN TAS / BAHAN D
  ['Cordura Hitam solana/KW 2', 'BAHAN TAS', 'MTR', 28000, 'ROL', 50],
  ['Bucheri Hitam', 'BAHAN TAS', 'MTR', 21000, 'ROL', 50],
  ['D 300 Hitam', 'BAHAN D', 'MTR', 18000, 'ROL', 50],
  // LEM
  ['Lem Fox Biru 1 KG', 'LEM', 'KG', 52500, 'DUS', 12],
  ['Lem Fox Merah 1 KG', 'LEM', 'KG', 55000, 'DUS', 12],
  ['Lem Super Gallon 2.5kg', 'LEM', 'GALLON', 172500, 'DUS', 4],
  // TIKAR
  ['Tikar Bangau Jumbo 2 X 3', 'TIKAR', 'PCS', 125000, 'BAL', 10],
  ['Tikar Santri Exclusive 200 X 350', 'TIKAR', 'PCS', 159500, 'BAL', 10],
  // BUSA
  ['Busa Abu 120 X 200 X 4', 'BUSA', 'LBR', 190000, 'LBR', 1],
  ['Busa B Putih 1cm Lebar', 'BUSA', 'LBR', 20000, 'BAL', 10],
  ['Busa B Putih 3cm Lebar', 'BUSA', 'LBR', 58500, 'BAL', 5],
  ['Busa Lapis Super Abu-Abu', 'BUSA', 'MTR', 36000, 'ROLL', 25],
  ['Busa Lapis Tipis 3 mm', 'BUSA', 'MTR', 12000, 'ROLL', 50],
  // OSCAR
  ['Oscar Camry / Carviero Kuning 6131', 'OSCAR', 'MTR', 75000, 'ROLL', 30],
  ['Oscar Inova 540 lubang Black', 'OSCAR', 'MTR', 52000, 'ROLL', 30],
  ['Oscar SB Tech Hitam/Jeruk', 'OSCAR', 'MTR', 49000, 'ROLL', 30],
  ['Oscar Veritas Paroma Kain Merah', 'OSCAR', 'MTR', 45000, 'ROLL', 30],
  ['Karet Jok', 'OSCAR', 'PCS', 12000, 'PACK', 10],
  // IMITASI
  ['Imitasi Akar Krem Tua', 'IMITASI', 'MTR', 21000, 'ROLL', 50],
  ['Imitasi Angka 8 Salem', 'IMITASI', 'MTR', 30000, 'ROLL', 50],
  ['Imitasi Dop Coklat Muda', 'IMITASI', 'MTR', 21000, 'ROLL', 50],
  ['Imitasi Lax Merah', 'IMITASI', 'MTR', 26000, 'ROLL', 50],
  // VINYL
  ['Karpet EE DOP/NANYA/GAJAH L120 (15 m)', 'VINYL', 'MTR', 13000, 'ROLL', 15],
  ['Karpet EE Terano L2', 'VINYL', 'MTR', 35000, 'ROLL', 30],
  ['Perlak Baby Spon Pendek 110 cm', 'VINYL', 'MTR', 40000, 'ROLL', 30],
  ['Taplak Meja Meiwa 52 x 70', 'VINYL', 'PCS', 100000, 'PACK', 6],
  // BAHAN JOK
  ['Kain Jala Busa Abu Muda', 'BAHAN JOK', 'MTR', 42000, 'ROLL', 30],
  ['List Kursi / Sofa / Jok', 'BAHAN JOK', 'MTR', 3000, 'ROLL', 100],
  ['Kaki Karet Bulat 1 1/2', 'BAHAN JOK', 'PCS', 4000, 'PACK', 50],
  ['Paku Pines Kembang Emas', 'BAHAN JOK', 'DUS', 26500, 'KOLI', 20],
  ['Roda Kursi Isi 4', 'BAHAN JOK', 'PAK', 28000, 'DUS', 10],
  // DAKRON
  ['Dakron BJS KW 1', 'DAKRON', 'KG', 41000, 'KRG', 20],
  ['Dakron BJS KW 2', 'DAKRON', 'KG', 37500, 'KRG', 20],
  ['Dakron CF HPF isi 15KG', 'DAKRON', 'KRG', 400000, 'KRG', 1],
  // KASUR
  ['Kasur Palembang L 80', 'KASUR', 'PCS', 130000, 'PCS', 1],
  ['Kasur Palembang L 120', 'KASUR', 'PCS', 165000, 'PCS', 1],
  ['Kasur HDPE Giordano Lipat 70x200', 'KASUR', 'PCS', 255000, 'PCS', 1],
  ['Kasur Royal 160', 'KASUR', 'PCS', 900000, 'PCS', 1],
  // BANTAL
  ['Bantal Dolphin Polos', 'BANTAL', 'PCS', 35000, 'BAL', 10],
  ['Bantal Snoopy Polos', 'BANTAL', 'PCS', 55000, 'BAL', 10],
  ['Bantal Kursi Dolphin Motif', 'BANTAL', 'PAK', 80000, 'BAL', 5],
  // GULING
  ['Guling Dolphin Polos', 'GULING', 'PCS', 36000, 'BAL', 10],
  ['Guling Sakura', 'GULING', 'PCS', 33000, 'BAL', 10],
  ['Guling Premiere', 'GULING', 'PCS', 55000, 'BAL', 10],
  // KESET
  ['Keset Alaska', 'KESET', 'PCS', 14000, 'PACK', 10],
  ['Keset Handuk Besar', 'KESET', 'PCS', 17500, 'PACK', 10],
  ['Keset Mie Kawat Hijau', 'KESET', 'MTR', 180000, 'ROLL', 12],
  // PARASIT
  ['Parasit Balon Merah', 'PARASIT', 'MTR', 15000, 'ROLL', 50],
  ['Parasit Kain / Satin Hitam', 'PARASIT', 'MTR', 13000, 'ROLL', 50],
  ['Parasit Taslan Balon Orange', 'PARASIT', 'MTR', 31500, 'ROLL', 50],
  // TERPAL
  ['Terpal A12', 'TERPAL', 'MTR', 30000, 'ROLL', 50],
  ['Terpal A6 2 x 4 Biru', 'TERPAL', 'PCS', 100000, 'KOLI', 10],
  ['Terpal A6 3 x 4 Biru', 'TERPAL', 'PCS', 150000, 'KOLI', 10],
  // PEREDAM
  ['Glasswool 4mm', 'PEREDAM', 'MTR', 40000, 'ROLL', 20],
  ['Peredam Busa Hitam', 'PEREDAM', 'MTR', 41000, 'ROLL', 20],
  ['Alumunium Foil 6mm', 'PEREDAM', 'MTR', 67000, 'ROLL', 20],
  // AKSESORIS TAS
  ['Benang Nilon 555', 'AKSESORIS TAS', 'PCS', 9000, 'PACK', 10],
  ['Ring D 25 Tipis', 'AKSESORIS TAS', 'PCS', 500, 'GROSS', 144],
  ['Rit 5 Maroon', 'AKSESORIS TAS', 'MTR', 1500, 'ROLL', 100],
  ['ScotLight Plastik 4 cm/1,5"', 'AKSESORIS TAS', 'MTR', 3500, 'ROLL', 50],
  ['Ring D 10 Nikel', 'AKSESORIS TAS', 'GROSS', 5000, 'DUS', 10],
  ['Drip 330', 'AKSESORIS TAS', 'PACK', 37000, 'DUS', 10],
]

/**
 * Supplier SIMULASI. Nama Mitra, Kondang Jaya, dan APP dipakai karena disebut di catatan
 * kebutuhan ibu; produk, harga, dan nota mereka di sini tetap sintetis. Nama lain fiktif. Toko Santri Nonongan bukan supplier dan
 * bukan cabang Gading/Palur.
 */
export const SUPPLIERS = {
  permadani: 'CV Permadani Sentosa',
  karpet: 'Mitra',
  busa: 'Kondang Jaya',
  kain: 'Toko Kain Sumber Rejeki',
  aksesoris: 'UD Aksesoris Tas Makmur',
  lem: 'APP',
  terpal: 'UD Terpal Peredam Sejahtera',
  dakron: 'CV Dakron Kapuk Lestari',
} as const

/** Kata panggilan supplier yang dikenali di Tanya Data (huruf kecil). */
export const SUPPLIER_ALIASES: Record<string, string[]> = {
  'CV Permadani Sentosa': ['permadani sentosa', 'cv permadani'],
  Mitra: ['mitra'],
  'Kondang Jaya': ['kondang jaya', 'kondang'],
  'Toko Kain Sumber Rejeki': ['sumber rejeki', 'toko kain'],
  'UD Aksesoris Tas Makmur': ['tas makmur', 'ud aksesoris'],
  APP: ['app'],
  'UD Terpal Peredam Sejahtera': ['peredam sejahtera', 'ud terpal', 'sejahtera'],
  'CV Dakron Kapuk Lestari': ['kapuk lestari', 'cv dakron', 'lestari'],
}

type SupplierKey = keyof typeof SUPPLIERS

/** [supplier utama, supplier alternatif] per kategori. */
export const CATEGORY_SUPPLIERS: Record<string, [SupplierKey, SupplierKey]> = {
  PERMADANI: ['permadani', 'karpet'],
  'SAJADAH MASJID': ['permadani', 'karpet'],
  TIKAR: ['permadani', 'karpet'],
  KARPET: ['karpet', 'permadani'],
  VINYL: ['karpet', 'terpal'],
  KESET: ['karpet', 'permadani'],
  'BUSA ATI': ['busa', 'karpet'],
  BUSA: ['busa', 'dakron'],
  KASUR: ['busa', 'dakron'],
  BANTAL: ['dakron', 'busa'],
  GULING: ['dakron', 'busa'],
  DAKRON: ['dakron', 'busa'],
  'BAHAN TAS': ['kain', 'aksesoris'],
  'BAHAN D': ['kain', 'aksesoris'],
  IMITASI: ['kain', 'karpet'],
  OSCAR: ['kain', 'karpet'],
  PARASIT: ['kain', 'aksesoris'],
  'BAHAN JOK': ['kain', 'busa'],
  BISBAN: ['aksesoris', 'kain'],
  'AKSESORIS TAS': ['aksesoris', 'kain'],
  LEM: ['lem', 'busa'],
  TERPAL: ['terpal', 'kain'],
  PEREDAM: ['terpal', 'lem'],
}

/** Batas minimum stok simulasi per satuan dasar. */
export function minimumStock(baseUnit: string, conversion: number, sellPrice: number) {
  if (sellPrice >= 500000) return 1
  switch (baseUnit) {
    case 'MTR':
      return conversion >= 50 ? 10 : 5
    case 'PCS':
      return conversion >= 100 ? 50 : conversion === 1 ? 2 : 4
    case 'LBR':
      return 5
    case '1/2 LBR':
      return 4
    case 'KG':
      return 10
    case 'ROLL':
      return 6
    case 'GALLON':
    case 'KRG':
    case 'GROSS':
      return 2
    default:
      return 3
  }
}
