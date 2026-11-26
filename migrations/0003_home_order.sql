-- Thứ tự hiển thị sản phẩm trên trang chủ do cửa hàng tự sắp (trang quản trị > Sắp xếp trang chủ).
-- Số nhỏ hiện trước; để trống thì xếp sau các sản phẩm đã đánh số. Mỗi trang trên trang chủ có 4 sản phẩm.
ALTER TABLE products ADD COLUMN home_order INTEGER;
CREATE INDEX IF NOT EXISTS idx_products_home_order ON products(home_order);
