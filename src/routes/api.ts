import { Hono } from 'hono'
import type { AppEnv } from '../lib/types'
import { searchProducts } from '../lib/search'
import { variantLabel } from '../lib/text'
import { decodeVin } from '../lib/vin'

export const api = new Hono<AppEnv>()

// Dòng xe theo hãng, cho bộ chọn xe
api.get('/models', async (c) => {
  const make = c.req.query('make')
  if (!make) return c.json([])
  const { results } = await c.env.DB.prepare('SELECT DISTINCT model FROM fitments WHERE make = ? ORDER BY model')
    .bind(make)
    .all<{ model: string }>()
  return c.json(results.map((r) => r.model), 200, { 'Cache-Control': 'public, max-age=300' })
})

// Động cơ theo hãng + dòng xe, cho bộ lọc (ô "2.4; 2.8" tách thành 2 lựa chọn)
api.get('/engines', async (c) => {
  const make = c.req.query('make')
  const model = c.req.query('model')
  if (!make) return c.json([])
  const stmt = model
    ? c.env.DB.prepare("SELECT DISTINCT engine FROM fitments WHERE make = ? AND model = ? AND engine IS NOT NULL AND engine != ''").bind(make, model)
    : c.env.DB.prepare("SELECT DISTINCT engine FROM fitments WHERE make = ? AND engine IS NOT NULL AND engine != ''").bind(make)
  const { results } = await stmt.all<{ engine: string }>()
  const set = new Set<string>()
  results.forEach((r) => r.engine.split(';').map((x) => x.trim()).filter((x) => x && x !== 'Tất cả').forEach((x) => set.add(x)))
  return c.json([...set].sort(), 200, { 'Cache-Control': 'public, max-age=300' })
})

api.get('/vin', async (c) => c.json(await decodeVin(c.env.DB, c.req.query('v') || '')))

api.get('/search', async (c) => {
  const q = c.req.query()
  const result = await searchProducts(c.env.DB, {
    q: q.q,
    make: q.make,
    model: q.model,
    year: q.year ? Number(q.year) : undefined,
    fuel: q.fuel,
    engine: q.engine,
    category: q.category,
    page: q.page ? Number(q.page) : 1,
  })
  return c.json(result)
})

// Tạo đơn hàng: giá luôn lấy lại từ cơ sở dữ liệu, không tin giá trình duyệt gửi lên
api.post('/orders', async (c) => {
  const body = await c.req.json<{
    customer_name?: string
    phone?: string
    address?: string
    province?: string
    email?: string
    note?: string
    items?: { id: number; qty: number }[]
  }>()
  const name = (body.customer_name || '').trim()
  const phone = (body.phone || '').replace(/[^\d+]/g, '')
  const items = (body.items || []).filter((i) => Number.isInteger(i.id) && i.qty > 0 && i.qty <= 99).slice(0, 50)
  if (!name || phone.length < 9) return c.json({ error: 'Vui lòng nhập họ tên và số điện thoại' }, 400)
  if (!items.length) return c.json({ error: 'Giỏ hàng trống' }, 400)

  const ph = items.map(() => '?').join(',')
  const { results: products } = await c.env.DB.prepare(
    `SELECT id, sku, name, brand, origin, voltage, price, status FROM products WHERE id IN (${ph})`,
  )
    .bind(...items.map((i) => i.id))
    .all<{ id: number; sku: string; name: string; brand: string | null; origin: string | null; voltage: string | null; price: number | null; status: string }>()

  const lines = items.map((i) => ({ i, p: products.find((p) => p.id === i.id) }))
  const bad = lines.find((l) => !l.p || l.p.price == null || l.p.status === 'Hết hàng')
  if (bad) return c.json({ error: `Sản phẩm ${bad.p?.name || ''} hiện không đặt online được, vui lòng gọi cửa hàng` }, 400)

  const total = lines.reduce((s, l) => s + l.p!.price! * l.i.qty, 0)
  const code = 'DH' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 90 + 10)

  const order = await c.env.DB.prepare(
    'INSERT INTO orders (code, customer_name, phone, address, note, total) VALUES (?,?,?,?,?,?) RETURNING id',
  )
    .bind(
      code, name, phone,
      [body.address, body.province].map((x) => (x || '').trim()).filter(Boolean).join(', ') || null,
      [body.email ? `Email: ${body.email.trim()}` : '', (body.note || '').trim()].filter(Boolean).join(' · ') || null,
      total,
    )
    .first<{ id: number }>()

  await c.env.DB.batch(
    lines.map((l) =>
      c.env.DB.prepare('INSERT INTO order_items (order_id, product_id, sku, name, variant, price, qty) VALUES (?,?,?,?,?,?,?)').bind(
        order!.id, l.p!.id, l.p!.sku, l.p!.name, variantLabel(l.p!), l.p!.price, l.i.qty,
      ),
    ),
  )
  return c.json({ code })
})

api.post('/quote', async (c) => {
  const f = await c.req.parseBody()
  const name = String(f.name || '').trim()
  const phone = String(f.phone || '').trim()
  if (!name || !phone) return c.text('Vui lòng nhập họ tên và số điện thoại', 400)
  await c.env.DB.prepare('INSERT INTO quote_requests (name, phone, vehicle, message, product_sku) VALUES (?,?,?,?,?)')
    .bind(name, phone, [String(f.vehicle || ''), f.vin ? `Số khung: ${String(f.vin).toUpperCase()}` : ''].filter(Boolean).join(' · '), String(f.message || ''), String(f.product_sku || '') || null)
    .run()
  return c.redirect('/yeu-cau-bao-gia?ok=1', 303)
})
