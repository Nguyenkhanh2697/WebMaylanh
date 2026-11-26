import { Hono } from 'hono'
import { secureHeaders } from 'hono/secure-headers'
import type { AppEnv } from './lib/types'
import { pub } from './routes/public'
import { api } from './routes/api'
import { admin } from './routes/admin'
import { hidden, blockedFeature, OPEN_DATE } from './lib/flags'
import { Layout } from './views/layout'

const app = new Hono<AppEnv>()

app.use('*', secureHeaders({ contentSecurityPolicy: undefined }))

// Link chạy thử: chặn chức năng chưa tới hạn và không cho Google lập chỉ mục
app.use('*', async (c, next) => {
  if (hidden(c.env).size) {
    const f = blockedFeature(c.env, c.req.path)
    if (f) {
      if (c.req.path.startsWith('/api') || f === 'admin') return c.notFound()
      c.res = await c.html(
        <Layout env={c.env} title={`Đang hoàn thiện – ${c.env.SITE_NAME}`} noindex>
          <div class="empty">
            <h1>Trang này đang hoàn thiện</h1>
            <p>Sẽ có trên link chạy thử ngày {OPEN_DATE[f]}.</p>
            <p><a class="btn" href="/">Về trang chủ</a></p>
          </div>
        </Layout>,
        404,
      )
    } else {
      await next()
    }
    c.res.headers.set('X-Robots-Tag', 'noindex, nofollow')
    return
  }
  await next()
})

// Chuyển hướng 301 link web cũ (bảng redirects lập từ danh sách link cũ đã được cửa hàng duyệt)
app.use('*', async (c, next) => {
  if (c.req.method === 'GET' && !c.req.path.startsWith('/admin') && !c.req.path.startsWith('/api')) {
    const r = await c.env.DB.prepare('SELECT new_path, code FROM redirects WHERE old_path = ?')
      .bind(c.req.path)
      .first<{ new_path: string; code: number }>()
    if (r) return c.redirect(r.new_path, r.code as 301 | 302)
  }
  await next()
})

app.route('/api', api)
app.route('/admin', admin)
app.route('/', pub)

app.notFound((c) =>
  c.html('<meta charset="utf-8"><link rel="stylesheet" href="/style.css"><main class="wrap"><h1>Không tìm thấy trang</h1><p><a href="/">Về trang chủ</a> hoặc <a href="/tim-kiem">tìm phụ tùng</a>.</p></main>', 404),
)

export default app
