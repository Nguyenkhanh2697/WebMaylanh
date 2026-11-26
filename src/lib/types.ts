export type Env = {
  DB: D1Database
  // Chưa có khi tài khoản Cloudflare chưa bật R2 (xem r2_buckets trong wrangler.jsonc)
  IMAGES?: R2Bucket
  ASSETS: Fetcher
  SITE_NAME: string
  SITE_URL: string
  PHONE: string
  ZALO: string
  EMAIL: string
  ADDRESS: string
  BANK_ID: string
  BANK_ACCOUNT: string
  BANK_ACCOUNT_NAME: string
  SESSION_SECRET: string
  // Ẩn tạm chức năng chưa tới hạn trên link chạy thử: cart,vin,quote,admin (để trống = hiện hết)
  HIDE?: string
  // Giỏ hàng: 'quote' = gửi yêu cầu báo giá (không thanh toán trên web), 'pay' = đặt hàng + COD/QR. Mặc định 'quote'
  CHECKOUT_MODE?: string
}

export type AppEnv = { Bindings: Env; Variables: { admin?: string } }

export type Product = {
  id: number
  sku: string
  name: string
  slug: string
  category: string
  vehicle_group: string | null
  brand: string | null
  origin: string | null
  voltage: string | null
  oem_codes: string | null
  equiv_codes: string | null
  price: number | null
  status: string
  images: string
  description: string | null
}

export type Fitment = {
  group_key: string
  make: string
  model: string
  year_from: number
  year_to: number | null
  fuel: string | null
  engine: string | null
  note: string | null
}
