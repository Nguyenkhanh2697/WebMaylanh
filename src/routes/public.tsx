import { Hono } from 'hono'
import type { AppEnv, Env, Fitment, Product } from '../lib/types'
import { Layout, SearchPanel, ProductGrid, ProductSlider, PageHead, MAIN_CATEGORIES, PRICE_RANGES, priceRange } from '../views/layout'
import {
  IconCheck, IconChevron, IconRefresh, IconArrow, IconShield, IconUser, IconTruck, IconBadge, IconWrench, IconZalo,
  PartCompressor, PartCondenser, PartEvaporator, PartFan, PartBlower, IconCar, IconGrid, IconPhone, IconCart, IconMail,
} from '../views/icons'
import { searchProducts, type SearchParams } from '../lib/search'
import { decodeVin, modelKey } from '../lib/vin'
import { formatVnd, slugify, variantLabel } from '../lib/text'

export const pub = new Hono<AppEnv>()

// Danh mục cho ô "Danh mục" của bộ lọc: lấy từ dữ liệu, danh mục chính lên trước
async function categoriesList(env: Env) {
  const { results } = await env.DB.prepare('SELECT DISTINCT category FROM products WHERE category IS NOT NULL ORDER BY category').all<{ category: string }>()
  const all = results.map((r) => r.category)
  return [...MAIN_CATEGORIES.filter((c) => all.includes(c)), ...all.filter((c) => !MAIN_CATEGORIES.includes(c))]
}

async function makesList(env: Env) {
  const { results } = await env.DB.prepare('SELECT DISTINCT make FROM fitments ORDER BY make').all<{ make: string }>()
  return results.map((r) => r.make)
}

// Đọc tham số lọc từ URL (dùng chung cho trang chủ và trang tìm kiếm)
function readParams(q: Record<string, string>): SearchParams {
  const pr = priceRange(q.price)
  return {
    q: q.q || undefined,
    make: q.make || undefined,
    model: q.model || undefined,
    year: q.year ? Number(q.year) : undefined,
    fuel: q.fuel || undefined,
    engine: q.engine || undefined,
    category: q.category || undefined,
    origin: q.origin || undefined,
    brand: q.brand || undefined,
    priceMin: pr.min,
    priceMax: pr.max,
    page: q.page ? Number(q.page) : 1,
  }
}

const CAT_ICONS: Record<string, any> = {
  'Lốc điều hoà': PartCompressor,
  'Dàn nóng': PartCondenser,
  'Dàn lạnh': PartEvaporator,
  'Quạt dàn nóng': PartFan,
  'Quạt dàn lạnh': PartBlower,
}
const CAT_SHORT: Record<string, string> = { 'Lốc điều hoà': 'Lốc lạnh' }

// Ảnh bìa bài viết: chưa có ảnh thì dùng tạm ảnh phụ tùng trong public/banners/.
// Bài nổi bật (i = 0) có ảnh riêng, các bài sau đổi lần lượt giữa 2 ảnh còn lại
const COVER_FEATURE = '/banners/hero-lineup-m.jpg'
const COVER_FALLBACK = ['/banners/hero-bearings.jpg', '/banners/hero-parts-m.jpg']
const postCover = (cover: string | null, i: number) =>
  cover ? `/img/${cover}` : i === 0 ? COVER_FEATURE : COVER_FALLBACK[(i - 1) % COVER_FALLBACK.length]
const viDate = (s: string) => s.slice(0, 10).split('-').reverse().join('/')

// Gợi ý chọn nhanh: 4 dòng xe có nhiều sản phẩm nhất
async function quickPicks(env: Env) {
  const { results } = await env.DB.prepare(
    `SELECT make, model, MAX(COALESCE(year_to, strftime('%Y','now'))) AS y, MAX(engine) AS engine, COUNT(*) AS n
     FROM fitments WHERE make != 'Khác' GROUP BY make, model ORDER BY n DESC, make LIMIT 4`,
  ).all<{ make: string; model: string; y: number; engine: string | null }>()
  return results.map((r) => {
    const eng = r.engine && /^\d+(\.\d+)?$/.test(r.engine.split(';')[0].trim()) ? ` (${r.engine.split(';')[0].trim()}L)` : ''
    return {
      label: `${r.make} ${r.model} ${r.y}${eng}`,
      href: `/tim-kiem?make=${encodeURIComponent(r.make)}&model=${encodeURIComponent(r.model)}&year=${r.y}`,
    }
  })
}

const PriceChips = ({ base, current, total }: { base: Record<string, string>; current?: string; total: number }) => (
  <div class="price-chips">
    <span class="pc-label">💰 Khoảng giá:</span>
    {PRICE_RANGES.map((r) => {
      const qs = new URLSearchParams({ ...base, price: r.key })
      if (!r.key) qs.delete('price')
      qs.delete('page')
      const s = qs.toString()
      return <a href={`?${s}#san-pham`} class={(current || '') === r.key ? 'on' : ''}>{r.label}</a>
    })}
    <span class="pc-count">{total} sản phẩm</span>
  </div>
)

pub.get('/', async (c) => {
  const q = c.req.query()
  const params = readParams(q)
  const [makes, categories, result, quick, posts, catCounts] = await Promise.all([
    makesList(c.env),
    categoriesList(c.env),
    searchProducts(c.env.DB, params),
    quickPicks(c.env),
    c.env.DB.prepare('SELECT slug, title, tag, excerpt, cover, created_at FROM posts WHERE published = 1 ORDER BY id DESC LIMIT 4')
      .all<{ slug: string; title: string; tag: string | null; excerpt: string | null; cover: string | null; created_at: string }>(),
    // Số sản phẩm (trang sản phẩm) mỗi danh mục cho khối "Sản phẩm chính"
    c.env.DB.prepare('SELECT category, COUNT(DISTINCT slug) AS n FROM products GROUP BY category').all<{ category: string; n: number }>(),
  ])
  const catCount = Object.fromEntries(catCounts.results.map((r) => [r.category, r.n]))
  const catTotal = catCounts.results.reduce((t, r) => t + r.n, 0)
  // Link "Xem tất cả" dưới dải sản phẩm: giữ bộ lọc đang chọn, bỏ số trang
  const allQs = new URLSearchParams(Object.entries(q).filter(([k, v]) => k !== 'page' && v)).toString()
  // Banner trang chủ (nội dung theo góp ý cửa hàng ngày 21/11):
  // - Máy tính: 1 banner chính cố định (desk), không chuyển cảnh
  // - Điện thoại: 3 slide chuyển cảnh (slides)
  // Ảnh nền cửa hàng gửi 26/11: public/banners/banner-pc.jpg (máy tính 1920×600), banner-m.jpg (điện thoại 800×800); 3 slide dùng chung ảnh
  const BG = { bg: '/banners/banner-pc.jpg', bgMobile: '/banners/banner-m.jpg', bgPos: '70% 50%', bgPosMobile: '50% 50%' }
  const desk = {
    eyebrow: 'Phụ tùng điều hòa ô tô',
    line1: 'Chuyên cung cấp phụ tùng', line2: 'ĐIỀU HÒA CÁC DÒNG XE',
    sub: 'Đầy đủ lốc lạnh, dàn nóng, dàn lạnh, quạt giải nhiệt cho xe du lịch, xe tải, đầu kéo và máy công trình. Chuẩn thông số – Đúng mã phụ tùng.',
    cta: 'Tra cứu theo xe', href: '#tim-theo-xe',
    points: ['Tìm chính xác phụ tùng', 'Hàng chính hãng & OEM', 'Giao hàng toàn quốc'],
  }
  const slides: { line1: string; line2: string; sub?: string; points?: string[]; cta: string; href: string; external?: boolean; bg: string; bgMobile: string; bgPos?: string; bgPosMobile?: string }[] = [
    {
      line1: 'DQT –', line2: 'PHỤ TÙNG ĐIỀU HÒA Ô TÔ',
      sub: 'Tìm đúng phụ tùng điều hòa cho xế yêu của bạn.',
      cta: 'Tìm theo xe', href: '#tim-theo-xe',
      ...BG,
    },
    {
      line1: 'Bạn đang chưa biết', line2: 'CÁCH TÌM MÃ NÀO?',
      sub: 'Liên hệ ngay cho chúng tôi.',
      cta: 'Chat Zalo ngay', href: `https://zalo.me/${c.env.ZALO}`, external: true,
      ...BG,
    },
    {
      line1: 'Phụ tùng điều hòa', line2: 'ĐÚNG MÃ, CHUẨN XE',
      points: ['Mát sâu, bền bỉ trên mọi hành trình', 'Giao hàng toàn quốc'],
      cta: 'Tìm theo xe', href: '#tim-theo-xe',
      ...BG,
    },
  ]
  return c.html(
    <Layout env={c.env} active="home" full title={`${c.env.SITE_NAME} – Phụ tùng điều hoà ô tô chính hãng`} description="Lốc lạnh, dàn nóng, dàn lạnh, quạt dàn nóng, quạt dàn lạnh chính hãng. Tra đúng phụ tùng theo hãng xe, đời xe, động cơ hoặc số khung (VIN)." canonical="/">
      <section class="hero" data-hero aria-label="Banner">
        <div class="hero-bgs" aria-hidden="true">
          {slides.map((s, i) => (
            <div class={i === 0 ? 'hero-bg is-active' : 'hero-bg'} style={`--bg:url(${s.bg});--bg-m:url(${s.bgMobile})${s.bgPos ? `;--bg-pos:${s.bgPos}` : ''}${s.bgPosMobile ? `;--bg-pos-m:${s.bgPosMobile}` : ''}`}></div>
          ))}
        </div>
        <div class="wrap hero-row">
          <div class="hero-text">
            {/* Máy tính: 1 banner cố định */}
            <div class="hero-desk">
              <span class="hero-eyebrow">{desk.eyebrow}</span>
              <h1 class="hero-title"><span>{desk.line1}</span><strong>{desk.line2}</strong></h1>
              <p class="hero-sub">{desk.sub}</p>
              <a href={desk.href} class="hero-slide-cta" data-focus-search>{desk.cta} <IconArrow size={16} /></a>
              <ul class="hero-points-row">{desk.points.map((t) => <li>✓ {t}</li>)}</ul>
            </div>
            {/* Điện thoại: 3 slide chuyển cảnh */}
            <div class="hero-mob" aria-roledescription="carousel">
              <div class="hero-slides">
                {slides.map((s, i) => (
                  <div class={i === 0 ? 'hero-slide is-active' : 'hero-slide'} role="group" aria-roledescription="slide" aria-label={`${i + 1} / ${slides.length}`} aria-hidden={i === 0 ? 'false' : 'true'}>
                    <h2 class="hero-title"><span>{s.line1}</span><strong>{s.line2}</strong></h2>
                    {s.sub && <p class="hero-sub">{s.sub}</p>}
                    {s.points && <ul class="hero-sub hero-list">{s.points.map((t) => <li>{t}</li>)}</ul>}
                    <a href={s.href} class="hero-slide-cta" {...(s.external ? { target: '_blank', rel: 'noopener' } : { 'data-focus-search': '' })}>{s.cta} <IconArrow size={16} /></a>
                  </div>
                ))}
              </div>
              <div class="hero-nav">
                <button type="button" class="hero-arrow" data-hero-prev aria-label="Slide trước"><IconArrow size={16} /></button>
                {slides.map((_, i) => (
                  <button type="button" class={i === 0 ? 'hero-dot is-active' : 'hero-dot'} data-hero-dot={String(i)} aria-label={`Xem slide ${i + 1}`}></button>
                ))}
                <button type="button" class="hero-arrow" data-hero-next aria-label="Slide sau"><IconArrow size={16} /></button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="wrap finder">
        <SearchPanel makes={makes} categories={categories} values={q} quick={quick} />
        <aside class="help-card">
          <div class="help-inner">
            <div class="help-photo" aria-hidden="true"><IconCar size={54} /></div>
            <div>
              <h3>Không chắc chắn? Hãy để chúng tôi hỗ trợ!</h3>
              <p>Gửi thông tin xe, nhân viên sẽ kiểm tra và tư vấn giúp bạn lựa chọn đúng phụ tùng.</p>
            </div>
          </div>
          <a href={`https://zalo.me/${c.env.ZALO}`} target="_blank" rel="noopener" class="btn-zalo-pill"><IconZalo size={24} /> Tư vấn qua Zalo</a>
        </aside>
      </section>

      <section class="wrap block">
        <div class="block-head">
          <h2>Sản phẩm chính</h2>
        </div>
        <div class="cat-grid">
          {MAIN_CATEGORIES.map((cat) => {
            const Ic = CAT_ICONS[cat]
            return (
              <a href={`/tim-kiem?category=${encodeURIComponent(cat)}#san-pham`} class="cat-card">
                <span class="cat-ic"><Ic size={46} /></span>
                <b>{CAT_SHORT[cat] || cat}</b>
                <small>{catCount[cat] ? `${catCount[cat]} sản phẩm` : 'Đang cập nhật'}</small>
              </a>
            )
          })}
          <a href="/tim-kiem" class="cat-card all">
            <span class="cat-ic"><IconGrid size={30} /></span>
            <b>Tất cả</b>
            <small>{catTotal} sản phẩm</small>
          </a>
        </div>
      </section>

      <section class="wrap block" id="san-pham">
        <div class="list-card">
          <div class="list-head">
            <h2 class="bar-title">{params.category ? `Danh sách ${params.category.toLowerCase()} chính hãng` : 'Danh sách phụ tùng điều hòa chính hãng'}</h2>
            <span class="pc-count">{result.total} sản phẩm</span>
          </div>
          {result.hits.length ? <ProductSlider hits={result.hits} moreHref={`/tim-kiem?${allQs}`} moreLabel={`Xem tất cả ${result.total} sản phẩm`} /> : (
            <div class="empty"><p>Chưa có sản phẩm phù hợp.</p><p class="quote-hint"><a href="/yeu-cau-bao-gia">Gửi yêu cầu báo giá</a>, cửa hàng sẽ tìm giúp.</p></div>
          )}
        </div>
      </section>

      <section class="wrap">
        <div class="features">
          {[
            [IconShield, 'Sản phẩm chính hãng', 'Cam kết chất lượng', '/trang/chinh-sach-bao-hanh'],
            [IconUser, 'Tư vấn chuyên nghiệp', 'Đúng sản phẩm - đúng xe', `https://zalo.me/${c.env.ZALO}`],
            [IconTruck, 'Giao hàng toàn quốc', 'Nhanh chóng - An toàn', '/trang/chinh-sach-van-chuyen'],
            [IconBadge, 'Bảo hành rõ ràng', 'Hỗ trợ đổi trả', '/trang/chinh-sach-doi-tra'],
          ].map(([Ic, t, s, href]: any) => (
            <a href={href} class="feature">
              <span class="f-icon"><Ic size={22} /></span>
              <span><b>{t} <IconChevron size={13} /></b><small>{s} <IconChevron size={11} /></small></span>
            </a>
          ))}
        </div>
      </section>

      {posts.results.length > 0 && (
        <section class="wrap block">
          <div class="block-head">
            <h2>Kiến thức hữu ích</h2>
            <a href="/kien-thuc" class="more blue">Xem tất cả <IconArrow size={14} /></a>
          </div>
          {/* Bố cục tạp chí: 1 bài nổi bật ảnh lớn + 3 bài dạng hàng có ảnh nhỏ */}
          <div class="news">
            {posts.results.slice(0, 1).map((p) => (
              <a href={`/bai-viet/${p.slug}`} class="news-feature">
                <div class="news-img">
                  <img src={postCover(p.cover, 0)} alt={p.title} loading="lazy" />
                  {p.tag && <span class="post-tag">{p.tag}</span>}
                </div>
                <div class="news-body">
                  <time datetime={p.created_at.slice(0, 10)}>{viDate(p.created_at)}</time>
                  <h3>{p.title}</h3>
                  {p.excerpt && <p>{p.excerpt}</p>}
                  <span class="news-more">Đọc tiếp <IconArrow size={15} /></span>
                </div>
              </a>
            ))}
            <div class="news-list">
              {posts.results.slice(1).map((p, i) => (
                <a href={`/bai-viet/${p.slug}`} class="news-item">
                  <div class="news-thumb"><img src={postCover(p.cover, i + 1)} alt={p.title} loading="lazy" /></div>
                  <div class="news-text">
                    {p.tag && <span class="news-tag">{p.tag}</span>}
                    <b>{p.title}</b>
                    {p.excerpt && <small>{p.excerpt}</small>}
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}
    </Layout>,
  )
})

pub.get('/tim-kiem', async (c) => {
  const q = c.req.query()
  const params = readParams(q)
  const [makes, categories, result] = await Promise.all([makesList(c.env), categoriesList(c.env), searchProducts(c.env.DB, params)])
  const pr = priceRange(q.price)
  const label = [q.q, q.make, q.model, q.year, q.engine, q.category, q.price ? pr.label : ''].filter(Boolean).join(' · ')
  const next = new URLSearchParams({ ...q, page: String(result.page + 1) }).toString()
  return c.html(
    <Layout env={c.env} active="products" title={`${label ? 'Tìm: ' + label : 'Sản phẩm'} – ${c.env.SITE_NAME}`} noindex={!!label}>
      <PageHead crumbs={[['Trang chủ', '/'], ['Sản phẩm', q.category || q.make ? '/tim-kiem' : undefined], ...(q.category ? [[q.category] as [string]] : q.make ? [[q.make] as [string]] : [])]} />
      <SearchPanel makes={makes} categories={categories} values={q} />
      <div class="list-card mt" id="san-pham">
        <div class="list-head">
          <h1 class="bar-title">{label ? `Kết quả: ${label}` : 'Tất cả phụ tùng'}</h1>
          <span class="pc-count">{result.total} sản phẩm</span>
        </div>
        {result.hits.length ? <ProductGrid hits={result.hits} /> : (
          <div class="empty"><p>Chưa tìm thấy sản phẩm phù hợp.</p><p class="quote-hint">Gửi yêu cầu báo giá, cửa hàng sẽ tìm giúp: <a href="/yeu-cau-bao-gia">Gửi yêu cầu</a></p></div>
        )}
        {result.hasMore && <p class="center"><a class="btn" href={`/tim-kiem?${next}`}>Xem thêm</a></p>}
      </div>
    </Layout>,
  )
})

pub.get('/danh-muc/:slug', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT DISTINCT category FROM products').all<{ category: string }>()
  const cat = results.find((r) => slugify(r.category) === c.req.param('slug'))?.category
  if (!cat) return c.notFound()
  return c.redirect(`/tim-kiem?category=${encodeURIComponent(cat)}`, 301)
})

// Tra số khung (Phụ lục 04): giải mã, rồi tìm phụ tùng theo mã nhóm xe (nếu file số khung đã điền) hoặc theo hãng + dòng + đời
pub.get('/tra-vin', async (c) => {
  const input = (c.req.query('vin') || '').trim()
  const [makes, categories] = await Promise.all([makesList(c.env), categoriesList(c.env)])
  if (!input) return c.redirect('/#tim-theo-xe')
  const r = await decodeVin(c.env.DB, input)

  let hits: Awaited<ReturnType<typeof searchProducts>>['hits'] = []
  let make: string | undefined
  let model: string | undefined
  const groups = r.parts ? Object.values(r.parts).filter(Boolean) : []
  if (groups.length) hits = (await searchProducts(c.env.DB, { groups })).hits
  if (!hits.length && r.make) {
    // Khớp hãng và dòng xe với dữ liệu "Xe phù hợp" (bỏ qua khác biệt dấu cách, gạch: CRV = CR-V)
    make = makes.find((m) => modelKey(r.make!).includes(modelKey(m)) || modelKey(m).includes(modelKey(r.make!)))
    if (make && r.model) {
      const { results } = await c.env.DB.prepare('SELECT DISTINCT model FROM fitments WHERE make = ?').bind(make).all<{ model: string }>()
      const key = modelKey(r.model.replace(new RegExp('^' + make, 'i'), ''))
      model = results.find((m) => modelKey(m.model) === key)?.model ?? results.find((m) => key.startsWith(modelKey(m.model)) || modelKey(m.model).startsWith(key))?.model
    }
    if (make && model) hits = (await searchProducts(c.env.DB, { make, model, year: r.year })).hits
  }

  const carText = [r.make, r.model, r.engine, r.year ? `đời ${r.year}` : '', r.country ? `(${r.country})` : ''].filter(Boolean).join(' ')
  const prefill = { make: make || '', year: r.year ? String(r.year) : '', vin: r.vin }
  const quoteLink = `/yeu-cau-bao-gia?vin=${encodeURIComponent(r.vin)}&vehicle=${encodeURIComponent(carText)}`
  return c.html(
    <Layout env={c.env} active="vehicle" title={`Tra số khung ${r.vin} – ${c.env.SITE_NAME}`} noindex>
      <PageHead crumbs={[['Trang chủ', '/'], ['Tìm theo xe', '/#tim-theo-xe'], ['Số khung']]} />
      <div class={`vin-card vin-${r.matched}`}>
        <div class="vin-code"><span>Số khung</span><b>{r.vin}</b></div>
        {r.matched === 'full' && <h1 class="vin-title">Xe của bạn: {carText}</h1>}
        {r.matched === 'make' && <h1 class="vin-title">Nhận ra {[r.make, r.year ? `đời ${r.year}` : ''].filter(Boolean).join(' ')}</h1>}
        {r.matched === 'none' && <h1 class="vin-title">{r.kind === 'invalid' ? 'Số khung chưa đúng định dạng' : 'Chưa có dữ liệu cho số khung này'}</h1>}
        {r.matched !== 'none' && (
          <ul class="vin-facts">
            {r.make && <li><small>Hãng</small><b>{r.make}</b></li>}
            {r.model && <li><small>Dòng xe</small><b>{r.model}</b></li>}
            {r.engine && <li><small>Động cơ</small><b>{r.engine}</b></li>}
            {r.year && <li><small>Năm</small><b>{r.year}</b></li>}
            {r.country && <li><small>Nơi sản xuất</small><b>{r.country}</b></li>}
          </ul>
        )}
        <p class="vin-note">
          {r.matched === 'full' && 'Danh sách dưới đây là phụ tùng lắp được cho xe này.'}
          {r.matched === 'make' && 'Chưa có dữ liệu dòng xe cho số khung này. Chọn thêm dòng xe bên dưới, hoặc gửi số khung để cửa hàng tra giúp.'}
          {r.matched === 'none' && (r.kind === 'invalid' ? 'Số khung gồm 17 ký tự, không có chữ I, O, Q. Kiểm tra lại trên giấy đăng ký xe.' : 'Gửi số khung để cửa hàng tra giúp, hoặc chọn xe bên dưới.')}
        </p>
        <div class="vin-actions">
          <a href={quoteLink} class="btn btn-primary">Gửi số khung để cửa hàng tra giúp</a>
          <a href={`https://zalo.me/${c.env.ZALO}`} class="btn btn-ghost" target="_blank" rel="noopener"><IconZalo size={18} /> Hỏi qua Zalo</a>
        </div>
      </div>
      {hits.length > 0 ? (
        <div class="list-card"><div class="list-head"><h2 class="bar-title">Phụ tùng lắp được ({hits.length})</h2></div><ProductGrid hits={hits} /></div>
      ) : (
        <SearchPanel makes={makes} categories={categories} values={prefill} />
      )}
    </Layout>,
  )
})

type Post = { slug: string; title: string; tag: string | null; excerpt: string | null; cover: string | null; body: string; created_at: string }
const postList = (env: Env, title: string, active: string, rows: Post[]) => (
  <Layout env={env} active={active} title={`${title} – ${env.SITE_NAME}`} canonical={active === 'news' ? '/tin-tuc' : '/kien-thuc'}>
    <PageHead crumbs={[['Trang chủ', '/'], [title]]} title={title} sub="Mẹo sử dụng, dấu hiệu hư hỏng và cách chọn đúng phụ tùng điều hoà ô tô." />
    <div class="posts">
      {rows.map((p, i) => (
        <a href={`/bai-viet/${p.slug}`} class="post">
          <div class={`post-cover c${i % 4}`}>{p.cover ? <img src={`/img/${p.cover}`} alt={p.title} loading="lazy" /> : <IconWrench size={46} />}{p.tag && <span class="post-tag">{p.tag}</span>}</div>
          <div class="post-body"><b>{p.title}</b><small>{p.excerpt}</small></div>
        </a>
      ))}
    </div>
    {!rows.length && <p class="empty">Chưa có bài viết.</p>}
  </Layout>
)
pub.get('/kien-thuc', async (c) => {
  const { results } = await c.env.DB.prepare("SELECT * FROM posts WHERE published = 1 AND COALESCE(tag,'') != 'Tin tức' ORDER BY id DESC LIMIT 60").all<Post>()
  return c.html(postList(c.env, 'Kiến thức điều hoà ô tô', 'knowledge', results))
})
pub.get('/tin-tuc', async (c) => {
  const { results } = await c.env.DB.prepare("SELECT * FROM posts WHERE published = 1 AND tag = 'Tin tức' ORDER BY id DESC LIMIT 60").all<Post>()
  return c.html(postList(c.env, 'Tin tức', 'news', results))
})
pub.get('/bai-viet/:slug', async (c) => {
  const p = await c.env.DB.prepare('SELECT * FROM posts WHERE slug = ? AND published = 1').bind(c.req.param('slug')).first<Post>()
  if (!p) return c.notFound()
  const { results: more } = await c.env.DB.prepare(
    "SELECT * FROM posts WHERE published = 1 AND slug != ? AND slug NOT LIKE 'trang-%' AND COALESCE(tag,'') != 'Tin tức' ORDER BY id DESC LIMIT 4",
  ).bind(p.slug).all<Post>()
  return c.html(
    <Layout env={c.env} active="knowledge" title={`${p.title} – ${c.env.SITE_NAME}`} description={p.excerpt || undefined} canonical={`/bai-viet/${p.slug}`}>
      <PageHead crumbs={[['Trang chủ', '/'], ['Kiến thức hữu ích', '/kien-thuc'], [p.title]]} />
      <div class="article-wrap">
        <article class="article">
          {p.tag && <span class="cat-badge">{p.tag}</span>}
          <h1>{p.title}</h1>
          {p.excerpt && <p class="article-lead">{p.excerpt}</p>}
          {p.cover && <img class="article-cover" src={`/img/${p.cover}`} alt={p.title} />}
          <div class="article-body">{p.body.split(/\n{2,}/).map((para) => <p>{para}</p>)}</div>
          <div class="article-cta">
            <b>Cần tìm đúng phụ tùng cho xe của bạn?</b>
            <span>Gửi hãng, dòng xe, đời xe hoặc số khung, cửa hàng tư vấn miễn phí.</span>
            <div><a class="btn btn-primary" href="/#tim-theo-xe">Tìm theo xe</a> <a class="btn btn-ghost" href={`https://zalo.me/${c.env.ZALO}`} target="_blank" rel="noopener"><IconZalo size={18} /> Chat Zalo</a></div>
          </div>
        </article>
        {more.length > 0 && (
          <aside class="article-side">
            <h2>Bài viết khác</h2>
            {more.map((m, i) => (
              <a href={`/bai-viet/${m.slug}`} class="side-post">
                <div class={`side-cover c${i % 4}`}>{m.cover ? <img src={`/img/${m.cover}`} alt="" loading="lazy" /> : <IconWrench size={22} />}</div>
                <div><b>{m.title}</b>{m.tag && <small>{m.tag}</small>}</div>
              </a>
            ))}
          </aside>
        )}
      </div>
    </Layout>,
  )
})

// Trang nội dung tĩnh (giới thiệu, chính sách…): nội dung lưu trong bảng posts với slug "trang-..."
const STATIC_TITLES: Record<string, string> = {
  'ho-tro': 'Hỗ trợ khách hàng', 'dai-ly': 'Chính sách đại lý', 'gioi-thieu': 'Giới thiệu',
  'huong-dan-mua-hang': 'Hướng dẫn mua hàng', 'chinh-sach-van-chuyen': 'Chính sách vận chuyển',
  'chinh-sach-bao-hanh': 'Chính sách bảo hành', 'chinh-sach-doi-tra': 'Chính sách đổi trả',
  'chinh-sach-bao-mat': 'Chính sách bảo mật', 'dieu-khoan-su-dung': 'Điều khoản sử dụng',
}
const SUPPORT_MENU = ['huong-dan-mua-hang', 'chinh-sach-van-chuyen', 'chinh-sach-bao-hanh', 'chinh-sach-doi-tra', 'chinh-sach-bao-mat', 'dieu-khoan-su-dung']
pub.get('/trang/:slug', async (c) => {
  const slug = c.req.param('slug')
  const title = STATIC_TITLES[slug]
  if (!title) return c.notFound()
  const p = await c.env.DB.prepare('SELECT * FROM posts WHERE slug = ?').bind('trang-' + slug).first<Post>()
  const active = slug === 'ho-tro' ? 'support' : slug === 'dai-ly' ? 'dealer' : slug === 'gioi-thieu' ? 'about' : SUPPORT_MENU.includes(slug) ? 'support' : undefined
  return c.html(
    <Layout env={c.env} active={active} title={`${title} – ${c.env.SITE_NAME}`} canonical={`/trang/${slug}`}>
      <PageHead crumbs={[['Trang chủ', '/'], ['Hỗ trợ', slug === 'ho-tro' ? undefined : '/trang/ho-tro'], ...(slug === 'ho-tro' ? [] : [[title] as [string]])]} />
      <div class="support">
        <nav class="support-nav" aria-label="Hỗ trợ">
          <a href="/trang/ho-tro" class={slug === 'ho-tro' ? 'on' : ''}>Hỗ trợ khách hàng</a>
          {SUPPORT_MENU.map((k) => <a href={`/trang/${k}`} class={k === slug ? 'on' : ''}>{STATIC_TITLES[k]}</a>)}
          <div class="support-contact">
            <b>Cần hỗ trợ ngay?</b>
            <a href={`tel:${c.env.PHONE}`} class="btn btn-primary"><IconPhone size={16} /> {c.env.PHONE}</a>
            <a href={`https://zalo.me/${c.env.ZALO}`} class="btn btn-ghost" target="_blank" rel="noopener"><IconZalo size={18} /> Chat Zalo</a>
          </div>
        </nav>
        <article class="article support-body">
          <h1>{p?.title || title}</h1>
          <div class="article-body">
            {p ? p.body.split(/\n{2,}/).map((para) => <p>{para}</p>) : <p class="muted">Nội dung đang được cửa hàng cập nhật. Cần hỗ trợ ngay, vui lòng gọi <a href={`tel:${c.env.PHONE}`}>{c.env.PHONE}</a> hoặc nhắn Zalo.</p>}
          </div>
        </article>
      </div>
    </Layout>,
  )
})

// Trang sản phẩm: gộp các dòng cùng tên (cùng slug), khách chọn loại (thương hiệu – xuất xứ – điện áp)
pub.get('/san-pham/:slug', async (c) => {
  const slug = c.req.param('slug')
  const { results: variants } = await c.env.DB.prepare(
    "SELECT * FROM products WHERE slug = ? ORDER BY CASE status WHEN 'Còn hàng' THEN 0 ELSE 1 END, price IS NULL, price",
  )
    .bind(slug)
    .all<Product>()
  if (!variants.length) return c.notFound()

  const groups = [...new Set(variants.map((v) => v.vehicle_group || v.sku))]
  const ph = groups.map(() => '?').join(',')
  const { results: fits } = await c.env.DB.prepare(
    `SELECT DISTINCT make, model, year_from, year_to, fuel, engine, note, group_key FROM fitments WHERE group_key IN (${ph}) ORDER BY make, model, year_from`,
  )
    .bind(...groups)
    .all<Fitment>()

  const first = variants[0]
  const data = variants.map((v) => ({
    id: v.id,
    sku: v.sku,
    label: variantLabel(v),
    brand: v.brand || '',
    origin: v.origin || '',
    voltage: v.voltage || '',
    price: v.price,
    priceText: formatVnd(v.price),
    status: v.status,
    images: (JSON.parse(v.images) as string[]).map((k) => `/img/${k}`),
    oem: v.oem_codes,
    equiv: v.equiv_codes,
    description: v.description,
  }))
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: first.name,
    sku: first.sku,
    category: first.category,
    image: data[0].images.map((u) => c.env.SITE_URL + u),
    offers: variants
      .filter((v) => v.price != null)
      .map((v) => ({
        '@type': 'Offer',
        sku: v.sku,
        price: v.price,
        priceCurrency: 'VND',
        availability: v.status === 'Còn hàng' ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      })),
  }
  // Chọn loại theo 3 nhóm riêng (góp ý 26/11): Nhà sản xuất · Xuất xứ · Điện áp; nhóm nào không có dữ liệu thì ẩn (vd. điện áp)
  const pickGroups = (([['brand', 'Nhà sản xuất'], ['origin', 'Xuất xứ'], ['voltage', 'Điện áp']] as const)
    .map(([key, title]) => ({ key, title, values: [...new Set(data.map((d) => d[key]).filter(Boolean))] }))
    .filter((g) => g.values.length > 0))
  const vehicles = [...new Set(fits.map((f) => `${f.make} ${f.model}`))].slice(0, 6).join(', ')
  const related = (await searchProducts(c.env.DB, { category: first.category })).hits.filter((h) => h.slug !== slug).slice(0, 4)

  return c.html(
    <Layout
      env={c.env}
      title={`${first.name} – ${c.env.SITE_NAME}`}
      description={`${first.name}${vehicles ? ' lắp cho ' + vehicles : ''}. ${variants.length > 1 ? variants.length + ' loại: ' + data.map((d) => d.label).join(', ') + '.' : ''}`}
      canonical={`/san-pham/${slug}`}
      jsonLd={jsonLd}
    >
      <PageHead crumbs={[['Trang chủ', '/'], ['Sản phẩm', '/tim-kiem'], [first.category, `/tim-kiem?category=${encodeURIComponent(first.category)}`], [first.name]]} />
      <div class="product pd" id="product" data-variants={JSON.stringify(data)} data-name={first.name}>
        <div class="pd-gallery">
          <div class="pd-main">
            <img id="pv-image" src={data[0].images[0] || '/no-image.svg'} alt={first.name} width="600" height="600" />
          </div>
          <div id="pv-thumbs" class="thumbs"></div>
        </div>
        <div class="pd-info">
          <span class="pd-cat">{first.category}</span>
          <h1 class="pd-title">{first.name}</h1>
          <div class="pd-meta">
            <span>Mã: <b id="pv-sku">{data[0].sku}</b></span>
            <span class="pd-status" id="pv-status" data-status={data[0].status}>{data[0].status}</span>
          </div>
          <div class="pd-codes" id="pv-codes">
            {data[0].oem && <>Mã OEM: {data[0].oem}</>}
            {data[0].equiv && <> · Tương đương: {data[0].equiv}</>}
          </div>
          {vehicles && <p class="pd-fit"><IconCar size={16} /> Lắp cho: <b>{vehicles}</b>{fits.length > 6 ? '…' : ''} <a href="#xe-lap-duoc">Xem bảng xe</a></p>}
          {pickGroups.length > 0 && (
            <div class="variant-picker">
              {pickGroups.map((g) => (
                <div class="variant-group" data-group={g.key}>
                  <div class="label">{g.title}: <b data-sel={g.key}>{data[0][g.key]}</b></div>
                  <div class="variant-buttons">
                    {g.values.map((val) => (
                      <button type="button" class={'variant-btn' + (data[0][g.key] === val ? ' active' : '')} data-group={g.key} data-value={val}>{val}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div class="pd-buy">
            <div class="pd-price" id="pv-price">{data[0].priceText}</div>
            <div class="qty-row">
              <div class="qty-step">
                <button type="button" data-step="-1" aria-label="Bớt 1">−</button>
                <input type="number" id="pv-qty" min="1" max="99" value="1" aria-label="Số lượng" />
                <button type="button" data-step="1" aria-label="Thêm 1">+</button>
              </div>
              <button type="button" id="pv-add" class="btn btn-primary btn-lg"><IconCart size={18} /> Thêm vào giỏ</button>
            </div>
            <div class="contact-row">
              <a class="btn btn-ghost" href={`tel:${c.env.PHONE}`}><IconPhone size={16} /> Gọi {c.env.PHONE}</a>
              <a class="btn btn-ghost" href={`https://zalo.me/${c.env.ZALO}`} target="_blank" rel="noopener"><IconZalo size={18} /> Chat Zalo</a>
            </div>
            <a class="pd-quote" href={`/yeu-cau-bao-gia?sku=${encodeURIComponent(data[0].sku)}`}>Chưa chắc đúng xe? Gửi yêu cầu tư vấn →</a>
          </div>
          <ul class="pd-trust">
            <li><IconShield size={18} /> Hàng chính hãng, đúng mã</li>
            <li><IconBadge size={18} /> Bảo hành theo chính sách</li>
            <li><IconTruck size={18} /> Giao hàng toàn quốc</li>
            <li><IconUser size={18} /> Tư vấn đúng xe miễn phí</li>
          </ul>
        </div>
      </div>
      <div class="pd-sections">
        {fits.length > 0 && (
          <section class="pd-card" id="xe-lap-duoc">
            <h2>Xe lắp được <small>{fits.length} dòng xe</small></h2>
            <div class="table-scroll">
            <table class="fit-table stack-table">
              <thead>
                <tr><th>Hãng</th><th>Dòng xe</th><th>Đời</th><th>Nhiên liệu</th><th>Dung tích</th><th>Ghi chú</th></tr>
              </thead>
              <tbody>
                {fits.map((f) => (
                  <tr>
                    <td data-label="Hãng">{f.make}</td>
                    <td data-label="Dòng xe"><b>{f.model}</b></td>
                    <td data-label="Đời">{f.year_from}–{f.year_to ?? 'nay'}</td>
                    <td data-label="Nhiên liệu">{f.fuel || 'Tất cả'}</td>
                    <td data-label="Dung tích">{f.engine || 'Tất cả'}</td>
                    <td data-label="Ghi chú">{f.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </section>
        )}
        <section class="pd-card">
          <h2>Mô tả sản phẩm</h2>
          <p id="pv-desc" class="desc">{data[0].description || 'Cửa hàng đang cập nhật mô tả. Cần thông số chi tiết, vui lòng gọi hoặc nhắn Zalo.'}</p>
        </section>
        {related.length > 0 && (
          <section class="list-card">
            <div class="list-head"><h2 class="bar-title">Sản phẩm cùng danh mục</h2><a class="more-link" href={`/tim-kiem?category=${encodeURIComponent(first.category)}`}>Xem tất cả →</a></div>
            <ProductGrid hits={related} />
          </section>
        )}
      </div>
    </Layout>,
  )
})

const isQuote = (env: Env) => (env.CHECKOUT_MODE || 'quote') !== 'pay'

// Giỏ hàng: Thông tin liên hệ | Đơn hàng của bạn. Góp ý 26/11: bỏ Email, bỏ Tỉnh/Thành; Địa chỉ + Ghi chú gộp vào Thông tin liên hệ
pub.get('/gio-hang', (c) => {
  const quote = isQuote(c.env)
  return c.html(
    <Layout env={c.env} title={`Giỏ hàng – ${c.env.SITE_NAME}`} noindex>
      <PageHead crumbs={[['Trang chủ', '/'], ['Giỏ hàng']]} title="Giỏ hàng" sub={quote ? 'Gửi danh sách phụ tùng cần mua, cửa hàng kiểm tra đúng xe, báo giá và phí giao hàng qua điện thoại hoặc Zalo.' : 'Kiểm tra sản phẩm và nhập thông tin nhận hàng.'} />
      <div class="co" id="co" data-mode={quote ? 'quote' : 'pay'}>
        <form id="checkout" class="co-main" novalidate>
          <section class="co-card">
            <h2><IconUser size={18} /> Thông tin liên hệ</h2>
            <label class="f-row"><span>Tên <i>*</i></span><input name="customer_name" placeholder="Nhập tên của bạn" required autocomplete="name" /></label>
            <label class="f-row"><span>Số điện thoại <i>*</i></span><input name="phone" placeholder="Ví dụ: 0912345678" required inputmode="tel" autocomplete="tel" /></label>
            <label class="f-row"><span>Địa chỉ <em>(Không bắt buộc)</em></span><input name="address" placeholder="Số nhà, đường, phường/xã, tỉnh/thành…" autocomplete="street-address" /></label>
            <label class="f-row"><span>Ghi chú <em>(Tuỳ chọn)</em></span><textarea name="note" rows={3} placeholder={quote ? 'Ghi chú thêm về yêu cầu báo giá: dòng xe, đời xe, số khung…' : 'Ghi chú cho đơn hàng'}></textarea></label>
          </section>
          {!quote && (
            <section class="co-card">
              <h2>Thanh toán</h2>
              <label class="f-radio"><input type="radio" name="pay" value="cod" checked /> Thanh toán khi nhận hàng (COD)</label>
              <label class="f-radio"><input type="radio" name="pay" value="qr" /> Chuyển khoản qua mã QR</label>
            </section>
          )}
        </form>
        <aside class="co-side">
          <div class="co-card co-summary">
            <h2>Đơn hàng của bạn <span class="co-count" id="co-count">0 sản phẩm</span></h2>
            <div id="cart"></div>
            <div class="co-total"><span>Tạm tính</span><b id="co-total">0 đ</b></div>
            <button type="submit" form="checkout" class="btn btn-primary btn-lg btn-block" id="co-submit">{quote ? 'Yêu cầu báo giá' : 'Đặt hàng'} <IconArrow size={16} /></button>
            <p class="co-err" id="co-err" role="alert"></p>
            <p class="co-safe"><IconShield size={14} /> Thông tin được mã hoá bảo mật</p>
          </div>
        </aside>
      </div>
    </Layout>,
  )
})

pub.get('/don-hang/:code', async (c) => {
  const order = await c.env.DB.prepare('SELECT * FROM orders WHERE code = ?').bind(c.req.param('code')).first<{
    id: number; code: string; total: number; status: string; customer_name: string; phone: string
  }>()
  if (!order) return c.notFound()
  const { results: items } = await c.env.DB.prepare('SELECT * FROM order_items WHERE order_id = ?').bind(order.id).all<{
    name: string; variant: string | null; price: number; qty: number
  }>()
  const quote = isQuote(c.env)
  // Chế độ 'pay': mã VietQR có sẵn số tiền và nội dung = mã đơn; cửa hàng kiểm tra tiền về rồi xác nhận trong trang quản trị
  const qr = `https://img.vietqr.io/image/${c.env.BANK_ID}-${c.env.BANK_ACCOUNT}-compact2.png?amount=${order.total}&addInfo=${encodeURIComponent(order.code)}&accountName=${encodeURIComponent(c.env.BANK_ACCOUNT_NAME)}`
  return c.html(
    <Layout env={c.env} title={`${quote ? 'Yêu cầu' : 'Đơn hàng'} ${order.code}`} noindex>
      <div class="done">
        <div class="done-icon"><IconCheck size={56} /></div>
        <h1>{quote ? 'Đã gửi yêu cầu báo giá' : 'Đặt hàng thành công'}</h1>
        <p>Cảm ơn {order.customer_name}. Mã {quote ? 'yêu cầu' : 'đơn'} của bạn: <b>{order.code}</b></p>
        <p class="muted">{quote ? `Cửa hàng sẽ kiểm tra đúng xe và gọi lại số ${order.phone} để báo giá, phí giao hàng.` : 'Cửa hàng sẽ gọi xác nhận đơn hàng.'}</p>
        <div class="co-card done-items">
          {items.map((i) => (
            <div class="cl"><div class="cl-body"><b>{i.name}</b>{i.variant && <small>{i.variant}</small>}</div><span class="cl-qty">x{i.qty}</span><span class="cl-price">{formatVnd(i.price * i.qty)}</span></div>
          ))}
          <div class="co-total"><span>Tạm tính</span><b>{formatVnd(order.total)}</b></div>
        </div>
        {!quote && order.status === 'Chờ thanh toán' && (
          <div class="qr-box">
            <p>Nếu chuyển khoản, quét mã dưới đây. Nội dung: <b>{order.code}</b></p>
            <img src={qr} alt="Mã QR thanh toán" width="280" />
          </div>
        )}
        <div class="done-actions">
          <a href="/" class="btn btn-ghost">Về trang chủ</a>
          <a href={`https://zalo.me/${c.env.ZALO}`} class="btn btn-primary" target="_blank" rel="noopener"><IconZalo size={18} /> Nhắn Zalo cho cửa hàng</a>
        </div>
      </div>
    </Layout>,
  )
})

pub.get('/yeu-cau-bao-gia', (c) => {
  const ok = c.req.query('ok') === '1'
  return c.html(
    <Layout env={c.env} title={`Yêu cầu báo giá – ${c.env.SITE_NAME}`} canonical="/yeu-cau-bao-gia">
      <PageHead crumbs={[['Trang chủ', '/'], ['Yêu cầu báo giá']]} title="Yêu cầu báo giá" sub="Không tìm thấy phụ tùng hoặc chưa chắc đúng xe? Gửi thông tin xe, cửa hàng tra mã và báo giá cho bạn." />
      {ok && <div class="notice-ok"><IconCheck size={22} /> Đã gửi yêu cầu. Cửa hàng sẽ gọi lại cho bạn sớm.</div>}
      <div class="co">
        <form method="post" action="/api/quote" class="co-main" data-loader="Đang gửi yêu cầu…">
          <input type="hidden" name="product_sku" value={c.req.query('sku') || ''} />
          <section class="co-card">
            <h2><IconUser size={18} /> Thông tin liên hệ</h2>
            <div class="f-2">
              <label class="f-row"><span>Họ tên <i>*</i></span><input name="name" placeholder="Nhập tên của bạn" required autocomplete="name" /></label>
              <label class="f-row"><span>Số điện thoại <i>*</i></span><input name="phone" placeholder="Ví dụ: 0912345678" required inputmode="tel" autocomplete="tel" /></label>
            </div>
          </section>
          <section class="co-card">
            <h2><IconCar size={18} /> Thông tin xe và phụ tùng</h2>
            <label class="f-row"><span>Xe của bạn</span><input name="vehicle" placeholder="Hãng, dòng xe, đời xe. Ví dụ: Toyota Vios 2018" value={c.req.query('vehicle') || ''} /></label>
            <label class="f-row"><span>Số khung <em>(nếu có)</em></span><input name="vin" placeholder="17 ký tự trên giấy đăng ký xe" value={c.req.query('vin') || ''} class="upper" /></label>
            <label class="f-row"><span>Cần phụ tùng gì?</span><textarea name="message" rows={4} placeholder="Ví dụ: dàn nóng, lốc lạnh… hoặc mô tả tình trạng xe"></textarea></label>
            {c.req.query('sku') && <p class="muted">Sản phẩm đang xem: <b>{c.req.query('sku')}</b></p>}
            <button type="submit" class="btn btn-primary btn-lg">Gửi yêu cầu <IconArrow size={16} /></button>
          </section>
        </form>
        <aside class="co-side">
          <div class="co-card help-card">
            <h2>Cần nhanh hơn?</h2>
            <p class="muted">Gọi hoặc nhắn Zalo, gửi ảnh tem mã phụ tùng hoặc giấy đăng ký xe để được tra mã ngay.</p>
            <a href={`tel:${c.env.PHONE}`} class="btn btn-primary btn-block"><IconPhone size={16} /> {c.env.PHONE}</a>
            <a href={`https://zalo.me/${c.env.ZALO}`} class="btn btn-ghost btn-block" target="_blank" rel="noopener"><IconZalo size={18} /> Chat Zalo</a>
            {c.env.EMAIL && <a href={`mailto:${c.env.EMAIL}`} class="help-line"><IconMail size={16} /> {c.env.EMAIL}</a>}
          </div>
        </aside>
      </div>
    </Layout>,
  )
})

pub.get('/robots.txt', (c) => c.text(`User-agent: *\nDisallow: /admin\nDisallow: /gio-hang\nSitemap: ${c.env.SITE_URL}/sitemap.xml\n`))

pub.get('/sitemap.xml', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT slug, MAX(updated_at) AS u FROM products GROUP BY slug').all<{ slug: string; u: string }>()
  const { results: cats } = await c.env.DB.prepare('SELECT DISTINCT category FROM products').all<{ category: string }>()
  const urls = [
    `<url><loc>${c.env.SITE_URL}/</loc></url>`,
    ...cats.map((r) => `<url><loc>${c.env.SITE_URL}/danh-muc/${slugify(r.category)}</loc></url>`),
    ...results.map((r) => `<url><loc>${c.env.SITE_URL}/san-pham/${r.slug}</loc><lastmod>${r.u.slice(0, 10)}</lastmod></url>`),
  ]
  return c.body(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`, 200, {
    'Content-Type': 'application/xml',
  })
})

// Ảnh sản phẩm lưu trên R2, cache lâu ở trình duyệt và Cloudflare
pub.get('/img/:key', async (c) => {
  const obj = c.env.IMAGES && (await c.env.IMAGES.get(c.req.param('key')))
  if (!obj) return c.redirect('/no-image.svg', 302)
  return c.body(obj.body as ReadableStream, 200, {
    'Content-Type': obj.httpMetadata?.contentType || 'image/webp',
    'Cache-Control': 'public, max-age=31536000, immutable',
  })
})
