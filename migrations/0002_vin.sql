-- Dữ liệu tra số khung, theo cấu trúc file "Số khung.xlsx" của cửa hàng (Phụ lục 04)
-- Bảng vin_patterns ở 0001 thay bằng 3 bảng dưới đây.
DROP TABLE IF EXISTS vin_patterns;

-- Sheet WMI_Data: 3 ký tự đầu = hãng xe + nước sản xuất
CREATE TABLE vin_wmi (
  code    TEXT PRIMARY KEY,
  make    TEXT NOT NULL,
  country TEXT
);

-- Sheet VDS_Data: ký tự 4–9 = dòng xe, động cơ. Ký tự thứ 9 không dùng để phân biệt thì ghi dấu * (5 ký tự + *)
CREATE TABLE vin_vds (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  wmi        TEXT NOT NULL,
  vds        TEXT NOT NULL,
  model      TEXT NOT NULL,
  engine     TEXT,
  -- Mã nhóm xe của từng loại phụ tùng (cửa hàng điền sau): Lốc, Dàn nóng, Dàn lạnh, Quạt dàn nóng, Quạt dàn lạnh, Van tiết lưu, Van áp suất
  parts      TEXT NOT NULL DEFAULT '{}',
  UNIQUE (wmi, vds)
);

-- Sheet OLD_VIN_Data: số khung ít hơn 17 ký tự, tra theo phần đầu khớp dài nhất
CREATE TABLE vin_old (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  prefix   TEXT NOT NULL UNIQUE,
  make     TEXT NOT NULL,
  model    TEXT NOT NULL,
  engine   TEXT,
  year     INTEGER,
  country  TEXT,
  parts    TEXT NOT NULL DEFAULT '{}'
);

-- Bài viết: thêm ảnh bìa, nhãn, mô tả ngắn cho mục "Kiến thức hữu ích"
ALTER TABLE posts ADD COLUMN tag TEXT;
ALTER TABLE posts ADD COLUMN excerpt TEXT;
ALTER TABLE posts ADD COLUMN cover TEXT;
