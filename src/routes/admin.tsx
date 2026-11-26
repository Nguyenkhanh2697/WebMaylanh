import { Hono } from 'hono'
import { deleteCookie, getSignedCookie, setSignedCookie } from 'hono/cookie'
import type { FC } from 'hono/jsx'
import type { AppEnv } from '../lib/types'
import { hashPassword, randomSalt, verifyPassword } from '../lib/auth'
import { importFitments, importProducts, type FitmentRow, type ProductRow } from '../lib/importer'
import { rebuildSearchIndex } from '../lib/search'
import { formatVnd } from '../lib/text'
import { AdminLayout } from '../views/admin-layout'
import { Dashboard, loadDashboard } from '../views/admin-dashboard'

export const admin = new Hono<AppEnv>()
const COOKIE = 'mlot_admin'


// Tạo tài khoản quản trị đầu tiên (chỉ mở khi chưa có tài khoản nào)
admin.get('/cai-dat', async (c) => {
  const n = await c.env.DB.prepare('SELECT COUNT(*) AS n FROM admins').first<{ n: number }>()
  if (n!.n > 0) return c.redirect('/admin/dang-nhap')
  return c.html(
    <AdminLayout title="Tạo tài khoản quản trị" sub="Tài khoản đầu tiên để cửa hàng quản lý sản phẩm, đơn hàng." bare>
      <form method="post" class="form" data-loader="Đang tạo tài khoản…">
        <label class="f-row"><span>Tên đăng nhập <i>*</i></span><input name="username" placeholder="Ví dụ: dqt" required autocomplete="username" /></label>
        <label class="f-row"><span>Mật khẩu <i>*</i></span><input name="password" type="password" placeholder="Tối thiểu 10 ký tự" minlength={10} required autocomplete="new-password" /></label>
        <button class="btn btn-primary">Tạo tài khoản</button>
      </form>
    </AdminLayout>,
  )
})
admin.post('/cai-dat', async (c) => {
  const n = await c.env.DB.prepare('SELECT COUNT(*) AS n FROM admins').first<{ n: number }>()
  if (n!.n > 0) return c.redirect('/admin/dang-nhap')
  const f = await c.req.parseBody()
  const username = String(f.username || '').trim()
  const password = String(f.password || '')
  if (!username || password.length < 10) return c.redirect('/admin/cai-dat')
  const salt = randomSalt()
  await c.env.DB.prepare('INSERT INTO admins (username, pass_hash, salt) VALUES (?,?,?)')
    .bind(username, await hashPassword(password, salt), salt)
    .run()
  return c.redirect('/admin/dang-nhap')
})

// Sai mật khẩu: hiện lại form, báo đỏ dưới ô mật khẩu, giữ tên đăng nhập đã gõ
const LoginPage: FC<{ username?: string; wrong?: boolean }> = ({ username = '', wrong }) => (
  <AdminLayout title="Đăng nhập quản trị" sub="Quản lý sản phẩm, đơn hàng và yêu cầu báo giá của cửa hàng." bare>
    <form method="post" action="/admin/dang-nhap" class="form" data-loader="Đang đăng nhập…">
      <label class="f-row"><span>Tên đăng nhập <i>*</i></span><input name="username" value={username} required autocomplete="username" /></label>
      <label class="f-row"><span>Mật khẩu <i>*</i></span>
        <input name="password" type="password" required autocomplete="current-password" class={wrong ? 'is-invalid' : undefined} aria-invalid={wrong ? 'true' : undefined} autofocus={wrong} />
        {wrong && <small class="f-err" role="alert">Sai tên đăng nhập hoặc mật khẩu. Bạn kiểm tra lại (chú ý chữ hoa, chữ thường).</small>}
      </label>
      <button class="btn btn-primary">Đăng nhập</button>
    </form>
  </AdminLayout>
)
admin.get('/dang-nhap', (c) => c.html(<LoginPage />))
admin.post('/dang-nhap', async (c) => {
  const f = await c.req.parseBody()
  const user = await c.env.DB.prepare('SELECT * FROM admins WHERE username = ?')
    .bind(String(f.username || ''))
    .first<{ username: string; pass_hash: string; salt: string }>()
  if (!user || !(await verifyPassword(String(f.password || ''), user.salt, user.pass_hash))) {
    return c.html(<LoginPage username={String(f.username || '')} wrong />, 401)
  }
  await setSignedCookie(c, COOKIE, user.username, c.env.SESSION_SECRET, {
    httpOnly: true, secure: new URL(c.req.url).protocol === 'https:', sameSite: 'Lax', path: '/admin', maxAge: 60 * 60 * 24 * 7,
  })
  return c.redirect('/admin')
})
admin.get('/dang-xuat', (c) => {
  deleteCookie(c, COOKIE, { path: '/admin' })
  return c.redirect('/admin/dang-nhap')
})

// Các trang còn lại bắt buộc đăng nhập
admin.use('*', async (c, next) => {
  const user = await getSignedCookie(c, c.env.SESSION_SECRET, COOKIE)
  if (!user) return c.req.path.includes('/api/') ? c.json({ error: 'Chưa đăng nhập' }, 401) : c.redirect('/admin/dang-nhap')
  c.set('admin', user)
  if (!c.req.path.includes('/api/')) {
    const r = await c.env.DB.prepare(
      "SELECT (SELECT COUNT(*) FROM orders WHERE status = 'Chờ thanh toán') AS o, (SELECT COUNT(*) FROM quote_requests WHERE handled = 0) AS q",
    ).first<{ o: number; q: number }>()
    c.set('badges', { orders: r?.o ?? 0, quotes: r?.q ?? 0 })
  }
  await next()
})

admin.get('/', async (c) => {
  const d = await loadDashboard(c.env)
  const hour = Number(new Date(Date.now() + 7 * 3600e3).toISOString().slice(11, 13))
  const hello = hour < 11 ? 'Chào buổi sáng' : hour < 14 ? 'Chào buổi trưa' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối'
  return c.html(
    <AdminLayout title="Tổng quan" sub={`${hello}, ${c.get('admin')}. Đây là tình hình cửa hàng hôm nay.`} active="home" v={c.var}>
      <Dashboard d={d} quoteMode={(c.env.CHECKOUT_MODE || 'quote') !== 'pay'} />
    </AdminLayout>,
  )
})

// Trạng thái đơn: lưu tên cũ trong cơ sở dữ liệu, hiện tên dễ hiểu theo chế độ giỏ hàng
const STATUSES = ['Chờ thanh toán', 'Đã thanh toán', 'Đã giao', 'Huỷ']
const statusLabel = (env: AppEnv['Bindings'], s: string) =>
  (env.CHECKOUT_MODE || 'quote') !== 'pay'
    ? ({ 'Chờ thanh toán': 'Chờ gọi lại', 'Đã thanh toán': 'Đã chốt đơn', 'Đã giao': 'Đã giao', 'Huỷ': 'Huỷ' } as Record<string, string>)[s] || s
    : s
const statusTone = (s: string) => (s === 'Chờ thanh toán' ? 'warn' : s === 'Huỷ' ? 'mute' : 'good')
// Giờ lưu UTC, hiện giờ Việt Nam
const vnTime = (t: string) => {
  const d = new Date(t.replace(' ', 'T') + 'Z')
  if (isNaN(+d)) return t
  const v = new Date(+d + 7 * 3600e3).toISOString()
  return `${v.slice(11, 16)} ${v.slice(8, 10)}/${v.slice(5, 7)}/${v.slice(0, 4)}`
}

admin.get('/don-hang', async (c) => {
  const st = c.req.query('tt') || ''
  const stmt = STATUSES.includes(st)
    ? c.env.DB.prepare('SELECT * FROM orders WHERE status = ? ORDER BY id DESC LIMIT 200').bind(st)
    : c.env.DB.prepare('SELECT * FROM orders ORDER BY id DESC LIMIT 200')
  const { results } = await stmt.all<{
    id: number; code: string; customer_name: string; phone: string; address: string | null; note: string | null; total: number; status: string; created_at: string
  }>()
  return c.html(
    <AdminLayout title="Đơn hàng" sub="Khách gửi từ giỏ hàng. Gọi lại theo số điện thoại rồi cập nhật trạng thái." active="orders" v={c.var}>
      <div class="ad-chips">
        <a href="/admin/don-hang" class={!st ? 'on' : undefined}>Tất cả</a>
        {STATUSES.map((s) => <a href={`/admin/don-hang?tt=${encodeURIComponent(s)}`} class={st === s ? 'on' : undefined}>{statusLabel(c.env, s)}</a>)}
      </div>
      <div class="ad-card ad-table-card">
        {!results.length ? (
          <div class="ad-empty"><b>Chưa có đơn hàng nào{st ? ' ở trạng thái này' : ''}.</b><span>Khi khách gửi từ giỏ hàng, đơn sẽ hiện ở đây.</span></div>
        ) : (
          <table class="ad-table">
            <thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Tổng</th><th>Trạng thái</th><th>Thời gian</th><th>Cập nhật</th></tr></thead>
            <tbody>
              {results.map((o) => (
                <tr>
                  <td data-label="Mã đơn"><a href={`/don-hang/${o.code}`} target="_blank" class="ad-code">{o.code}</a></td>
                  <td data-label="Khách hàng">
                    <b>{o.customer_name}</b>
                    <a href={`tel:${o.phone}`} class="ad-tel">{o.phone}</a>
                    {o.address && <small class="ad-muted">{o.address}</small>}
                    {o.note && <small class="ad-muted">Ghi chú: {o.note}</small>}
                  </td>
                  <td data-label="Tổng" class="ad-num">{formatVnd(o.total)}</td>
                  <td data-label="Trạng thái"><span class={'ad-pill ' + statusTone(o.status)}>{statusLabel(c.env, o.status)}</span></td>
                  <td data-label="Thời gian" class="ad-muted">{vnTime(o.created_at)}</td>
                  <td data-label="Cập nhật">
                    <form method="post" action={`/admin/don-hang/${o.id}`} class="ad-inline" data-loader="Đang lưu…">
                      <select name="status" aria-label="Trạng thái">
                        {STATUSES.map((s) => <option value={s} selected={s === o.status}>{statusLabel(c.env, s)}</option>)}
                      </select>
                      <button class="ad-btn">Lưu</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminLayout>,
  )
})
admin.post('/don-hang/:id', async (c) => {
  const f = await c.req.parseBody()
  const status = String(f.status)
  if (!STATUSES.includes(status)) return c.redirect('/admin/don-hang')
  await c.env.DB.prepare('UPDATE orders SET status = ? WHERE id = ?').bind(status, Number(c.req.param('id'))).run()
  return c.redirect('/admin/don-hang')
})

admin.get('/bao-gia', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM quote_requests ORDER BY handled, id DESC LIMIT 200').all<{
    id: number; name: string; phone: string; vehicle: string; message: string; product_sku: string | null; handled: number; created_at: string
  }>()
  return c.html(
    <AdminLayout title="Yêu cầu báo giá" sub="Khách chưa tìm thấy phụ tùng hoặc chưa chắc đúng xe. Gọi lại tư vấn rồi bấm Đã xử lý." active="quotes" v={c.var}>
      <div class="ad-card ad-table-card">
        {!results.length ? (
          <div class="ad-empty"><b>Chưa có yêu cầu báo giá nào.</b><span>Yêu cầu từ trang "Yêu cầu báo giá" sẽ hiện ở đây.</span></div>
        ) : (
          <table class="ad-table">
            <thead><tr><th>Khách hàng</th><th>Xe</th><th>Cần tìm</th><th>Thời gian</th><th>Trạng thái</th></tr></thead>
            <tbody>
              {results.map((q) => (
                <tr class={q.handled ? 'is-done' : undefined}>
                  <td data-label="Khách hàng"><b>{q.name}</b><a href={`tel:${q.phone}`} class="ad-tel">{q.phone}</a></td>
                  <td data-label="Xe">{q.vehicle || '—'}</td>
                  <td data-label="Cần tìm">{q.message || '—'}{q.product_sku && <small class="ad-muted">Đang xem mã: {q.product_sku}</small>}</td>
                  <td data-label="Thời gian" class="ad-muted">{vnTime(q.created_at)}</td>
                  <td data-label="Trạng thái">
                    {q.handled ? (
                      <span class="ad-pill good">Đã xử lý</span>
                    ) : (
                      <form method="post" action={`/admin/bao-gia/${q.id}`} class="ad-inline" data-loader="Đang lưu…"><span class="ad-pill warn">Chờ gọi lại</span><button class="ad-btn">Đã xử lý</button></form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminLayout>,
  )
})
admin.post('/bao-gia/:id', async (c) => {
  await c.env.DB.prepare('UPDATE quote_requests SET handled = 1 WHERE id = ?').bind(Number(c.req.param('id'))).run()
  return c.redirect('/admin/bao-gia')
})

// Bộ lọc nhanh danh sách sản phẩm (bấm từ ô số liệu ở trang Tổng quan)
const PRODUCT_FILTERS: Record<string, { label: string; where: string }> = {
  'het-hang': { label: 'Hết hàng', where: "status = 'Hết hàng'" },
  'lien-he': { label: 'Giá "Liên hệ"', where: 'price IS NULL' },
  'chua-anh': { label: 'Chưa có ảnh', where: "(images = '[]' OR images = '')" },
  'chua-xe': { label: 'Chưa gắn xe phù hợp', where: 'NOT EXISTS (SELECT 1 FROM fitments f WHERE f.group_key = COALESCE(products.vehicle_group, products.sku))' },
}

admin.get('/san-pham', async (c) => {
  const q = (c.req.query('q') || '').trim()
  const loc = c.req.query('loc') || ''
  const filter = PRODUCT_FILTERS[loc]
  const where: string[] = []
  const binds: string[] = []
  if (q) { where.push('(sku LIKE ?1 OR name LIKE ?1 OR oem_codes LIKE ?1)'); binds.push(`%${q}%`) }
  if (filter) where.push(filter.where)
  const sql = `SELECT * FROM products ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY ${q ? 'name' : 'updated_at DESC'} LIMIT 200`
  const { results } = await c.env.DB.prepare(sql).bind(...binds).all<{ id: number; sku: string; name: string; category: string; brand: string; origin: string; voltage: string; price: number | null; status: string; slug: string; images: string }>()
  const qs = (k: string) => `/admin/san-pham?${new URLSearchParams({ ...(q ? { q } : {}), ...(k ? { loc: k } : {}) })}`
  return c.html(
    <AdminLayout title="Sản phẩm" sub="Thêm, sửa hàng loạt bằng Nhập Excel theo file mẫu. Bấm tên để xem trên web." active="products" v={c.var}
      actions={<a href="/admin/nhap-excel" class="ad-btn ad-btn-primary"><span>+ Nhập Excel</span></a>}>
      <div class="ad-toolbar">
        <form class="ad-search" data-loader="Đang tìm…">
          <input name="q" value={q} placeholder="Tìm theo mã, tên, mã OEM…" aria-label="Tìm sản phẩm" />
          {loc && <input type="hidden" name="loc" value={loc} />}
          <button class="ad-btn">Tìm</button>
        </form>
        <div class="ad-chips">
          <a href={qs('')} class={!filter ? 'on' : undefined}>Tất cả</a>
          {Object.entries(PRODUCT_FILTERS).map(([k, f]) => <a href={qs(k)} class={loc === k ? 'on' : undefined}>{f.label}</a>)}
        </div>
      </div>
      <div class="ad-card ad-table-card">
        <div class="ad-card-head"><span>{results.length >= 200 ? 'Hiện 200 sản phẩm đầu' : `${results.length} sản phẩm`}{filter ? ` · ${filter.label}` : ''}{q ? ` · tìm "${q}"` : ''}</span></div>
        {!results.length ? (
          <div class="ad-empty"><b>Không có sản phẩm nào khớp.</b><span>Thử bỏ bộ lọc hoặc tìm bằng mã khác.</span></div>
        ) : (
          <table class="ad-table">
            <thead><tr><th>Mã</th><th>Tên sản phẩm</th><th>Loại</th><th class="ad-num">Giá</th><th>Tình trạng</th></tr></thead>
            <tbody>
              {results.map((p) => (
                <tr>
                  <td data-label="Mã" class="ad-code">{p.sku}</td>
                  <td data-label="Tên"><a href={`/san-pham/${p.slug}`} target="_blank">{p.name}</a><small class="ad-muted">{p.category}{p.images === '[]' ? ' · chưa có ảnh' : ''}</small></td>
                  <td data-label="Loại">{[p.brand, p.origin, p.voltage].filter(Boolean).join(' · ') || '—'}</td>
                  <td data-label="Giá" class="ad-num">{p.price == null ? <span class="ad-muted">Liên hệ</span> : formatVnd(p.price)}</td>
                  <td data-label="Tình trạng"><span class={'ad-pill ' + (p.status === 'Hết hàng' ? 'mute' : 'good')}>{p.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminLayout>,
  )
})

// Sắp xếp dải sản phẩm trang chủ: cửa hàng đánh số thứ tự, mỗi trang 4 sản phẩm (trang 1 = số 1–4, trang 2 = 5–8...)
admin.get('/sap-xep', async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT slug, MIN(name) AS name, MIN(category) AS category, MIN(home_order) AS ord, COUNT(*) AS n
     FROM products GROUP BY slug ORDER BY (ord IS NULL), ord, name LIMIT 500`,
  ).all<{ slug: string; name: string; category: string; ord: number | null; n: number }>()
  const saved = c.req.query('ok') === '1'
  return c.html(
    <AdminLayout title="Sắp xếp trang chủ" sub="Đánh số thứ tự: số nhỏ hiện trước. Mỗi trang dải sản phẩm có 4 sản phẩm (1–4 là trang 1, 5–8 là trang 2…). Để trống thì xếp sau, theo tên." active="sort" v={c.var}>
      {saved && <div class="ad-alert good">Đã lưu thứ tự. Trang chủ đã cập nhật.</div>}
      <form method="post" data-loader="Đang lưu thứ tự…">
        <div class="ad-card ad-table-card">
          <table class="ad-table">
            <thead><tr><th>Thứ tự</th><th>Trang</th><th>Sản phẩm</th><th>Danh mục</th></tr></thead>
            <tbody>
              {results.map((p) => (
                <tr>
                  <td data-label="Thứ tự"><input type="number" min="1" max="9999" name={`ord:${p.slug}`} value={p.ord ?? ''} class="ad-ord" aria-label={`Thứ tự ${p.name}`} /></td>
                  <td data-label="Trang">{p.ord ? <span class="ad-pill good">Trang {Math.ceil(p.ord / 4)}</span> : <span class="ad-muted">—</span>}</td>
                  <td data-label="Sản phẩm"><a href={`/san-pham/${p.slug}`} target="_blank">{p.name}</a>{p.n > 1 && <small class="ad-muted">{p.n} loại</small>}</td>
                  <td data-label="Danh mục">{p.category}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div class="ad-sticky-save"><button class="ad-btn ad-btn-primary">Lưu thứ tự</button></div>
      </form>
    </AdminLayout>,
  )
})

admin.post('/sap-xep', async (c) => {
  const f = await c.req.parseBody()
  const stmts = Object.entries(f)
    .filter(([k]) => k.startsWith('ord:'))
    .map(([k, v]) => {
      const n = Number(v)
      const ord = String(v).trim() === '' || !Number.isInteger(n) || n < 1 ? null : Math.min(n, 9999)
      return c.env.DB.prepare('UPDATE products SET home_order = ? WHERE slug = ?').bind(ord, k.slice(4))
    })
  for (let i = 0; i < stmts.length; i += 50) await c.env.DB.batch(stmts.slice(i, i + 50))
  return c.redirect('/admin/sap-xep?ok=1')
})

// Trang nhập Excel: trình duyệt đọc file theo mẫu, gửi từng phần lên máy chủ, hiện lỗi từng dòng
admin.get('/nhap-excel', (c) =>
  c.html(
    <AdminLayout title="Nhập Excel" sub='Dùng đúng file mẫu (sheet "Sản phẩm" và "Xe phù hợp"). Trùng mã thì cập nhật, mã mới thì thêm. Dòng lỗi được báo rõ số dòng.' active="import" v={c.var}>
      <div class="form ad-card ad-form-card">
        <input type="file" id="xlsx-file" accept=".xlsx" data-label="file Excel (.xlsx) theo mẫu" />
        <label><input type="checkbox" id="skip-examples" checked /> Bỏ qua các dòng ví dụ (cột Mô tả có chữ "VÍ DỤ")</label>
        <button class="btn btn-primary" id="xlsx-import">Nhập dữ liệu</button>
      </div>
      <pre id="import-log" class="log"></pre>
      <script src="https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js"></script>
      <script src="/admin-import.js"></script>
    </AdminLayout>,
  ),
)

admin.post('/api/import/products', async (c) => {
  const { rows } = await c.req.json<{ rows: ProductRow[] }>()
  return c.json(await importProducts(c.env.DB, rows.slice(0, 1000)))
})
admin.post('/api/import/fitments', async (c) => {
  const { rows } = await c.req.json<{ rows: FitmentRow[] }>()
  return c.json(await importFitments(c.env.DB, rows.slice(0, 2000)))
})
admin.post('/api/reindex', async (c) => {
  await rebuildSearchIndex(c.env.DB)
  return c.json({ ok: true })
})

// Tải ảnh: trình duyệt tự nén sang WebP rồi gửi lên R2
admin.get('/anh', (c) =>
  c.html(
    <AdminLayout title="Tải ảnh" sub='Chọn nhiều ảnh cùng lúc. Tên file trùng cột "Tên file ảnh" trong Excel. Ảnh tự nén trước khi tải lên.' active="images" v={c.var}>
      <div class="form ad-card ad-form-card">
        <input type="file" id="img-files" accept="image/*" multiple data-label="ảnh sản phẩm" />
        <button class="btn btn-primary" id="img-upload">Tải lên</button>
      </div>
      <pre id="img-log" class="log"></pre>
      <script src="/admin-images.js"></script>
    </AdminLayout>,
  ),
)
admin.put('/api/images/:key', async (c) => {
  const key = c.req.param('key')
  if (!/^[a-z0-9-]+\.webp$/.test(key)) return c.json({ error: 'Tên ảnh không hợp lệ' }, 400)
  const body = await c.req.arrayBuffer()
  if (body.byteLength > 5 * 1024 * 1024) return c.json({ error: 'Ảnh quá 5MB' }, 400)
  if (!c.env.IMAGES) return c.json({ error: 'Chưa bật kho ảnh R2 trên Cloudflare' }, 503)
  await c.env.IMAGES.put(key, body, { httpMetadata: { contentType: 'image/webp' } })
  return c.json({ ok: true, key })
})
