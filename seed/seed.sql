-- Dữ liệu mẫu lấy từ các dòng ví dụ trong file Excel mẫu, chỉ để chạy thử local
INSERT INTO products (sku,name,slug,category,vehicle_group,brand,origin,voltage,oem_codes,equiv_codes,price,status,images,description) VALUES
('DL T Innova 08 trước DS','Dàn lạnh Toyota Innova dàn trước','dan-lanh-toyota-innova-dan-truoc','Dàn lạnh','DL T Innova 08 trước','Denso','Nhật Bản',NULL,NULL,NULL,1650000,'Còn hàng','[]',NULL),
('DL T Innova 08 trước TL','Dàn lạnh Toyota Innova dàn trước','dan-lanh-toyota-innova-dan-truoc','Dàn lạnh','DL T Innova 08 trước','Denso','Thái Lan',NULL,NULL,NULL,1350000,'Còn hàng','[]',NULL),
('DL T Innova 08 trước FO','Dàn lạnh Toyota Innova dàn trước','dan-lanh-toyota-innova-dan-truoc','Dàn lạnh','DL T Innova 08 trước','Paco','Thái Lan',NULL,NULL,NULL,1235000,'Còn hàng','[]',NULL),
('97701-4F600 DW','Lốc điều hoà Kia K250','loc-dieu-hoa-kia-k250','Lốc điều hoà','97701-4F600','Doowon',NULL,NULL,'97701-4F600',NULL,5200000,'Còn hàng','[]',NULL),
('97701-4F600 HCC','Lốc điều hoà Kia K250','loc-dieu-hoa-kia-k250','Lốc điều hoà','97701-4F600','Hanon',NULL,NULL,'97701-4F600',NULL,NULL,'Còn hàng','[]',NULL),
('97606-1R000','Dàn nóng Hyundai Accent 2012–2017','dan-nong-hyundai-accent-2012-2017','Dàn nóng',NULL,'Doowon',NULL,NULL,'97606-1R000','97606-1R000S',2850000,'Còn hàng','[]',NULL),
('DL 4 12V lỗ TQ','Dàn lạnh chế 404 4 cửa lỗ','dan-lanh-che-404-4-cua-lo','Dàn lạnh','DL 4','Big Banyan','Trung Quốc','12V',NULL,NULL,950000,'Còn hàng','[]',NULL),
('DL 4 24V lỗ TQ','Dàn lạnh chế 404 4 cửa lỗ','dan-lanh-che-404-4-cua-lo','Dàn lạnh','DL 4','Big Banyan','Trung Quốc','24V',NULL,NULL,990000,'Hết hàng','[]',NULL);

INSERT INTO fitments (group_key,make,model,year_from,year_to,fuel,engine,note) VALUES
('DL T Innova 08 trước','Toyota','Innova',2006,2015,'Xăng','2.0',NULL),
('DL T Innova 08 trước','Toyota','Altis',2008,2019,'Xăng','1.8',NULL),
('DL T Innova 08 trước','Toyota','Hilux',2004,2015,'Tất cả','2.4; 2.8',NULL),
('DL T Innova 08 trước','Toyota','Hiace',2004,2019,'Dầu',NULL,NULL),
('97701-4F600','Kia','K250',2018,NULL,'Dầu',NULL,NULL),
('97606-1R000','Hyundai','Accent',2012,2017,'Xăng','1.4',NULL),
('DL 4','Khác','Chế nhiều xe',1990,2030,'Tất cả',NULL,'Lắp chế cho nhiều loại xe');

INSERT INTO redirects (old_path,new_path) VALUES ('/dan-nong-accent-2014','/san-pham/dan-nong-hyundai-accent-2012-2017');

-- Thêm dữ liệu mẫu theo bản thiết kế trang chủ (chỉ để chạy thử)
INSERT INTO products (sku,name,slug,category,vehicle_group,brand,origin,voltage,oem_codes,price,status) VALUES
('88310-0D400','Lốc lạnh Denso chính hãng Toyota Vios / Yaris','loc-lanh-denso-chinh-hang-toyota-vios-yaris','Lốc điều hoà','VIOS-14','Denso','Thái Lan',NULL,'88310-0D400',3850000,'Còn hàng'),
('88460-0D400','Dàn nóng điều hòa Toyota Vios kèm phin lọc ga','dan-nong-dieu-hoa-toyota-vios-kem-phin-loc-ga','Dàn nóng','VIOS-14','Denso','Thái Lan',NULL,'88460-0D400',1650000,'Còn hàng'),
('97701-H6100','Lốc lạnh Hyundai Accent / Kia Cerato chính hãng Hanon HCC','loc-lanh-hyundai-accent-kia-cerato-chinh-hang-hanon-hcc','Lốc điều hoà','ACCENT-18','Hanon','Hàn Quốc',NULL,'97701-H6100',3450000,'Còn hàng'),
('97139-H6000','Dàn lạnh trước Hyundai Accent / Grand i10 chính hãng','dan-lanh-truoc-hyundai-accent-grand-i10-chinh-hang','Dàn lạnh','ACCENT-14','Hanon','Hàn Quốc',NULL,'97139-H6000',1350000,'Còn hàng'),
('KF03-61480','Dàn nóng Mazda CX-5 / Mazda 3 SkyActiv chính hãng','dan-nong-mazda-cx-5-mazda-3-skyactiv-chinh-hang','Dàn nóng','CX5-16','Mazda','Nhật Bản',NULL,'KF03-61480',2150000,'Còn hàng'),
('KD45-61B10','Quạt lồng sóc dàn lạnh Mazda CX-5 / Mazda 3','quat-long-soc-dan-lanh-mazda-cx-5-mazda-3','Quạt dàn lạnh','CX5-14','Mazda','Nhật Bản',NULL,'KD45-61B10',1390000,'Còn hàng'),
('EB3G-8C607','Quạt dàn nóng Ford Ranger / Everest 2.0 Bi-Turbo','quat-dan-nong-ford-ranger-everest-2-0-bi-turbo','Quạt dàn nóng','RANGER-20','Ford','Thái Lan',NULL,'EB3G-8C607',2350000,'Còn hàng'),
('JB3Z-19703','Lốc lạnh Ford Ranger / Everest 2.0 Bi-Turbo chính hãng','loc-lanh-ford-ranger-everest-2-0-bi-turbo-chinh-hang','Lốc điều hoà','RANGER-18','Ford','Thái Lan',NULL,'JB3Z-19703',4650000,'Còn hàng'),
('88460-06210','Dàn nóng điều hòa Toyota Camry / Fortuner chính hãng Denso','dan-nong-dieu-hoa-toyota-camry-fortuner-chinh-hang-denso','Dàn nóng','CAMRY-15','Denso','Nhật Bản',NULL,'88460-06210',2250000,'Còn hàng'),
('88501-0K280','Dàn lạnh Toyota Innova / Fortuner chính hãng Denso','dan-lanh-toyota-innova-fortuner-chinh-hang-denso','Dàn lạnh','INNOVA-14','Denso','Nhật Bản',NULL,'88501-0K280',1850000,'Còn hàng'),
('38615-55A-Z01','Cụm quạt dàn nóng Honda City / CR-V chính hãng','cum-quat-dan-nong-honda-city-cr-v-chinh-hang','Quạt dàn nóng','CITY-15','Honda','Thái Lan',NULL,'38615-55A-Z01',1450000,'Còn hàng'),
('97113-A7000','Mô tơ quạt dàn lạnh Kia Cerato / K3 / Seltos','mo-to-quat-dan-lanh-kia-cerato-k3-seltos','Quạt dàn lạnh','K3-14','Hanon','Hàn Quốc',NULL,'97113-A7000',1150000,'Còn hàng'),
('88515-0D010','Van tiết lưu & Phin lọc ga Denso Toyota Vios / Innova','van-tiet-luu-phin-loc-ga-denso-toyota-vios-innova','Van tiết lưu, Van đuôi lốc','VIOS-12','Denso','Thái Lan',NULL,'88515-0D010',680000,'Còn hàng');

INSERT INTO fitments (group_key,make,model,year_from,year_to,fuel,engine) VALUES
('VIOS-14','Toyota','Vios',2014,NULL,'Xăng','1.5'),('VIOS-14','Toyota','Yaris',2014,NULL,'Xăng','1.5'),
('ACCENT-18','Hyundai','Accent',2018,NULL,'Xăng','1.4'),('ACCENT-18','Kia','Cerato',2018,NULL,'Xăng','1.6'),
('ACCENT-14','Hyundai','Accent',2014,NULL,'Xăng','1.4'),('ACCENT-14','Hyundai','Grand i10',2014,NULL,'Xăng','1.2'),
('CX5-16','Mazda','CX-5',2016,NULL,'Xăng','2.0'),('CX5-16','Mazda','Mazda 3',2016,NULL,'Xăng','1.5; 2.0'),
('CX5-14','Mazda','CX-5',2014,NULL,'Xăng','2.0'),('CX5-14','Mazda','Mazda 3',2014,NULL,'Xăng','1.5'),
('RANGER-20','Ford','Ranger',2020,NULL,'Dầu','2.0'),('RANGER-20','Ford','Everest',2020,NULL,'Dầu','2.0'),
('RANGER-18','Ford','Ranger',2018,NULL,'Dầu','2.0'),('RANGER-18','Ford','Everest',2018,NULL,'Dầu','2.0'),
('CAMRY-15','Toyota','Camry',2015,NULL,'Xăng','2.5'),('CAMRY-15','Toyota','Fortuner',2016,NULL,'Tất cả','2.4; 2.7'),
('INNOVA-14','Toyota','Innova',2014,NULL,'Xăng','2.0'),('INNOVA-14','Toyota','Fortuner',2014,NULL,'Tất cả','2.4; 2.7'),
('CITY-15','Honda','City',2015,NULL,'Xăng','1.5'),('CITY-15','Honda','CR-V',2015,NULL,'Xăng','1.5; 2.0'),
('K3-14','Kia','K3',2014,NULL,'Xăng','1.6'),('K3-14','Kia','Cerato',2014,NULL,'Xăng','1.6'),('K3-14','Kia','Seltos',2020,NULL,'Xăng','1.4; 1.6'),
('VIOS-12','Toyota','Vios',2012,NULL,'Xăng','1.5'),('VIOS-12','Toyota','Innova',2012,NULL,'Xăng','2.0'),
('VIOS-14','Toyota','Vios',2010,2013,'Xăng','1.5');

INSERT INTO posts (slug,title,body,published,tag,excerpt) VALUES
('dau-hieu-loc-lanh-o-to-hong','Dấu hiệu nhận biết lốc lạnh ô tô hỏng','Nội dung bài viết mẫu.',1,'Kỹ thuật','Kiểm tra tiếng ồn, độ lạnh và áp suất gas'),
('cach-kiem-tra-dan-lanh-o-to','Cách kiểm tra dàn lạnh ô tô đơn giản','Nội dung bài viết mẫu.',1,'Bảo dưỡng','Phát hiện sớm rò rỉ gas và mùi ẩm mốc'),
('khi-nao-can-thay-dan-nong','Khi nào cần thay dàn nóng ô tô?','Nội dung bài viết mẫu.',1,'Chẩn đoán','Giải pháp khi dàn nóng móp lá tản nhiệt'),
('5-luu-y-khi-su-dung-dieu-hoa-o-to','5 lưu ý khi sử dụng điều hòa ô tô','Nội dung bài viết mẫu.',1,'Mẹo hay','Giúp làm mát nhanh và tiết kiệm nhiên liệu');
