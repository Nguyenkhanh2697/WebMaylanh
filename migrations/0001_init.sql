-- Cấu trúc dữ liệu khớp với file Excel mẫu (sheet "Sản phẩm" và "Xe phù hợp")

-- Mỗi dòng sheet "Sản phẩm" = 1 sản phẩm (1 hãng / 1 xuất xứ / 1 điện áp).
-- Các dòng cùng tên sản phẩm => cùng slug => web gộp thành 1 trang có nút chọn loại.
CREATE TABLE products (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  sku           TEXT NOT NULL UNIQUE,          -- Mã sản phẩm (mã nội bộ)
  name          TEXT NOT NULL,                 -- Tên sản phẩm (tên chung để gộp trang)
  slug          TEXT NOT NULL,                 -- tạo từ tên, dùng cho URL /san-pham/:slug
  category      TEXT NOT NULL,                 -- Danh mục
  vehicle_group TEXT,                          -- Mã nhóm xe (trống = dùng sku)
  brand         TEXT,                          -- Thương hiệu
  origin        TEXT,                          -- Xuất xứ
  voltage       TEXT,                          -- Điện áp (12V / 24V)
  oem_codes     TEXT,                          -- Mã OEM, nhiều mã cách nhau ;
  equiv_codes   TEXT,                          -- Mã tương đương, cách nhau ;
  price         INTEGER,                       -- Giá bán (đ), NULL = "Liên hệ"
  status        TEXT NOT NULL DEFAULT 'Còn hàng',
  images        TEXT NOT NULL DEFAULT '[]',    -- JSON mảng key ảnh trên R2, ảnh đầu = ảnh chính
  description   TEXT,
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_group ON products(vehicle_group);

-- Mỗi dòng sheet "Xe phù hợp" (ô "Vios; Yaris" được tách thành nhiều dòng khi nhập).
-- group_key = Mã nhóm xe hoặc Mã sản phẩm.
CREATE TABLE fitments (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  group_key  TEXT NOT NULL,
  make       TEXT NOT NULL,                   -- Hãng xe
  model      TEXT NOT NULL,                   -- Dòng xe
  year_from  INTEGER NOT NULL,
  year_to    INTEGER,                         -- NULL = đến nay
  fuel       TEXT,                            -- NULL/'Tất cả' = mọi nhiên liệu
  engine     TEXT,                            -- "2.4; 2.8", NULL = mọi dung tích
  note       TEXT
);
CREATE INDEX idx_fit_group ON fitments(group_key);
CREATE INDEX idx_fit_vehicle ON fitments(make, model, year_from, year_to);

-- Chừa sẵn chỗ lưu mã khung (VIN) theo xe, bật tìm theo số khung sau này.
CREATE TABLE vin_patterns (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  prefix    TEXT NOT NULL,                    -- ví dụ KMHCT41BACC
  make      TEXT NOT NULL,
  model     TEXT NOT NULL,
  year_from INTEGER,
  year_to   INTEGER
);
CREATE INDEX idx_vin_prefix ON vin_patterns(prefix);

-- Tìm kiếm toàn văn, bỏ dấu tiếng Việt: "dan nong accent" khớp "Dàn nóng Accent".
CREATE VIRTUAL TABLE products_fts USING fts5(
  sku, name, codes, brand, vehicles,
  tokenize = "unicode61 remove_diacritics 2"
);

CREATE TABLE orders (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  code          TEXT NOT NULL UNIQUE,          -- mã đơn, dùng làm nội dung chuyển khoản
  customer_name TEXT NOT NULL,
  phone         TEXT NOT NULL,
  address       TEXT,
  note          TEXT,
  total         INTEGER NOT NULL,
  status        TEXT NOT NULL DEFAULT 'Chờ thanh toán', -- Chờ thanh toán / Đã thanh toán / Đã giao / Huỷ
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE order_items (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id   INTEGER NOT NULL REFERENCES orders(id),
  product_id INTEGER NOT NULL,
  sku        TEXT NOT NULL,
  name       TEXT NOT NULL,
  variant    TEXT,
  price      INTEGER NOT NULL,
  qty        INTEGER NOT NULL
);
CREATE INDEX idx_items_order ON order_items(order_id);

CREATE TABLE quote_requests (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  phone       TEXT NOT NULL,
  vehicle     TEXT,
  message     TEXT,
  product_sku TEXT,
  handled     INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Chuyển hướng 301 link web cũ sang web mới (giữ thứ hạng Google)
CREATE TABLE redirects (
  old_path TEXT PRIMARY KEY,
  new_path TEXT NOT NULL,
  code     INTEGER NOT NULL DEFAULT 301
);

CREATE TABLE posts (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  slug       TEXT NOT NULL UNIQUE,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  published  INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE admins (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  username  TEXT NOT NULL UNIQUE,
  pass_hash TEXT NOT NULL,
  salt      TEXT NOT NULL
);
