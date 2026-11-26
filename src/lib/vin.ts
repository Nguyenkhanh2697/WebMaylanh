// Giải mã số khung theo quy ước trong file "Số khung.xlsx" của cửa hàng:
// - 17 ký tự: 3 đầu = WMI (hãng, nước), 4–9 = VDS (dòng xe, động cơ), thứ 10 = năm (lặp 30 năm), 11–17 bỏ qua
// - Ít hơn 17 ký tự: tra bảng mã khung cũ theo phần đầu khớp dài nhất

export type VinResult = {
  vin: string
  kind: 'vin17' | 'old' | 'invalid'
  make?: string
  country?: string
  model?: string
  engine?: string
  year?: number
  parts?: Record<string, string>
  matched: 'full' | 'make' | 'none' // full = ra dòng xe; make = chỉ ra hãng/năm; none = không nhận ra
}

// Chu kỳ 30 ký tự: A=1980 … Y=2000, 1=2001 … 9=2009, rồi A=2010 lặp lại (T = 1996/2026 như file cửa hàng)
const YEAR_CODES = 'ABCDEFGHJKLMNPRSTVWXY123456789'

// Ký tự thứ 10: chọn năm gần nhất không vượt quá năm sau (xe đời mới thường bán trước 1 năm)
export function decodeYear(c: string, now = new Date().getFullYear()): number | undefined {
  const i = YEAR_CODES.indexOf(c)
  if (i < 0) return undefined
  // A = 1980 + 30k
  let y = 1980 + i
  while (y + 30 <= now + 1) y += 30
  return y
}

export function normalizeVin(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9-]/g, '')
}

// Nhận diện chuỗi khách gõ có phải số khung không (dùng cho thanh tìm kiếm chung)
export function looksLikeVin(input: string): boolean {
  const v = input.trim().toUpperCase().replace(/\s/g, '')
  return /^[A-HJ-NPR-Z0-9]{17}$/.test(v) && /\d/.test(v) && /[A-Z]/.test(v)
}

export async function decodeVin(db: D1Database, input: string): Promise<VinResult> {
  const vin = normalizeVin(input)
  const compact = vin.replace(/-/g, '')

  if (compact.length === 17 && /^[A-HJ-NPR-Z0-9]{17}$/.test(compact)) {
    const wmi = compact.slice(0, 3)
    const vds6 = compact.slice(3, 9)
    const vds5 = compact.slice(3, 8) + '*'
    const year = decodeYear(compact[9])
    const [w, vds] = await db.batch([
      db.prepare('SELECT make, country FROM vin_wmi WHERE code = ?').bind(wmi),
      db.prepare("SELECT model, engine, parts, vds FROM vin_vds WHERE wmi = ? AND vds IN (?, ?) ORDER BY CASE WHEN vds = ? THEN 0 ELSE 1 END LIMIT 1").bind(wmi, vds6, vds5, vds6),
    ])
    const wr = w.results[0] as { make: string; country: string } | undefined
    const vr = vds.results[0] as { model: string; engine: string | null; parts: string } | undefined
    return {
      vin: compact,
      kind: 'vin17',
      make: wr?.make,
      country: wr?.country,
      model: vr?.model,
      engine: vr?.engine ?? undefined,
      year,
      parts: vr ? JSON.parse(vr.parts) : undefined,
      matched: vr ? 'full' : wr ? 'make' : 'none',
    }
  }

  if (compact.length >= 4 && compact.length < 17) {
    // Phần đầu dài nhất khớp: so cả dạng có gạch và bỏ gạch
    const { results } = await db
      .prepare(
        `SELECT * FROM vin_old
         WHERE ? LIKE replace(prefix, '-', '') || '%' OR ? LIKE prefix || '%'
         ORDER BY length(prefix) DESC LIMIT 1`,
      )
      .bind(compact, vin)
      .all<{ make: string; model: string; engine: string | null; year: number | null; country: string | null; parts: string }>()
    const r = results[0]
    if (r) {
      return {
        vin,
        kind: 'old',
        make: r.make,
        model: r.model,
        engine: r.engine ?? undefined,
        year: r.year ?? undefined,
        country: r.country ?? undefined,
        parts: JSON.parse(r.parts),
        matched: 'full',
      }
    }
    return { vin, kind: 'old', matched: 'none' }
  }

  return { vin, kind: 'invalid', matched: 'none' }
}

// Tên dòng xe trong file số khung có thể khác cách ghi ở sheet "Xe phù hợp" (CRV / CR-V, Pajerosport / Pajero Sport).
// So sánh sau khi bỏ dấu cách, gạch, viết thường.
export function modelKey(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '')
}
