// Trang Tổng quan của quản trị: số liệu hôm nay, tình trạng hàng, dữ liệu sản phẩm, biểu đồ 7 ngày, yêu cầu mới nhất.
// Ngày tính theo giờ Việt Nam (+7); cơ sở dữ liệu lưu giờ UTC.
import type { FC } from 'hono/jsx'
import type { Env } from '../lib/types'
import { formatVnd } from '../lib/text'
import {
  IconCart, IconChat, IconClock, IconMoney, IconBox, IconChart, IconDatabase, IconRocket, IconPhone, IconArrow, IconCheck,
} from './icons'

const VN = "'+7 hours'"
const TODAY = `date('now', ${VN})`
const WEEK_START = `date('now', ${VN}, '-6 days')`
const day = (col: string) => `date(${col}, ${VN})`

type Recent = { kind: 'order' | 'quote'; ref: string; name: string; phone: string; total: number | null; open: number; created_at: string }
export type DashData = {
  t: {
    o_today: number; q_today: number; v_today: number
    o_week: number; q_week: number; v_week: number
    o_wait: number; q_wait: number; done_week: number
  }
  p: { sku_n: number; page_n: number; cat_n: number; in_stock: number; out: number; no_price: number; no_img: number; ordered: number }
  noFit: number
  vin: number
  days: { d: string; label: string; o: number; q: number }[]
  recent: Recent[]
}

export async function loadDashboard(env: Env): Promise<DashData> {
  const db = env.DB
  const [t, p, nf, vin, od, qd, recent] = await db.batch([
    db.prepare(`SELECT
      (SELECT COUNT(*) FROM orders WHERE ${day('created_at')} = ${TODAY}) AS o_today,
      (SELECT COUNT(*) FROM quote_requests WHERE ${day('created_at')} = ${TODAY}) AS q_today,
      (SELECT COALESCE(SUM(total), 0) FROM orders WHERE ${day('created_at')} = ${TODAY} AND status != 'Huỷ') AS v_today,
      (SELECT COUNT(*) FROM orders WHERE ${day('created_at')} >= ${WEEK_START}) AS o_week,
      (SELECT COUNT(*) FROM quote_requests WHERE ${day('created_at')} >= ${WEEK_START}) AS q_week,
      (SELECT COALESCE(SUM(total), 0) FROM orders WHERE ${day('created_at')} >= ${WEEK_START} AND status != 'Huỷ') AS v_week,
      (SELECT COUNT(*) FROM orders WHERE status = 'Chờ thanh toán') AS o_wait,
      (SELECT COUNT(*) FROM quote_requests WHERE handled = 0) AS q_wait,
      (SELECT COUNT(*) FROM orders WHERE ${day('created_at')} >= ${WEEK_START} AND status IN ('Đã thanh toán', 'Đã giao'))
        + (SELECT COUNT(*) FROM quote_requests WHERE ${day('created_at')} >= ${WEEK_START} AND handled = 1) AS done_week`),
    db.prepare(`SELECT COUNT(*) AS sku_n, COUNT(DISTINCT slug) AS page_n, COUNT(DISTINCT category) AS cat_n,
      COALESCE(SUM(status != 'Hết hàng'), 0) AS in_stock, COALESCE(SUM(status = 'Hết hàng'), 0) AS out,
      COALESCE(SUM(price IS NULL), 0) AS no_price, COALESCE(SUM(images = '[]' OR images = ''), 0) AS no_img,
      COUNT(DISTINCT CASE WHEN home_order IS NOT NULL THEN slug END) AS ordered FROM products`),
    db.prepare('SELECT COUNT(*) AS n FROM products p WHERE NOT EXISTS (SELECT 1 FROM fitments f WHERE f.group_key = COALESCE(p.vehicle_group, p.sku))'),
    db.prepare('SELECT (SELECT COUNT(*) FROM vin_vds) + (SELECT COUNT(*) FROM vin_old) AS n'),
    db.prepare(`SELECT ${day('created_at')} AS d, COUNT(*) AS n FROM orders WHERE ${day('created_at')} >= ${WEEK_START} GROUP BY d`),
    db.prepare(`SELECT ${day('created_at')} AS d, COUNT(*) AS n FROM quote_requests WHERE ${day('created_at')} >= ${WEEK_START} GROUP BY d`),
    db.prepare(`SELECT * FROM (
      SELECT 'order' AS kind, code AS ref, customer_name AS name, phone, total, (status = 'Chờ thanh toán') AS open, created_at FROM orders
      UNION ALL
      SELECT 'quote', CAST(id AS TEXT), name, phone, NULL, (handled = 0), created_at FROM quote_requests
    ) ORDER BY created_at DESC LIMIT 6`),
  ])
  const first = <T,>(r: D1Result) => r.results[0] as T
  const byDay = (r: D1Result) => new Map((r.results as { d: string; n: number }[]).map((x) => [x.d, x.n]))
  const om = byDay(od), qm = byDay(qd)
  // 7 ngày gần nhất theo giờ Việt Nam, cũ → mới
  const WD = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
  const now = Date.now() + 7 * 3600e3
  const days = Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(now - (6 - i) * 86400e3)
    const d = dt.toISOString().slice(0, 10)
    return { d, label: i === 6 ? 'Hôm nay' : `${WD[dt.getUTCDay()]} ${d.slice(8, 10)}/${d.slice(5, 7)}`, o: om.get(d) || 0, q: qm.get(d) || 0 }
  })
  return {
    t: first(t),
    p: first(p),
    noFit: first<{ n: number }>(nf).n,
    vin: first<{ n: number }>(vin).n,
    days,
    recent: recent.results as Recent[],
  }
}

const n0 = (n: number) => n.toLocaleString('vi-VN')
const ago = (t: string) => {
  const ms = Date.now() - +new Date(t.replace(' ', 'T') + 'Z')
  if (isNaN(ms)) return t
  const m = Math.round(ms / 60000)
  if (m < 1) return 'vừa xong'
  if (m < 60) return `${m} phút trước`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} giờ trước`
  return `${Math.round(h / 24)} ngày trước`
}

// Ô số liệu lớn đầu trang
const Kpi: FC<{ tone: string; icon: any; label: string; value: string; sub: string; href?: string }> = ({ tone, icon, label, value, sub, href }) => {
  const body = (
    <>
      <span class="ad-kpi-ico">{icon}</span>
      <span class="ad-kpi-txt"><small>{label}</small><b>{value}</b><em>{sub}</em></span>
    </>
  )
  return href ? <a href={href} class={'ad-kpi ' + tone}>{body}</a> : <div class={'ad-kpi ' + tone}>{body}</div>
}

// Dòng trong khung thông tin: nhãn — số (bấm được nếu có link)
const Row: FC<{ label: string; value: string | number; href?: string; warn?: boolean; hint?: string }> = ({ label, value, href, warn, hint }) => (
  <li class={warn ? 'is-warn' : undefined}>
    <span>{label}{hint && <small>{hint}</small>}</span>
    {href ? <a href={href}>{value}</a> : <b>{value}</b>}
  </li>
)

// Biểu đồ cột nhóm 7 ngày: giỏ hàng (xanh) + báo giá (cam); số tổng trên mỗi ngày, rê chuột xem chi tiết
const Chart: FC<{ days: DashData['days'] }> = ({ days }) => {
  const max = Math.max(1, ...days.map((d) => Math.max(d.o, d.q)))
  const step = max <= 4 ? 1 : Math.ceil(max / 4)
  const top = step * Math.ceil(max / step)
  const ticks = Array.from({ length: Math.floor(top / step) + 1 }, (_, i) => i * step)
  const empty = days.every((d) => !d.o && !d.q)
  return (
    <div class="ad-chart">
      <div class="ad-legend">
        <span><i class="s1"></i>Từ giỏ hàng</span>
        <span><i class="s2"></i>Yêu cầu báo giá</span>
      </div>
      <div class="ad-plot" role="img" aria-label="Số yêu cầu mỗi ngày trong 7 ngày qua">
        <div class="ad-yaxis" aria-hidden="true">
          {ticks.map((t) => <span style={`bottom:${(t / top) * 100}%`}>{t}</span>)}
        </div>
        <div class="ad-grid" aria-hidden="true">
          {ticks.map((t) => <i style={`bottom:${(t / top) * 100}%`}></i>)}
        </div>
        <div class="ad-cols">
          {days.map((d) => (
            <div class="ad-col" tabindex={0} data-tip={`${d.label}: ${d.o} từ giỏ hàng · ${d.q} báo giá`}>
              <span class="ad-col-total" style={`bottom:calc(${(Math.max(d.o, d.q) / top) * 100}% + 4px)`}>{d.o + d.q > 0 ? d.o + d.q : ''}</span>
              <span class="ad-bar s1" style={`height:${(d.o / top) * 100}%`}></span>
              <span class="ad-bar s2" style={`height:${(d.q / top) * 100}%`}></span>
            </div>
          ))}
        </div>
        {empty && <div class="ad-plot-empty">Chưa có yêu cầu nào trong 7 ngày qua</div>}
      </div>
      <div class="ad-xaxis" aria-hidden="true">{days.map((d) => <span>{d.label}</span>)}</div>
      <table class="sr-only">
        <caption>Số yêu cầu 7 ngày qua</caption>
        <thead><tr><th>Ngày</th><th>Từ giỏ hàng</th><th>Báo giá</th></tr></thead>
        <tbody>{days.map((d) => <tr><td>{d.label}</td><td>{d.o}</td><td>{d.q}</td></tr>)}</tbody>
      </table>
    </div>
  )
}

export const Dashboard: FC<{ d: DashData; quoteMode: boolean }> = ({ d, quoteMode }) => {
  const { t, p } = d
  const wait = t.o_wait + t.q_wait
  const reqToday = t.o_today + t.q_today
  const reqWeek = t.o_week + t.q_week
  const steps = [
    { done: p.sku_n > 0, label: 'Nhập sản phẩm bằng file Excel mẫu', href: '/admin/nhap-excel' },
    { done: p.no_img === 0 && p.sku_n > 0, label: 'Tải ảnh cho sản phẩm', href: '/admin/anh' },
    { done: d.noFit === 0 && p.sku_n > 0, label: 'Gắn xe phù hợp cho mọi sản phẩm', href: '/admin/san-pham?loc=chua-xe' },
    { done: p.ordered > 0, label: 'Chọn sản phẩm nổi bật cho trang chủ', href: '/admin/sap-xep' },
  ]
  const doneN = steps.filter((s) => s.done).length
  return (
    <div class="ad-dash">
      <section class="ad-kpis" aria-label="Số liệu hôm nay">
        <Kpi tone="k1" icon={<IconCart size={26} />} label="Yêu cầu hôm nay" value={n0(reqToday)}
          sub={`Giỏ hàng ${t.o_today} · Báo giá ${t.q_today}`} />
        <Kpi tone="k2" icon={<IconMoney size={26} />} label={quoteMode ? 'Giá trị giỏ hàng hôm nay' : 'Doanh thu đơn hôm nay'} value={formatVnd(t.v_today)}
          sub={`7 ngày: ${formatVnd(t.v_week)}`} />
        <Kpi tone={wait ? 'k3' : 'k3 is-zero'} icon={<IconClock size={26} />} label="Đang chờ gọi lại" value={n0(wait)}
          sub={wait ? 'Bấm để xử lý ngay →' : 'Đã xử lý hết, tốt lắm!'} href={t.o_wait ? '/admin/don-hang?tt=' + encodeURIComponent('Chờ thanh toán') : '/admin/bao-gia'} />
        <Kpi tone="k4" icon={<IconBox size={26} />} label="Sản phẩm trên web" value={n0(p.page_n)}
          sub={`${n0(p.sku_n)} mã · ${p.cat_n} danh mục`} href="/admin/san-pham" />
      </section>

      <section class="ad-panels">
        <div class="ad-panel">
          <h2><IconChart size={18} /> Hoạt động 7 ngày</h2>
          <ul class="ad-rows">
            <Row label="Yêu cầu từ giỏ hàng" value={n0(t.o_week)} href="/admin/don-hang" />
            <Row label="Yêu cầu báo giá" value={n0(t.q_week)} href="/admin/bao-gia" />
            <Row label="Tổng giá trị giỏ hàng" value={formatVnd(t.v_week)} />
            <Row label="Trung bình mỗi giỏ hàng" value={t.o_week ? formatVnd(Math.round(t.v_week / t.o_week)) : '—'} />
            <Row label="Đã xử lý xong" value={`${n0(t.done_week)} / ${n0(reqWeek)}`} />
          </ul>
        </div>
        <div class="ad-panel">
          <h2><IconBox size={18} /> Tình trạng hàng</h2>
          <ul class="ad-rows">
            <Row label="Còn hàng" value={n0(p.in_stock)} href="/admin/san-pham" />
            <Row label="Hết hàng" value={n0(p.out)} href="/admin/san-pham?loc=het-hang" warn={p.out > 0} />
            <Row label='Giá "Liên hệ"' hint="khách không đặt online được" value={n0(p.no_price)} href="/admin/san-pham?loc=lien-he" warn={p.no_price > 0} />
            <Row label="Chưa có ảnh" value={n0(p.no_img)} href="/admin/san-pham?loc=chua-anh" warn={p.no_img > 0} />
          </ul>
        </div>
        <div class="ad-panel">
          <h2><IconDatabase size={18} /> Dữ liệu tra cứu</h2>
          <ul class="ad-rows">
            <Row label="Trang sản phẩm / mã" value={`${n0(p.page_n)} / ${n0(p.sku_n)}`} />
            <Row label="Chưa gắn xe phù hợp" hint="khách tìm theo xe sẽ không thấy" value={n0(d.noFit)} href="/admin/san-pham?loc=chua-xe" warn={d.noFit > 0} />
            <Row label="Mẫu số khung đã nạp" value={n0(d.vin)} />
            <Row label="Sản phẩm nổi bật trang chủ" value={n0(p.ordered)} href="/admin/sap-xep" />
          </ul>
        </div>
      </section>

      <section class="ad-panels ad-panels-b">
        <div class="ad-panel ad-panel-chart">
          <h2><IconChart size={18} /> Yêu cầu 7 ngày qua</h2>
          <Chart days={d.days} />
        </div>
        <div class="ad-panel">
          <h2><IconChat size={18} /> Yêu cầu mới nhất</h2>
          {!d.recent.length ? (
            <div class="ad-empty sm"><b>Chưa có yêu cầu nào.</b><span>Khách gửi từ giỏ hàng hoặc trang báo giá sẽ hiện ở đây.</span></div>
          ) : (
            <ul class="ad-feed">
              {d.recent.map((r) => (
                <li>
                  <span class={'ad-feed-ico ' + r.kind}>{r.kind === 'order' ? <IconCart size={16} /> : <IconChat size={16} />}</span>
                  <span class="ad-feed-txt">
                    <b>{r.name}</b>
                    <small>{r.kind === 'order' ? `Giỏ hàng ${r.ref} · ${formatVnd(r.total)}` : 'Yêu cầu báo giá'} · {ago(r.created_at)}</small>
                  </span>
                  {r.open ? <a href={`tel:${r.phone}`} class="ad-call" title={`Gọi ${r.phone}`}><IconPhone size={15} /> Gọi</a> : <span class="ad-pill good">Xong</span>}
                </li>
              ))}
            </ul>
          )}
          <div class="ad-panel-foot"><a href="/admin/don-hang">Xem đơn hàng <IconArrow size={14} /></a><a href="/admin/bao-gia">Xem báo giá <IconArrow size={14} /></a></div>
        </div>
        <div class="ad-panel">
          <h2><IconRocket size={18} /> Chuẩn bị dữ liệu <span class="ad-pill good">{doneN}/{steps.length}</span></h2>
          <div class="ad-progress" aria-hidden="true"><i style={`width:${(doneN / steps.length) * 100}%`}></i></div>
          <ul class="ad-steps">
            {steps.map((s) => (
              <li class={s.done ? 'done' : undefined}>
                <span class="ad-step-dot">{s.done ? <IconCheck size={14} /> : ''}</span>
                <a href={s.href}>{s.label}</a>
              </li>
            ))}
          </ul>
          <p class="ad-note">Thống kê lượt truy cập (Google Analytics) sẽ được gắn khi web chạy chính thức.</p>
        </div>
      </section>
    </div>
  )
}
