import { compactCode, stripDiacritics } from './text'

export type SearchParams = {
  q?: string
  make?: string
  model?: string
  year?: number
  fuel?: string
  engine?: string
  category?: string
  origin?: string
  brand?: string
  priceMin?: number
  groups?: string[] // mã nhóm xe lấy từ dữ liệu số khung
  priceMax?: number
  page?: number
}

export type SearchHit = {
  slug: string
  name: string
  category: string
  min_price: number | null
  variants: number
  image: string | null
  in_stock: number
  first_id: number
  oem: string | null
  fit_make: string | null
  fit_model: string | null
  fit_from: number | null
  fit_to: number | null
  fit_engine: string | null
  fit_fuel: string | null
}

const PAGE_SIZE = 24

// Biến chuỗi người dùng gõ thành truy vấn FTS5 an toàn: mỗi từ là tiền tố ("acc" khớp "Accent")
function ftsQuery(q: string): string | null {
  const words = stripDiacritics(q)
    .split(/[^0-9A-Za-z]+/)
    .filter((w) => w.length > 0)
    .slice(0, 8)
  if (!words.length) return null
  const parts = words.map((w) => `"${w}"*`)
  // Thêm mã viết liền để "97606-1R000" và "976061R000" cùng khớp
  const compact = compactCode(q)
  if (compact.length >= 5 && /\d/.test(compact)) return `(${parts.join(' AND ')}) OR codes:"${compact}"*`
  return parts.join(' AND ')
}

// Tìm theo tên/mã (FTS) và/hoặc thông tin xe (fitments). Kết quả gộp theo trang sản phẩm (slug).
export async function searchProducts(db: D1Database, p: SearchParams) {
  const where: string[] = []
  const binds: unknown[] = []

  if (p.q && p.q.trim()) {
    const fq = ftsQuery(p.q.trim())
    if (fq) {
      where.push('p.id IN (SELECT rowid FROM products_fts WHERE products_fts MATCH ?)')
      binds.push(fq)
    }
  }
  if (p.category) {
    where.push('p.category = ?')
    binds.push(p.category)
  }
  if (p.origin) {
    where.push('p.origin = ?')
    binds.push(p.origin)
  }
  if (p.brand) {
    where.push('p.brand = ?')
    binds.push(p.brand)
  }
  if (p.groups && p.groups.length) {
    const ph = p.groups.map(() => '?').join(',')
    where.push(`(p.vehicle_group IN (${ph}) OR p.sku IN (${ph}))`)
    binds.push(...p.groups, ...p.groups)
  }
  if (p.priceMin != null) {
    where.push('p.price >= ?')
    binds.push(p.priceMin)
  }
  if (p.priceMax != null) {
    where.push('p.price < ?')
    binds.push(p.priceMax)
  }
  if (p.make || p.model || p.year || p.fuel || p.engine) {
    const f: string[] = ['f.group_key = COALESCE(p.vehicle_group, p.sku)']
    if (p.make) {
      f.push('f.make = ?')
      binds.push(p.make)
    }
    if (p.model) {
      f.push('f.model = ?')
      binds.push(p.model)
    }
    if (p.year) {
      // Đời xe tính theo khoảng: chọn 2014 ra cả hàng lắp 2012–2017
      f.push('f.year_from <= ? AND (f.year_to IS NULL OR f.year_to >= ?)')
      binds.push(p.year, p.year)
    }
    if (p.fuel) {
      f.push("(f.fuel IS NULL OR f.fuel = '' OR f.fuel = 'Tất cả' OR f.fuel = ?)")
      binds.push(p.fuel)
    }
    if (p.engine) {
      f.push("(f.engine IS NULL OR f.engine = '' OR f.engine = 'Tất cả' OR instr(';' || replace(f.engine, ' ', '') || ';', ';' || ? || ';') > 0)")
      binds.push(p.engine.replace(/\s/g, ''))
    }
    where.push(`EXISTS (SELECT 1 FROM fitments f WHERE ${f.join(' AND ')})`)
  }

  const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : ''
  const page = Math.max(1, p.page || 1)

  const sql = `
    WITH hits AS (
      SELECT p.slug,
             MIN(p.name) AS name,
             MIN(p.category) AS category,
             MIN(p.price) AS min_price,
             COUNT(*) AS variants,
             MAX(CASE WHEN p.status = 'Còn hàng' THEN 1 ELSE 0 END) AS in_stock,
             MIN(p.id) AS first_id,
             MIN(COALESCE(p.vehicle_group, p.sku)) AS grp,
             MAX(p.oem_codes) AS oem_all,
             MIN(p.home_order) AS ord
      FROM products p
      ${whereSql}
      GROUP BY p.slug
      ORDER BY (ord IS NULL), ord, in_stock DESC, name
      LIMIT ${PAGE_SIZE + 1} OFFSET ${(page - 1) * PAGE_SIZE}
    )
    SELECT h.slug, h.name, h.category, h.min_price, h.variants, h.in_stock, h.first_id,
           trim(substr(h.oem_all, 1, CASE WHEN instr(h.oem_all, ';') > 0 THEN instr(h.oem_all, ';') - 1 ELSE length(h.oem_all) END)) AS oem,
           (SELECT json_extract(p2.images, '$[0]') FROM products p2 WHERE p2.slug = h.slug AND p2.images != '[]' LIMIT 1) AS image,
           f.make AS fit_make, f.model AS fit_model, f.year_from AS fit_from, f.year_to AS fit_to, f.engine AS fit_engine, f.fuel AS fit_fuel
    FROM hits h
    LEFT JOIN fitments f ON f.id = (SELECT id FROM fitments WHERE group_key = h.grp ORDER BY id LIMIT 1)
    ORDER BY (h.ord IS NULL), h.ord, h.in_stock DESC, h.name`

  const countSql = `SELECT COUNT(DISTINCT p.slug) AS n FROM products p ${whereSql}`

  const [{ results }, cnt] = await Promise.all([
    db.prepare(sql).bind(...binds).all<SearchHit>(),
    db.prepare(countSql).bind(...binds).first<{ n: number }>(),
  ])
  const hasMore = results.length > PAGE_SIZE
  return { hits: results.slice(0, PAGE_SIZE), page, hasMore, total: cnt?.n ?? 0 }
}

// Làm lại chỉ mục tìm kiếm sau khi nhập Excel. "vehicles" chứa hãng + dòng xe để gõ "Ranger" là ra.
export async function rebuildSearchIndex(db: D1Database) {
  await db.batch([
    db.prepare('DELETE FROM products_fts'),
    db.prepare(`
      INSERT INTO products_fts (rowid, sku, name, codes, brand, vehicles)
      SELECT p.id, p.sku, p.name,
             COALESCE(p.oem_codes, '') || ' ' || COALESCE(p.equiv_codes, '') || ' ' ||
               upper(replace(replace(replace(COALESCE(p.sku,'') || ' ' || COALESCE(p.oem_codes, '') || ' ' || COALESCE(p.equiv_codes, ''), '-', ''), '.', ''), '/', '')),
             COALESCE(p.brand, '') || ' ' || COALESCE(p.origin, ''),
             COALESCE((SELECT group_concat(DISTINCT f.make || ' ' || f.model) FROM fitments f
                       WHERE f.group_key = COALESCE(p.vehicle_group, p.sku)), '')
      FROM products p`),
  ])
}
