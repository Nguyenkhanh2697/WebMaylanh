-- Làm lại chỉ mục tìm kiếm (giống nút trong trang quản trị). Chạy sau khi nạp dữ liệu.
DELETE FROM products_fts;
INSERT INTO products_fts (rowid, sku, name, codes, brand, vehicles)
SELECT p.id, p.sku, p.name,
       COALESCE(p.oem_codes, '') || ' ' || COALESCE(p.equiv_codes, '') || ' ' ||
         upper(replace(replace(replace(COALESCE(p.sku,'') || ' ' || COALESCE(p.oem_codes, '') || ' ' || COALESCE(p.equiv_codes, ''), '-', ''), '.', ''), '/', '')),
       COALESCE(p.brand, '') || ' ' || COALESCE(p.origin, ''),
       COALESCE((SELECT group_concat(DISTINCT f.make || ' ' || f.model) FROM fitments f
                 WHERE f.group_key = COALESCE(p.vehicle_group, p.sku)), '')
FROM products p;
