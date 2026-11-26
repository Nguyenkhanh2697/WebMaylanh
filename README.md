# maylanhoto.vn – website phụ tùng máy lạnh ô tô

Hono + TypeScript chạy trên Cloudflare Workers, cơ sở dữ liệu Cloudflare D1 (SQLite), ảnh lưu trên Cloudflare R2.

## Chạy thử trên máy

```bash
npm install
npm run db:migrate:local      # tạo bảng
npm run db:seed:local         # dữ liệu mẫu theo bản thiết kế + dữ liệu số khung từ file của cửa hàng
npm run dev                   # http://localhost:8787
```

Lần đầu vào `/admin/cai-dat` để tạo tài khoản quản trị, sau đó vào `/admin/nhap-excel` và bấm cập nhật chỉ mục tìm kiếm (nhập Excel sẽ tự làm việc này).

## Đưa lên Cloudflare

```bash
npx wrangler login
npx wrangler d1 create maylanhoto            # dán database_id vào wrangler.jsonc
npx wrangler r2 bucket create maylanhoto-images
npx wrangler secret put SESSION_SECRET       # chuỗi ngẫu nhiên dài
npm run db:migrate:remote
npm run deploy
```

Sửa `vars` trong `wrangler.jsonc`: số điện thoại, Zalo, thông tin tài khoản nhận tiền QR (cửa hàng cung cấp).

## Link chạy thử: ẩn chức năng chưa tới hạn

Biến `HIDE` trong `wrangler.jsonc` (mặc định `search,catalog,posts,pages,cart,vin,quote,admin`, tức chỉ mở trang chủ cho bản gửi 20/11). Với `cart`, `vin`, `quote` thì nút bị ẩn; với `search`, `catalog`, `posts`, `pages` thì vẫn giữ link để trang chủ đủ bố cục, bấm vào ra trang "đang hoàn thiện" kèm ngày gửi (mã 404). `admin` và API bị chặn trả về 404. Link chạy thử luôn có `noindex` để Google không lập chỉ mục.

| Mục | Ẩn gì | Mở theo tab Kế hoạch |
|---|---|---|
| `search` | Trang tìm kiếm, lọc theo xe | 04/12 |
| `catalog` | Trang danh mục, chi tiết sản phẩm | 04/12 |
| `posts` | Kiến thức, tin tức, bài viết | 04/12 |
| `pages` | Trang hỗ trợ, chính sách | 04/12 |
| `admin` | Trang quản trị `/admin` | 04/12 |
| `quote` | Form yêu cầu báo giá | 04/12 |
| `cart` | Giỏ hàng, nút thêm giỏ, đặt hàng, trang đơn hàng QR | 11/12 |
| `vin` | Ô và trang tìm theo số khung | 17/12 |

Bỏ mục khỏi danh sách rồi `npm run deploy` là mở. Khi chạy chính thức để `"HIDE": ""`.

## Cấu trúc

| Đường dẫn | Nội dung |
|---|---|
| `migrations/0001_init.sql` | Bảng dữ liệu, khớp file Excel mẫu |
| `src/index.tsx` | Khởi tạo app, chuyển hướng 301 link cũ |
| `src/routes/public.tsx` | Trang chủ, tìm kiếm, danh mục, trang sản phẩm, giỏ hàng, đơn hàng QR, sitemap |
| `src/routes/api.ts` | API dòng xe, tìm kiếm, tạo đơn, yêu cầu báo giá |
| `src/routes/admin.tsx` | Đăng nhập, đơn hàng, báo giá, sản phẩm, nhập Excel, tải ảnh |
| `src/lib/search.ts` | Tìm theo tên/mã (FTS5, bỏ dấu) và theo xe (hãng, dòng, đời theo khoảng, nhiên liệu, dung tích) |
| `src/lib/importer.ts` | Kiểm tra và nhập dữ liệu Excel, báo lỗi từng dòng |
| `public/` | CSS, JS giỏ hàng, JS nhập Excel và nén ảnh WebP |

## Quy tắc dữ liệu chính

- Mỗi dòng sheet **Sản phẩm** = 1 sản phẩm có mã riêng. Các dòng **cùng Tên sản phẩm** gộp thành 1 trang, khách chọn loại theo Thương hiệu – Xuất xứ – Điện áp.
- Sheet **Xe phù hợp** nhập theo **Mã nhóm xe** (hoặc mã sản phẩm nếu không có nhóm). Ô "Vios; Yaris" được tách thành 2 dòng xe.
- Giá để trống = "Liên hệ", không đặt online được. Sản phẩm "Hết hàng" cũng không đặt được.
- Đơn hàng: giá luôn lấy lại từ cơ sở dữ liệu. Trang đơn hàng hiện mã VietQR có sẵn số tiền và nội dung là mã đơn; cửa hàng kiểm tra tiền về rồi đổi trạng thái trong trang quản trị.

## Tra số khung (Phụ lục 04)

- Bảng `vin_wmi`, `vin_vds`, `vin_old` theo đúng 3 sheet của file "Số khung.xlsx" cửa hàng gửi.
- `src/lib/vin.ts`: số khung 17 ký tự đọc WMI (3 ký tự đầu), VDS (6 ký tự, hoặc 5 ký tự + `*`), năm ở ký tự thứ 10 (chu kỳ 30 năm, chọn năm gần nhất); số khung ngắn tra theo phần đầu khớp dài nhất.
- Có mã nhóm xe ở các cột phụ tùng thì ra đúng sản phẩm; chưa có thì khớp hãng + dòng xe + đời với dữ liệu "Xe phù hợp"; chỉ nhận ra hãng thì điền sẵn hãng, năm vào bộ lọc.
- Cập nhật dữ liệu tạm thời: `python3 seed/vin_xlsx_to_sql.py "So khung.xlsx" > seed/vin.sql` rồi nạp vào D1.

## Việc còn lại

- Trang quản trị tải file số khung (thay cho lệnh ở trên).
- Trang bài viết trong quản trị (thêm, sửa bài, ảnh bìa).
- Giao diện trang sản phẩm, giỏ hàng theo cùng phong cách trang chủ.
- Đóng logo mờ lên ảnh phụ khi tải ảnh.
- Nhập bảng chuyển hướng 301 từ danh sách link cũ đã được cửa hàng duyệt.
- Gắn GA4, Search Console, Meta Pixel.
- Kiểm thử với dữ liệu mô phỏng 20.000 sản phẩm.
