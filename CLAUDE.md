# maylanhoto.vn – ghi chú cho Claude

Website phụ tùng điều hoà ô tô cho **Công ty TNHH PTTM DQT** (GĐ Đặng Quốc Toàn). Bên làm web: Hộ kinh doanh Thời trang Déla (Nguyễn Hoàng Khánh). Đầu mối phía khách trong nhóm Zalo "Website DQT": chị Trang Nguyen, anh Nguyễn Trọng Định.

Trả lời và viết giao diện bằng tiếng Việt có dấu, câu ngắn, dễ hiểu với chủ cửa hàng.

## Hợp đồng (đã ký, không tự đổi số)

- Hợp đồng số 01/2026/HĐDV-DÉLA. Tổng 82.280.000 đ đã gồm thuế = website 79.280.000 đ (Phụ lục 01) + tìm theo số khung 3.000.000 đ (Phụ lục 04).
- Thanh toán 30/40/30: cọc 24.684.000 (đã nhận 11/11/2026) · lần 1 32.912.000 khi duyệt giao diện · lần 2 24.684.000 khi nghiệm thu.
- Phạm vi: thiết kế giao diện, giao diện khách hàng (tìm kiếm + bộ lọc theo xe), hệ thống + trang quản trị (nhập/xuất Excel báo lỗi từng dòng, ảnh tự nén, báo giá, bài viết), SEO + 301 link cũ, GA4/Search Console/Meta Pixel, triển khai Cloudflare, nhập sản phẩm lần đầu (~3.800), bán hàng online (giỏ hàng, COD, chuyển khoản VietQR, quản lý đơn), bàn giao mã nguồn, tìm theo số khung.
- Ngoài phạm vi (báo giá riêng nếu khách hỏi): cổng thanh toán VNPay/MoMo, kết nối GHN/GHTK, quản lý đại lý, tra VIN qua dịch vụ ngoài.
- Bảo hành 12 tháng từ ngày chạy chính thức.

## Tiến độ (tab Kế hoạch trong Google Sheet "Báo giá chi phí và kế hoạch thiết kế web")

Làm đúng lịch, không gửi khách sớm hơn ngày ghi.

| Ngày | Gửi khách |
|---|---|
| 17/11 | Sơ đồ trang, file mẫu nhập liệu |
| 20/11 | Thiết kế trang chủ (link chạy thử chỉ mở trang chủ) |
| 26/11 | Thiết kế các trang còn lại |
| 27/11 – 07/12 | Khách duyệt giao diện; thanh toán lần 1 dự kiến 08–10/12 |
| 04/12 | Mở tìm kiếm, danh mục, sản phẩm, bài viết, trang chính sách, báo giá, quản trị |
| 07/12 | Nhập thử 100 sản phẩm |
| 11/12 | Mở giỏ hàng, đặt hàng |
| 14/12 | Bảng link cũ – link mới (301) để duyệt |
| 16/12 | Hạn khách gửi đủ dữ liệu (25 ngày làm việc) |
| 17/12 | Mở tìm theo số khung |
| 24/12 | Bản nghiệm thu |
| 05–07/01/2027 | Chạy chính thức; thanh toán lần 2 dự kiến 05–11/01 |

Biến `HIDE` trong `wrangler.jsonc` điều khiển phần nào được mở (xem README). Đến ngày nào thì bỏ mục đó khỏi `HIDE` rồi deploy; chạy chính thức để `"HIDE": ""`. Ngày hiện trên trang "đang hoàn thiện" nằm ở `OPEN_DATE` trong `src/lib/flags.ts`, đổi lịch thì sửa cả hai chỗ.

## Quy tắc dữ liệu

- Excel mẫu 3 sheet: **Sản phẩm**, **Xe phù hợp**, **Mã khung**. Mỗi dòng Sản phẩm = 1 mã riêng; các dòng **cùng Tên sản phẩm** gộp 1 trang, khách chọn loại theo Thương hiệu – Xuất xứ – Điện áp.
- Xe phù hợp nhập theo Mã nhóm xe; đời xe theo khoảng (chọn 2014 ra hàng lắp 2012–2017).
- Giá trống = "Liên hệ", không đặt online. Giá đơn hàng luôn lấy lại từ cơ sở dữ liệu.
- Số khung: WMI 3 ký tự, VDS 6 ký tự (hoặc 5 + `*`), năm ở ký tự 10; số khung ngắn tra theo phần đầu khớp dài nhất (`src/lib/vin.ts`).

## Giao diện

- Màu xanh lá đậm / xanh bạc hà theo mẫu chị Trang duyệt. Menu: Trang chủ, Sản phẩm, Tìm theo xe, Kiến thức hữu ích, Hỗ trợ. Đã bỏ Tin tức, Đại lý, Giới thiệu.
- Logo: `public/logo.svg` (đầy đủ), `public/logo-mark.svg` (chỉ chữ DQT) – bản vẽ lại từ ảnh chụp, thay khi khách gửi file gốc.
- Banner: máy tính 1920×600, điện thoại 800×800, ảnh không chèn chữ.

## Góp ý của cửa hàng đã làm

- 21/11: máy tính 1 banner cố định (không chuyển cảnh); điện thoại 3 slide theo câu chữ cửa hàng; bỏ khoảng giá ở danh sách; dải sản phẩm không tự chạy, khách tự lướt (4 SP/trang); nút giỏ hàng tròn cạnh giá (khi `cart` còn ẩn thì báo "mở ngày 11/12"); trang quản trị **Sắp xếp trang chủ** (`/admin/sap-xep`, cột `home_order`, migration 0003). Ảnh banner: cửa hàng gửi 26/11, đã thay (`public/banners/banner-pc.jpg`, `banner-m.jpg`).
- 24/11 (việc 7): giao diện các trang con cùng phong cách trang chủ: `PageHead` (breadcrumb) ở mọi trang con; trang sản phẩm mới (ô số lượng − +, nút Gọi/Zalo, cam kết, sản phẩm cùng danh mục); giỏ hàng theo mẫu khách 21/11 (Thông tin liên hệ + Địa chỉ giao hàng 34 tỉnh | Đơn hàng của bạn); trang gửi thành công; tra số khung dạng thẻ; bài viết có cột bài khác; Hỗ trợ có menu chính sách; trang quản trị nền xanh. Biến `CHECKOUT_MODE` = `quote` (gửi yêu cầu báo giá, không thanh toán) hoặc `pay` (COD/QR) – khách đang muốn bỏ thanh toán, chờ phụ lục điều chỉnh giá.
- 26/11 (góp ý file thiết kế các trang): giỏ hàng bỏ Email và Tỉnh/Thành, Địa chỉ + Ghi chú gộp vào Thông tin liên hệ; chọn loại tách 3 nhóm Nhà sản xuất · Xuất xứ · Điện áp (nhóm không có dữ liệu thì ẩn, tổ hợp không có hàng thì nút mờ, bấm vào chuyển sang loại gần nhất); không có nút "Mua ngay", "Thêm vào giỏ" là nút chính.

## Triển khai

- Cloudflare Workers + Hono (JSX) + D1. R2 đang tắt vì tài khoản chưa bật (xem comment trong `wrangler.jsonc`); `IMAGES` là tuỳ chọn trong code.
- Node ≥ 22 (`.nvmrc`). Không commit `.dev.vars`.
- Link test nội bộ mở full (không gửi khách): `npm run deploy:test` → maylanhoto-web-test.nguyenkhanh2697.workers.dev (env `test` trong `wrangler.jsonc`, HIDE="none", chung database).
- Lệnh: `npm run dev`, `npm run typecheck`, `npm run deploy`, `npm run db:migrate:remote`, `npm run db:seed:remote`.

## Việc còn lại

Xuất Excel trong quản trị · tải file số khung trong quản trị · trang bài viết trong quản trị · logo mờ trên ảnh · nhập bảng 301 · gắn GA4/Search Console/Pixel · kiểm thử 20.000 sản phẩm · thông tin tài khoản nhận tiền QR thật · bật R2.
