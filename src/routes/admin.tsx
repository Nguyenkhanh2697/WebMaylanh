import { Hono } from 'hono'
import { deleteCookie, getSignedCookie, setSignedCookie } from 'hono/cookie'
import type { FC, PropsWithChildren } from 'hono/jsx'
import type { AppEnv } from '../lib/types'
import { hashPassword, randomSalt, verifyPassword } from '../lib/auth'
import { importFitments, importProducts, type FitmentRow, type ProductRow } from '../lib/importer'
import { rebuildSearchIndex } from '../lib/search'
import { formatVnd } from '../lib/text'

export const admin = new Hono<AppEnv>()
const COOKIE = 'mlot_admin'

const AdminLayout: FC<PropsWithChildren<{ title: string }>> = ({ title, children }) => (
  <html lang="vi">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="robots" content="noindex" />
      <title>{title} – Quản trị</title>
      <link rel="stylesheet" href="/style.css" />
      <script src="/forms.js" defer></script>
    </head>
    <body class="admin">
      <header class="site-header">
        <div class="wrap header-row">
          <a href="/admin" class="logo"><img src="/logo-mark.svg" alt="DQT" width="56" height="30" /> Quản trị</a>
          <nav class="admin-nav">
            <a href="/admin/don-hang">Đơn hàng</a>
            <a href="/admin/bao-gia">Yêu cầu báo giá</a>
            <a href="/admin/san-pham">Sản phẩm</a>
            <a href="/admin/sap-xep">Sắp xếp trang chủ</a>
            <a href="/admin/nhap-excel">Nhập Excel</a>
            <a href="/admin/anh">Tải ảnh</a>
            <a href="/admin/dang-xuat">Đăng xuất</a>
          </nav>
        </div>
      </header>
      <main class="wrap">{children}</main>
    </body>
  </html>
)

// Tạo tài khoản quản trị đầu tiên (chỉ mở khi chưa có tài khoản nào)
admin.get('/cai-dat', async (c) => {
  const n = await c.env.DB.prepare('SELECT COUNT(*) AS n FROM admins').first<{ n: number }>()
  if (n!.n > 0) return c.redirect('/admin/dang-nhap')
  return c.html(
    <AdminLayout title="Cài đặt">
      <h1>Tạo tài khoản quản trị</h1>
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
  <AdminLayout title="Đăng nhập">
    <h1>Đăng nhập quản trị</h1>
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
  await next()
})

admin.get('/', async (c) => {
  const [p, o, q] = await c.env.DB.batch([
    c.env.DB.prepare('SELECT COUNT(*) AS n FROM products'),
    c.env.DB.prepare("SELECT COUNT(*) AS n FROM orders WHERE status = 'Chờ thanh toán'"),
    c.env.DB.prepare('SELECT COUNT(*) AS n FROM quote_requests WHERE handled = 0'),
  ])
  const n = (r: D1Result) => (r.results[0] as { n: number }).n
  return c.html(
    <AdminLayout title="Tổng quan">
      <h1>Xin chào {c.get('admin')}</h1>
      <div class="stats">
        <a href="/admin/san-pham" class="stat"><b>{n(p)}</b> sản phẩm</a>
        <a href="/admin/don-hang" class="stat"><b>{n(o)}</b> đơn chờ thanh toán</a>
        <a href="/admin/bao-gia" class="stat"><b>{n(q)}</b> yêu cầu báo giá mới</a>
      </div>
    </AdminLayout>,
  )
})

admin.get('/don-hang', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM orders ORDER BY id DESC LIMIT 200').all<{
    id: number; code: string; customer_name: string; phone: string; total: number; status: string; created_at: string
  }>()
  return c.html(
    <AdminLayout title="Đơn hàng">
      <h1>Đơn hàng</h1>
      <p class="muted">Đơn hàng và yêu cầu báo giá khách gửi từ giỏ hàng. Gọi lại khách theo số điện thoại, cập nhật trạng thái sau khi xử lý.</p>
      <table class="fit-table">
        <thead><tr><th>Mã đơn</th><th>Khách</th><th>Điện thoại</th><th>Tổng</th><th>Trạng thái</th><th>Ngày</th><th></th></tr></thead>
        <tbody>
          {!results.length && <tr><td colspan={7} class="admin-empty">Chưa có đơn hàng nào.</td></tr>}
          {results.map((o) => (
            <tr>
              <td><a href={`/don-hang/${o.code}`} target="_blank">{o.code}</a></td>
              <td>{o.customer_name}</td>
              <td><a href={`tel:${o.phone}`}>{o.phone}</a></td>
              <td>{formatVnd(o.total)}</td>
              <td>{o.status}</td>
              <td>{o.created_at}</td>
              <td>
                <form method="post" action={`/admin/don-hang/${o.id}`} class="inline" data-loader="Đang lưu…">
                  <select name="status">
                    {['Chờ thanh toán', 'Đã thanh toán', 'Đã giao', 'Huỷ'].map((s) => <option selected={s === o.status}>{s}</option>)}
                  </select>
                  <button class="btn">Lưu</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </AdminLayout>,
  )
})
admin.post('/don-hang/:id', async (c) => {
  const f = await c.req.parseBody()
  const status = String(f.status)
  if (!['Chờ thanh toán', 'Đã thanh toán', 'Đã giao', 'Huỷ'].includes(status)) return c.text('Trạng thái không hợp lệ', 400)
  await c.env.DB.prepare('UPDATE orders SET status = ? WHERE id = ?').bind(status, Number(c.req.param('id'))).run()
  return c.redirect('/admin/don-hang')
})

admin.get('/bao-gia', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM quote_requests ORDER BY handled, id DESC LIMIT 200').all<{
    id: number; name: string; phone: string; vehicle: string; message: string; product_sku: string | null; handled: number; created_at: string
  }>()
  return c.html(
    <AdminLayout title="Yêu cầu báo giá">
      <h1>Yêu cầu báo giá</h1>
      <table class="fit-table">
        <thead><tr><th>Ngày</th><th>Khách</th><th>Điện thoại</th><th>Xe</th><th>Nội dung</th><th>Mã SP</th><th></th></tr></thead>
        <tbody>
          {!results.length && <tr><td colspan={7} class="admin-empty">Chưa có yêu cầu báo giá nào.</td></tr>}
          {results.map((q) => (
            <tr class={q.handled ? 'muted' : ''}>
              <td>{q.created_at}</td><td>{q.name}</td><td><a href={`tel:${q.phone}`}>{q.phone}</a></td>
              <td>{q.vehicle}</td><td>{q.message}</td><td>{q.product_sku}</td>
              <td>
                {!q.handled && (
                  <form method="post" action={`/admin/bao-gia/${q.id}`} class="inline" data-loader="Đang lưu…"><button class="btn">Đã xử lý</button></form>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </AdminLayout>,
  )
})
admin.post('/bao-gia/:id', async (c) => {
  await c.env.DB.prepare('UPDATE quote_requests SET handled = 1 WHERE id = ?').bind(Number(c.req.param('id'))).run()
  return c.redirect('/admin/bao-gia')
})

admin.get('/san-pham', async (c) => {
  const q = (c.req.query('q') || '').trim()
  const stmt = q
    ? c.env.DB.prepare('SELECT * FROM products WHERE sku LIKE ?1 OR name LIKE ?1 OR oem_codes LIKE ?1 ORDER BY name LIMIT 200').bind(`%${q}%`)
    : c.env.DB.prepare('SELECT * FROM products ORDER BY updated_at DESC LIMIT 200')
  const { results } = await stmt.all<{ id: number; sku: string; name: string; brand: string; origin: string; voltage: string; price: number | null; status: string; slug: string }>()
  return c.html(
    <AdminLayout title="Sản phẩm">
      <h1>Sản phẩm</h1>
      <form class="inline" data-loader="Đang tìm…"><input name="q" value={q} placeholder="Mã, tên, mã OEM" aria-label="Tìm sản phẩm" /><button class="btn">Tìm</button></form>
      <p>Thêm, sửa hàng loạt bằng <a href="/admin/nhap-excel">Nhập Excel</a> theo file mẫu.</p>
      <table class="fit-table">
        <thead><tr><th>Mã</th><th>Tên</th><th>Loại</th><th>Giá</th><th>Tình trạng</th></tr></thead>
        <tbody>
          {results.map((p) => (
            <tr>
              <td>{p.sku}</td>
              <td><a href={`/san-pham/${p.slug}`} target="_blank">{p.name}</a></td>
              <td>{[p.brand, p.origin, p.voltage].filter(Boolean).join(' · ')}</td>
              <td>{formatVnd(p.price)}</td>
              <td>{p.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
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
    <AdminLayout title="Sắp xếp trang chủ">
      <h1>Sắp xếp sản phẩm trên trang chủ</h1>
      <p>Đánh số thứ tự: số nhỏ hiện trước. Mỗi trang của dải sản phẩm có 4 sản phẩm: số 1–4 là trang 1, 5–8 là trang 2... Để trống thì sản phẩm xếp sau, theo tên.</p>
      {saved && <p class="ok">Đã lưu thứ tự.</p>}
      <form method="post" class="form" data-loader="Đang lưu thứ tự…">
        <table class="fit-table">
          <thead><tr><th>Thứ tự</th><th>Trang</th><th>Sản phẩm</th><th>Danh mục</th></tr></thead>
          <tbody>
            {results.map((p) => (
              <tr>
                <td><input type="number" min="1" max="9999" name={`ord:${p.slug}`} value={p.ord ?? ''} style="width:80px" /></td>
                <td>{p.ord ? Math.ceil(p.ord / 4) : '—'}</td>
                <td><a href={`/san-pham/${p.slug}`} target="_blank">{p.name}</a>{p.n > 1 ? ` (${p.n} loại)` : ''}</td>
                <td>{p.category}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p><button class="btn btn-primary">Lưu thứ tự</button></p>
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
    <AdminLayout title="Nhập Excel">
      <h1>Nhập sản phẩm từ Excel</h1>
      <p>Dùng đúng file mẫu (sheet "Sản phẩm" và "Xe phù hợp"). Sản phẩm trùng mã sẽ được cập nhật, mã mới sẽ được thêm.</p>
      <div class="form">
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
    <AdminLayout title="Tải ảnh">
      <h1>Tải ảnh sản phẩm</h1>
      <p>Chọn nhiều ảnh cùng lúc. Tên file phải trùng với cột "Tên file ảnh" trong Excel. Ảnh được tự nén trước khi tải lên.</p>
      <div class="form">
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
