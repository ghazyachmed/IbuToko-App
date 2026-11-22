// Kategori dan satuan mengikuti katalog referensi Toko Santri Nonongan
// (tokosantrinonongan.com/katalog, data 29 Sep 2026). Katalog hanya referensi
// nama, kategori, satuan, dan harga jual eceran — bukan stok Gading/Palur.

export const productUnits = [
  'PCS',
  'PACK',
  'PAK',
  'ROLL',
  'ROL',
  'BAL',
  'KOLI',
  'LBR',
  '1/2 LBR',
  'MTR',
  'KG',
  'KRG',
  'DUS',
  'GROSS',
  'GALLON',
] as const

export type ProductUnit = (typeof productUnits)[number]

/** Kunci nama untuk mencegah duplikasi akibat beda kapitalisasi/spasi. */
export const normalizeName = (value: string) => value.toLowerCase().replace(/\s+/g, ' ').trim()

/** Sinonim sehari-hari: "spon ati" = "busa ati". */
export const applySynonyms = (value: string) =>
  value.toLowerCase().replace(/\bspons?\s*ati\b/g, 'busa ati')

/**
 * Pecah teks menjadi token pencarian (huruf kecil, tanpa tanda baca).
 * Satuan yang menempel pada angka dipisah: "9mm" → "9 mm", "2.5kg" → "2.5 kg",
 * "70x200" → "70 x 200". Kode barang tetap utuh: "L20", "KW1", "D300" tidak
 * dipecah, supaya "Ban L20" tidak ikut cocok dengan "Ban L25 F 20".
 */
export const searchTokens = (value: string) =>
  applySynonyms(value)
    .replace(/(\d)x(?=\d)/g, '$1 x ')
    .replace(/(\d)(mm|cm|m|kg|gr|g|ml|y|lbr|pcs)\b/g, '$1 $2')
    .replace(/[^a-z0-9/.,\s-]/g, ' ')
    .replace(/[,]/g, ' ')
    .split(/[\s]+/)
    .map((token) => token.replace(/^[-.]+|[-.]+$/g, ''))
    .filter(Boolean)

/**
 * Setiap token kueri harus menjadi awalan salah satu kata pada nama barang.
 * "Ban L20" cocok dengan "Ban L20 R 36 Y Merah"; "9" tidak cocok dengan "190".
 */
export function matchesQuery(name: string, query: string | string[]) {
  const queryTokens = Array.isArray(query) ? query : searchTokens(query)
  if (!queryTokens.length) return true
  const nameTokens = searchTokens(name.replace(/\//g, ' / '))
  const joined = normalizeName(name)
  return queryTokens.every(
    (token) =>
      nameTokens.some((word) => word.startsWith(token)) ||
      (token.includes('/') && joined.includes(token)),
  )
}
