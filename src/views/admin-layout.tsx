// Khung trang quản trị: menu trái (điện thoại: bấm ☰ để mở), thanh trên có tên trang, nút xem web, tài khoản.
// Trang đăng nhập / tạo tài khoản dùng bản "bare": thẻ giữa màn hình, không có menu.
import type { FC, PropsWithChildren } from 'hono/jsx'
import type { AppEnv } from '../lib/types'
import {
  IconDashboard, IconReceipt, IconChat, IconBox, IconSort, IconUpload, IconImage, IconLogout, IconExternal, IconMenu,
} from './icons'

export type AdminActive = 'home' | 'orders' | 'quotes' | 'products' | 'sort' | 'import' | 'images'

const NAV: { key: AdminActive; href: string; label: string; icon: FC<{ size?: number }>; badge?: 'orders' | 'quotes'; group?: string }[] = [
  { key: 'home', href: '/admin', label: 'Tổng quan', icon: IconDashboard },
  { key: 'orders', href: '/admin/don-hang', label: 'Đơn hàng', icon: IconReceipt, badge: 'orders', group: 'Bán hàng' },
  { key: 'quotes', href: '/admin/bao-gia', label: 'Yêu cầu báo giá', icon: IconChat, badge: 'quotes' },
  { key: 'products', href: '/admin/san-pham', label: 'Sản phẩm', icon: IconBox, group: 'Hàng hoá' },
  { key: 'sort', href: '/admin/sap-xep', label: 'Sắp xếp trang chủ', icon: IconSort },
  { key: 'import', href: '/admin/nhap-excel', label: 'Nhập Excel', icon: IconUpload },
  { key: 'images', href: '/admin/anh', label: 'Tải ảnh', icon: IconImage },
]

type Props = PropsWithChildren<{
  title: string
  sub?: string
  active?: AdminActive
  v?: AppEnv['Variables']
  bare?: boolean
  actions?: any
}>

export const AdminLayout: FC<Props> = ({ title, sub, active, v, bare, actions, children }) => (
  <html lang="vi">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="robots" content="noindex" />
      <title>{title} – Quản trị DQT</title>
      <link rel="icon" href="/logo-mark.svg" />
      <link rel="stylesheet" href="/style.css" />
      <script src="/forms.js" defer></script>
    </head>
    {bare ? (
      <body class="admin ad-bare">
        <main class="ad-auth">
          <a href="/" class="ad-auth-logo"><img src="/logo.svg" alt="maylanhoto.vn" height="56" /></a>
          <div class="ad-auth-card">
            <h1>{title}</h1>
            {sub && <p class="ad-muted">{sub}</p>}
            {children}
          </div>
          <p class="ad-auth-foot">Trang quản trị maylanhoto.vn</p>
        </main>
      </body>
    ) : (
      <body class="admin ad">
        <input type="checkbox" id="ad-nav" class="ad-nav-toggle" aria-hidden="true" />
        <aside class="ad-side" aria-label="Menu quản trị">
          <a href="/admin" class="ad-brand">
            <img src="/logo-mark.svg" alt="DQT" width="52" height="28" />
            <span><b>Quản trị</b><small>maylanhoto.vn</small></span>
          </a>
          <nav class="ad-menu">
            {NAV.map((n) => (
              <>
                {n.group && <div class="ad-menu-group">{n.group}</div>}
                <a href={n.href} class={active === n.key ? 'on' : undefined} aria-current={active === n.key ? 'page' : undefined}>
                  <n.icon size={19} />
                  <span>{n.label}</span>
                  {n.badge && v?.badges && v.badges[n.badge] > 0 && <em class="ad-badge" title="Chưa xử lý">{v.badges[n.badge]}</em>}
                </a>
              </>
            ))}
          </nav>
          <div class="ad-side-foot">
            <a href="/" target="_blank" rel="noopener"><IconExternal size={17} /> Xem website</a>
            <a href="/admin/dang-xuat"><IconLogout size={17} /> Đăng xuất</a>
          </div>
        </aside>
        <label for="ad-nav" class="ad-scrim" aria-hidden="true"></label>
        <div class="ad-main">
          <header class="ad-top">
            <label for="ad-nav" class="ad-burger" aria-label="Mở menu"><IconMenu size={22} /></label>
            <div class="ad-top-title">
              <h1>{title}</h1>
              {sub && <p>{sub}</p>}
            </div>
            <div class="ad-top-right">
              {actions}
              <a href="/" target="_blank" rel="noopener" class="ad-top-link"><IconExternal size={16} /><span>Xem website</span></a>
              {v?.admin && (
                <span class="ad-user" title={`Đang đăng nhập: ${v.admin}`}>
                  <i>{v.admin.slice(0, 1).toUpperCase()}</i>
                  <span><small>Xin chào,</small><b>{v.admin}</b></span>
                </span>
              )}
            </div>
          </header>
          <main class="ad-body">{children}</main>
        </div>
      </body>
    )}
  </html>
)
