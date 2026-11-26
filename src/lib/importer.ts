import { slugify, splitList } from './text'

// Dữ liệu một dòng Excel sau khi trình duyệt đọc file (SheetJS) và đổi tên cột sang khoá tiếng Anh.
export type ProductRow = {
  row: number
  sku?: string
  name?: string
  category?: string
  vehicle_group?: string
  brand?: string
  origin?: string
  voltage?: string
  oem_codes?: string
  equiv_codes?: string
  price?: string | number
  status?: string
  images?: string
  description?: string
}

export type FitmentRow = {
  row: number
  group_key?: string
  make?: string
  model?: string
  year_from?: string | number
  year_to?: string | number
  fuel?: string
  engine?: string
  note?: string
}

export type RowError = { row: number; message: string }

const STATUSES = ['Còn hàng', 'Hết hàng', 'Đặt trước']

function s(v: unknown): string {
  return v == null ? '' : String(v).trim()
}

function toInt(v: unknown): number | null {
  const t = s(v).replace(/[.,\sđ]/g, '')
  if (!t) return null
  const n = Number(t)
  return Number.isFinite(n) ? Math.round(n) : NaN
}

// Ảnh: tên file trong Excel -> key trên R2 (chữ thường, không dấu, giữ đuôi)
export function imageKey(filename: string): string {
  const dot = filename.lastIndexOf('.')
  const base = dot > 0 ? filename.slice(0, dot) : filename
  return slugify(base) + '.webp'
}

export async function importProducts(db: D1Database, rows: ProductRow[]) {
  const errors: RowError[] = []
  const stmts: D1PreparedStatement[] = []
  const seen = new Set<string>()

  for (const r of rows) {
    const sku = s(r.sku)
    const name = s(r.name)
    const category = s(r.category)
    if (!sku && !name) continue
    if (!sku) { errors.push({ row: r.row, message: 'Thiếu mã sản phẩm' }); continue }
    if (!name) { errors.push({ row: r.row, message: 'Thiếu tên sản phẩm' }); continue }
    if (!category) { errors.push({ row: r.row, message: 'Thiếu danh mục' }); continue }
    if (seen.has(sku)) { errors.push({ row: r.row, message: `Trùng mã ${sku} trong file` }); continue }
    seen.add(sku)

    const price = toInt(r.price)
    if (Number.isNaN(price)) { errors.push({ row: r.row, message: 'Giá phải là số, ví dụ 2500000' }); continue }
    const status = s(r.status) || 'Còn hàng'
    if (!STATUSES.includes(status)) { errors.push({ row: r.row, message: `Tình trạng "${status}" không hợp lệ` }); continue }

    const images = JSON.stringify(splitList(r.images).map(imageKey))
    stmts.push(
      db.prepare(
        `INSERT INTO products (sku, name, slug, category, vehicle_group, brand, origin, voltage, oem_codes, equiv_codes, price, status, images, description, updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?, datetime('now'))
         ON CONFLICT(sku) DO UPDATE SET
           name=excluded.name, slug=excluded.slug, category=excluded.category, vehicle_group=excluded.vehicle_group,
           brand=excluded.brand, origin=excluded.origin, voltage=excluded.voltage, oem_codes=excluded.oem_codes,
           equiv_codes=excluded.equiv_codes, price=excluded.price, status=excluded.status,
           images=CASE WHEN excluded.images = '[]' THEN products.images ELSE excluded.images END,
           description=excluded.description, updated_at=datetime('now')`,
      ).bind(
        sku, name, slugify(name), category, s(r.vehicle_group) || null, s(r.brand) || null, s(r.origin) || null,
        s(r.voltage) || null, s(r.oem_codes) || null, s(r.equiv_codes) || null, price, status, images,
        s(r.description) || null,
      ),
    )
  }

  // D1 giới hạn số câu lệnh mỗi lần gọi, chia nhỏ để nhập vài nghìn dòng
  for (let i = 0; i < stmts.length; i += 100) await db.batch(stmts.slice(i, i + 100))
  return { imported: stmts.length, errors }
}

// Nhập sheet "Xe phù hợp": thay toàn bộ xe của mỗi mã nhóm có trong file.
export async function importFitments(db: D1Database, rows: FitmentRow[]) {
  const errors: RowError[] = []
  const valid: { group: string; vals: unknown[] }[] = []
  const thisYear = new Date().getFullYear()

  for (const r of rows) {
    const group = s(r.group_key)
    if (!group && !s(r.make)) continue
    if (!group) { errors.push({ row: r.row, message: 'Thiếu mã nhóm xe / mã sản phẩm' }); continue }
    const make = s(r.make)
    const models = splitList(r.model)
    const yf = toInt(r.year_from)
    const yt = toInt(r.year_to)
    if (!make || !models.length || yf == null) { errors.push({ row: r.row, message: 'Thiếu hãng / dòng / đời xe' }); continue }
    if (Number.isNaN(yf) || yf < 1970 || yf > thisYear + 2) { errors.push({ row: r.row, message: 'Đời từ năm không hợp lệ' }); continue }
    if (yt != null && (Number.isNaN(yt) || yt < yf)) { errors.push({ row: r.row, message: 'Đời đến năm phải lớn hơn đời từ năm' }); continue }
    const fuel = s(r.fuel)
    const fuelNorm = fuel.startsWith('Xăng') ? 'Xăng' : fuel.startsWith('Dầu') ? 'Dầu' : fuel || null
    // Ô "Vios; Yaris" tách thành 2 dòng xe
    for (const model of models) {
      valid.push({ group, vals: [group, make, model, yf, yt, fuelNorm, s(r.engine) || null, s(r.note) || null] })
    }
  }

  // Kiểm tra mã nhóm có tồn tại ở sản phẩm
  const groups = [...new Set(valid.map((v) => v.group))]
  const known = new Set<string>()
  for (let i = 0; i < groups.length; i += 50) {
    const chunk = groups.slice(i, i + 50)
    const ph = chunk.map(() => '?').join(',')
    const { results } = await db
      .prepare(`SELECT DISTINCT COALESCE(vehicle_group, sku) AS g FROM products WHERE vehicle_group IN (${ph}) OR sku IN (${ph})`)
      .bind(...chunk, ...chunk)
      .all<{ g: string }>()
    results.forEach((r) => known.add(r.g))
  }
  const unknown = groups.filter((g) => !known.has(g))
  unknown.forEach((g) => errors.push({ row: 0, message: `Mã "${g}" chưa có ở sheet Sản phẩm` }))

  const stmts: D1PreparedStatement[] = []
  for (const g of groups.filter((g) => known.has(g))) stmts.push(db.prepare('DELETE FROM fitments WHERE group_key = ?').bind(g))
  for (const v of valid.filter((v) => known.has(v.group))) {
    stmts.push(
      db.prepare('INSERT INTO fitments (group_key, make, model, year_from, year_to, fuel, engine, note) VALUES (?,?,?,?,?,?,?,?)').bind(...v.vals),
    )
  }
  for (let i = 0; i < stmts.length; i += 100) await db.batch(stmts.slice(i, i + 100))
  return { imported: valid.filter((v) => known.has(v.group)).length, errors }
}
