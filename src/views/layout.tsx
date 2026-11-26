import { hidden } from '../lib/flags'
import type { FC, PropsWithChildren } from 'hono/jsx'
import type { Env } from '../lib/types'
import type { SearchHit } from '../lib/search'
import { formatVnd } from '../lib/text'
import {
  IconSnow, IconCar, IconPhone, IconCart, IconSearch, IconBarcode, IconEngine,
  IconMail, IconPin, IconZalo, IconFacebook, IconYoutube,
} from './icons'

type LayoutProps = PropsWithChildren<{
  env: Env
  title: string
  description?: string
  canonical?: string
  jsonLd?: object
  noindex?: boolean
  active?: string
  full?: boolean
}>

export const NAV = [
  { href: '/', label: 'Trang chủ', key: 'home' },
  { href: '/tim-kiem', label: 'Sản phẩm', key: 'products' },
  { href: '/#tim-theo-xe', label: 'Tìm theo xe', key: 'vehicle', hl: true },
  { href: '/kien-thuc', label: 'Kiến thức hữu ích', key: 'knowledge' },
  { href: '/trang/ho-tro', label: 'Hỗ trợ', key: 'support' },
]

export const MAIN_CATEGORIES = ['Lốc điều hoà', 'Dàn nóng', 'Dàn lạnh', 'Quạt dàn nóng', 'Quạt dàn lạnh']

const IconChevronRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
)

const mapUrl = (address: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`

const formatPhone = (p: string) => p.replace(/^(\d{4})(\d{3})(\d+)$/, '$1 $2 $3')

export const Layout: FC<LayoutProps> = ({ env, title, description, canonical, jsonLd, noindex, active, full, children }) => (
  <html lang="vi">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>{title}</title>
      {description && <meta name="description" content={description} />}
      {canonical && <link rel="canonical" href={env.SITE_URL + canonical} />}
      {noindex && <meta name="robots" content="noindex" />}
      <meta property="og:title" content={title} />
      {description && <meta property="og:description" content={description} />}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800&family=Be+Vietnam+Pro:ital,wght@0,400;0,500;0,600;0,700;0,800;1,800&display=swap" />
      <link rel="icon" type="image/svg+xml" href="/logo-mark.svg" />
      <meta property="og:image" content={env.SITE_URL + '/logo.svg'} />
      <link rel="stylesheet" href="/style.css" />
      {/* Bật hiệu ứng hiện dần khi có JS; sau 3 giây hiện hết phòng khi app.js lỗi */}
      <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js');setTimeout(function(){document.documentElement.classList.add('reveal-all')},3000)" }} />
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />}
    </head>
    <body class={[...[...hidden(env)].map((f) => 'hide-' + f), active ? 'page-' + active : ''].join(' ')}>
      <header class="site-header">
        <div class="wrap header-row">
          <div class="header-left">
          <button class="menu-btn" type="button" aria-label="Mở menu" aria-controls="drawer" aria-expanded="false" data-drawer-open>
            <span class="menu-bars" aria-hidden="true"><i></i><i></i><i></i></span>
            <span class="menu-label">Menu</span>
          </button>
          <a href="/" class="brand">
            <img class="brand-logo" src="/logo-mark.svg" alt="DQT" width="94" height="46" />
            <span class="brand-text">
              <span class="brand-name">MAYLANH<em>OTO.VN</em></span>
              <span class="brand-sub">Phụ tùng điều hoà ô tô</span>
            </span>
          </a>
          </div>
          <div class="header-actions">
            <a href="/#tim-theo-xe" class="hdr-search" aria-label="Tìm phụ tùng" data-focus-search><IconSearch size={20} /></a>
            <a href="/#tim-theo-xe" class="pill-link"><IconCar size={16} /> Tra phụ tùng theo Hãng xe / Đời xe</a>
            <a href={`tel:${env.PHONE}`} class="hotline">
              <span class="hotline-icon"><IconPhone size={18} /></span>
              <span><small>Hotline</small><b>{formatPhone(env.PHONE)}</b></span>
            </a>
            <a href="/gio-hang" class="cart-btn"><IconCart size={18} /> <span class="cart-label">Giỏ hàng</span> <span id="cart-count" class="badge">0</span></a>
          </div>
        </div>
        <nav class="main-nav" aria-label="Menu chính">
          <div class="wrap nav-row">
            {NAV.map((n) => (
              <a href={n.href} class={[n.key === active ? 'active' : '', n.hl ? 'hl' : ''].join(' ')}>
                {n.hl && <IconCar size={15} />} {n.label}
              </a>
            ))}
          </div>
        </nav>
      </header>
      {/* Menu trượt từ trái, mở bằng nút ☰ cạnh logo */}
      <div class="drawer-backdrop" data-drawer-close></div>
      <aside id="drawer" class="drawer" aria-label="Menu" aria-hidden="true">
        <div class="drawer-head">
          <a href="/" class="brand">
            <img class="brand-logo" src="/logo-mark.svg" alt="DQT" width="94" height="46" />
            <span class="brand-name">MAYLANH<em>OTO.VN</em></span>
          </a>
          <button class="drawer-close" type="button" aria-label="Đóng menu" data-drawer-close>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        <nav class="drawer-nav">
          {NAV.map((n) => (
            <a href={n.href} class={n.key === active ? 'active' : ''}>
              {n.label} <IconChevronRight />
            </a>
          ))}
        </nav>
        <div class="drawer-sec">
          <h4>Danh mục sản phẩm</h4>
          {[...MAIN_CATEGORIES, 'Phụ kiện khác'].map((c) => (
            <a href={`/tim-kiem?category=${encodeURIComponent(c)}`}>{c} <IconChevronRight /></a>
          ))}
        </div>
        <div class="drawer-contact">
          <a href={`tel:${env.PHONE}`} class="hotline">
            <span class="hotline-icon"><IconPhone size={18} /></span>
            <span><small>Hotline</small><b>{formatPhone(env.PHONE)}</b></span>
          </a>
          <a href={mapUrl(env.ADDRESS)} target="_blank" rel="noopener" class="drawer-addr"><IconPin size={16} /> {env.ADDRESS}</a>
          <a href={`https://zalo.me/${env.ZALO}`} target="_blank" rel="noopener" class="btn-zalo-pill"><IconZalo size={24} /> Tư vấn qua Zalo</a>
        </div>
      </aside>
      <main>{full ? children : <div class="wrap page">{children}</div>}</main>
      <footer class="site-footer">
        <div class="wrap footer-grid">
          <div class="f-brand">
            <a href="/" class="footer-logo"><img src="/logo.svg" alt="DQT – maylanhoto.vn" width="120" height="75" /></a>
            <p>Chuyên lốc lạnh, dàn nóng, dàn lạnh, quạt giải nhiệt và linh kiện điều hoà ô tô chính hãng cho các dòng xe tại Việt Nam.</p>
            <div class="socials">
              <a href="#" aria-label="Facebook"><IconFacebook size={30} /></a>
              <a href="#" aria-label="YouTube"><IconYoutube size={30} /></a>
              <a href={`https://zalo.me/${env.ZALO}`} target="_blank" rel="noopener" aria-label="Zalo"><IconZalo size={30} /></a>
            </div>
          </div>
          {/* Máy tính luôn mở; điện thoại thu gọn, bấm để mở (public/app.js) */}
          <details class="f-group" open>
            <summary>Danh mục sản phẩm</summary>
            <div class="f-links">
              {[...MAIN_CATEGORIES, 'Phụ kiện khác'].map((c) => <a href={`/tim-kiem?category=${encodeURIComponent(c)}`}>{c}</a>)}
            </div>
          </details>
          <details class="f-group" open>
            <summary>Hỗ trợ khách hàng</summary>
            <div class="f-links">
              <a href="/trang/huong-dan-mua-hang">Hướng dẫn mua hàng</a>
              <a href="/trang/chinh-sach-van-chuyen">Chính sách vận chuyển</a>
              <a href="/trang/chinh-sach-bao-hanh">Chính sách bảo hành</a>
              <a href="/trang/chinh-sach-doi-tra">Chính sách đổi trả</a>
              <a href="/trang/chinh-sach-bao-mat">Chính sách bảo mật</a>
              <a href="/trang/dieu-khoan-su-dung">Điều khoản sử dụng</a>
            </div>
          </details>
          <div class="f-contact">
            <h4>Liên hệ</h4>
            <a href={`tel:${env.PHONE}`} class="contact-line"><span class="ci"><IconPhone size={15} /></span><b>{formatPhone(env.PHONE)}</b></a>
            <a href={`https://zalo.me/${env.ZALO}`} class="contact-line" target="_blank" rel="noopener"><span class="ci zalo"><IconZalo size={28} /></span>Chat Zalo</a>
            <a href={`mailto:${env.EMAIL}`} class="contact-line"><span class="ci"><IconMail size={15} /></span>{env.EMAIL}</a>
            <a href={mapUrl(env.ADDRESS)} class="contact-line" target="_blank" rel="noopener"><span class="ci"><IconPin size={15} /></span>{env.ADDRESS}</a>
          </div>
        </div>
        <div class="wrap footer-bottom">
          <span>© {new Date().getFullYear()} MAYLANHOTO.VN – Phụ tùng điều hoà ô tô chính hãng</span>
          <span>Giao hàng toàn quốc • Tra đúng mã theo xe</span>
        </div>
      </footer>
      <a href={`https://zalo.me/${env.ZALO}`} class="zalo-float" target="_blank" rel="noopener" aria-label="Chat Zalo"><IconZalo size={52} /></a>
      <script src="/app.js" defer></script>
    </body>
  </html>
)

export const PRICE_RANGES = [
  { key: '', label: 'Tất cả' },
  { key: 'lt1', label: '< 1 triệu', max: 1_000_000 },
  { key: '1-2', label: '1 - 2 triệu', min: 1_000_000, max: 2_000_000 },
  { key: '2-3.5', label: '2 - 3.5 triệu', min: 2_000_000, max: 3_500_000 },
  { key: 'gt3.5', label: '> 3.5 triệu', min: 3_500_000 },
]
export const priceRange = (key?: string) => PRICE_RANGES.find((r) => r.key === (key || '')) || PRICE_RANGES[0]

// Khung tìm phụ tùng (theo mẫu cửa hàng duyệt): 2 tab tên/mã – số khung, bộ lọc 5 ô, chọn nhanh
export const SearchPanel: FC<{
  makes: string[]
  categories?: string[]
  values?: Record<string, string | undefined>
  quick?: { label: string; href: string }[]
}> = ({ makes, categories = MAIN_CATEGORIES, values = {}, quick = [] }) => {
  const thisYear = new Date().getFullYear()
  const years: number[] = []
  for (let y = thisYear + 1; y >= 1995; y--) years.push(y)
  const vinTab = !!values.vin
  return (
    <div class="search-panel" id="tim-theo-xe">
      <div class="sp-head">
        <div>
          <h2>Tìm phụ tùng theo xe</h2>
          <p>Chọn chiếc xe của bạn để tìm đúng phụ tùng phù hợp</p>
        </div>
      </div>
      {/* Tab số khung tự ẩn khi HIDE có "vin" (lớp sp-vin) */}
      <div class="sp-tabs" role="tablist" aria-label="Cách tìm">
        <button type="button" role="tab" class={vinTab ? 'sp-tab' : 'sp-tab is-active'} aria-selected={vinTab ? 'false' : 'true'} data-sp-tab="q">
          <IconSearch size={15} /> Tên / mã phụ tùng
        </button>
        <button type="button" role="tab" class={vinTab ? 'sp-tab sp-vin is-active' : 'sp-tab sp-vin'} aria-selected={vinTab ? 'true' : 'false'} data-sp-tab="vin">
          <IconBarcode size={15} /> Số khung (VIN)
        </button>
      </div>
      <form action="/tim-kiem" method="get" class="sp-row" data-sp-form="q" hidden={vinTab}>
        <input name="q" type="search" value={values.q || ''} placeholder="Nhập mã tìm xe, phụ tùng...." aria-label="Tìm theo tên hoặc mã" />
        <button class="btn-navy" type="submit"><IconSearch size={16} /> Tìm kiếm</button>
      </form>
      <form action="/tra-vin" method="get" class="sp-row sp-vin" data-sp-form="vin" hidden={!vinTab}>
        <div class="input-icon">
          <IconBarcode size={16} />
          <input name="vin" value={values.vin || ''} placeholder="Nhập số khung 17 ký tự, VD: JTDBT923771234567" aria-label="Số khung" autocomplete="off" maxlength={17} style="text-transform:uppercase" />
        </div>
        <button class="btn-navy" type="submit"><IconCar size={16} /> Tra số khung</button>
      </form>
      <form action="/tim-kiem" method="get" class="sp-filter" id="vehicle-filter">
        <div class="sp-filter-row">
          <label><span>Hãng xe</span>
            <select name="make" id="vf-make">
              <option value="">Chọn hãng</option>
              {makes.map((m) => <option value={m} selected={values.make === m}>{m}</option>)}
            </select>
          </label>
          <label><span>Tên xe</span>
            <select name="model" id="vf-model" data-selected={values.model || ''}><option value="">Chọn tên xe</option></select>
          </label>
          <label><span>Đời xe</span>
            <select name="year">
              <option value="">Chọn đời xe</option>
              {years.map((y) => <option value={String(y)} selected={values.year === String(y)}>{y}</option>)}
            </select>
          </label>
          <label><span>Động cơ</span>
            <select name="engine" id="vf-engine" data-selected={values.engine || ''}><option value="">Chọn động cơ</option></select>
          </label>
          <label><span>Danh mục</span>
            <select name="category">
              <option value="">Chọn danh mục</option>
              {categories.map((cat) => <option value={cat} selected={values.category === cat}>{cat}</option>)}
            </select>
          </label>
          {values.price && <input type="hidden" name="price" value={values.price} />}
          <button class="btn-navy tall" type="submit">Xem phụ tùng</button>
        </div>
      </form>
      {quick.length > 0 && (
        <div class="quick">
          <span>Chọn nhanh:</span>
          {quick.map((q) => <a href={q.href}>{q.label}</a>)}
        </div>
      )}
    </div>
  )
}

const fitLine = (h: SearchHit) => {
  if (!h.fit_make) return null
  const to = h.fit_to ?? new Date().getFullYear()
  return { car: `${h.fit_make} ${h.fit_model}`, years: `(Đời ${h.fit_from} - ${to})` }
}

export const ProductCard: FC<{ h: SearchHit }> = ({ h }) => {
  const fit = fitLine(h)
  const canAdd = h.variants === 1 && h.min_price != null && h.in_stock
  return (
    <div class="pcard">
      <div class="pcard-top">
        <span class="cat-badge">{h.category}</span>
        {h.oem && <span class="oem">OEM-{h.oem}</span>}
      </div>
      <a href={`/san-pham/${h.slug}`} class="pcard-name">{h.name}</a>
      <div class="pcard-fit">
        {fit && <div><IconCar size={14} /> <b>{fit.car}</b> {fit.years}</div>}
        {h.fit_engine && <div class="muted"><IconEngine size={14} /> Động cơ: <b>{h.fit_engine}{/^\d+(\.\d+)?$/.test(h.fit_engine) ? 'L' : ''}{h.fit_fuel && h.fit_fuel !== 'Tất cả' ? ` ${h.fit_fuel}` : ''}</b></div>}
        {h.variants > 1 && <div class="variants">{h.variants} loại để chọn</div>}
      </div>
      <div class="pcard-foot">
        <span class="price">{h.variants > 1 && h.min_price != null ? <small>Từ </small> : ''}{h.min_price != null ? formatVnd(h.min_price).replace(' đ', 'đ') : 'Liên hệ'}</span>
        {/* Nút giỏ hàng cạnh giá: 1 loại có giá thì thêm thẳng vào giỏ; nhiều loại hoặc chưa có giá thì mở trang sản phẩm để chọn */}
        {canAdd ? (
          <button type="button" class="btn-cart" data-cart={String(h.first_id)} data-name={h.name} data-price={String(h.min_price)} aria-label={`Thêm ${h.name} vào giỏ`} title="Thêm vào giỏ"><IconCart size={18} /></button>
        ) : (
          <a class="btn-cart" href={`/san-pham/${h.slug}`} aria-label={h.in_stock ? (h.min_price == null ? 'Liên hệ báo giá' : 'Chọn loại') : 'Hết hàng'} title={h.in_stock ? (h.min_price == null ? 'Liên hệ báo giá' : 'Chọn loại để thêm vào giỏ') : 'Hết hàng'}><IconCart size={18} /></a>
        )}
      </div>
    </div>
  )
}

// Đầu trang con: đường dẫn (breadcrumb) + tiêu đề + mô tả ngắn
export const PageHead: FC<{ crumbs: [string, string?][]; title?: string; sub?: string }> = ({ crumbs, title, sub }) => (
  <div class="page-head">
    <nav class="crumbs" aria-label="Đường dẫn">
      {crumbs.map(([t, href], i) => (
        <>
          {i > 0 && <span class="crumb-sep">›</span>}
          {href ? <a href={href}>{t}</a> : <span aria-current="page">{t}</span>}
        </>
      ))}
    </nav>
    {title && <h1 class="ph-title">{title}</h1>}
    {sub && <p class="ph-sub">{sub}</p>}
  </div>
)

export const ProductGrid: FC<{ hits: SearchHit[] }> = ({ hits }) => (
  <div class="pgrid">{hits.map((h) => <ProductCard h={h} />)}</div>
)

// Dải sản phẩm trượt: mỗi trang 4 sản phẩm (máy tính 4 cột, điện thoại 2x2), nút ‹ ›, chấm, vuốt tay; không tự chạy (public/app.js)
export const ProductSlider: FC<{ hits: SearchHit[]; perPage?: number; moreHref?: string; moreLabel?: string }> = ({ hits, perPage = 4, moreHref, moreLabel }) => {
  const pages: SearchHit[][] = []
  for (let i = 0; i < hits.length; i += perPage) pages.push(hits.slice(i, i + perPage))
  return (
    <div class="pslider" data-pslider aria-roledescription="carousel" aria-label="Danh sách phụ tùng">
      <div class="pslider-track">
        {pages.map((p, i) => (
          <div class="pslider-page" role="group" aria-roledescription="slide" aria-label={`Trang ${i + 1} / ${pages.length}`}>
            <ProductGrid hits={p} />
          </div>
        ))}
      </div>
      <div class="pslider-nav">
        {pages.length > 1 ? (
          <div class="pslider-ctrl">
            <button type="button" class="pslider-btn prev" data-ps-prev aria-label="Sản phẩm trước"><IconChevronRight /></button>
            <div class="pslider-dots">
              {pages.map((_, i) => (
                <button type="button" class={i === 0 ? 'pslider-dot is-active' : 'pslider-dot'} data-ps-dot={String(i)} aria-label={`Trang ${i + 1}`}></button>
              ))}
            </div>
            <button type="button" class="pslider-btn" data-ps-next aria-label="Sản phẩm sau"><IconChevronRight /></button>
          </div>
        ) : <span />}
        {moreHref && <a href={moreHref} class="more blue">{moreLabel || 'Xem tất cả'} <IconChevronRight /></a>}
      </div>
    </div>
  )
}

// Giữ tên cũ cho các trang đang dùng
export const VehicleFilter: FC<{ makes: string[]; categories?: string[]; values?: Record<string, string | undefined> }> = ({ makes, values }) => (
  <SearchPanel makes={makes} values={values} />
)
