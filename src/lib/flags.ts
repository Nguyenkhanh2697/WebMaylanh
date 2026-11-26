import type { Env } from './types'

// Chức năng tạm ẩn trên link chạy thử, theo tiến độ trong tab Kế hoạch
export type Feature = 'search' | 'catalog' | 'posts' | 'pages' | 'cart' | 'vin' | 'quote' | 'admin'
export const hidden = (env: Env): Set<string> =>
  new Set((env.HIDE || '').split(',').map((s) => s.trim()).filter(Boolean))

const BLOCKED: Record<Feature, RegExp> = {
  search: /^\/tim-kiem(\/|$)|^\/api\/search/,
  catalog: /^\/(danh-muc|san-pham)\//,
  posts: /^\/(kien-thuc|tin-tuc|bai-viet)(\/|$)/,
  pages: /^\/trang\//,
  cart: /^\/(gio-hang|don-hang)(\/|$)|^\/api\/orders/,
  vin: /^\/tra-vin|^\/api\/vin/,
  quote: /^\/yeu-cau-bao-gia|^\/api\/quote/,
  admin: /^\/admin/,
}

// Ngày gửi cửa hàng xem theo tab Kế hoạch, hiện trên trang "đang hoàn thiện"
export const OPEN_DATE: Record<Feature, string> = {
  search: '04/12',
  catalog: '04/12',
  posts: '04/12',
  pages: '04/12',
  cart: '11/12',
  vin: '17/12',
  quote: '04/12',
  admin: '04/12',
}

export const blockedFeature = (env: Env, path: string): Feature | undefined => {
  const h = hidden(env)
  return (Object.keys(BLOCKED) as Feature[]).find((f) => h.has(f) && BLOCKED[f].test(path))
}
