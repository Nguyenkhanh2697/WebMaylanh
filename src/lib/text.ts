// Bỏ dấu tiếng Việt và tạo slug cho URL: "Dàn lạnh Toyota Innova" -> "dan-lanh-toyota-innova"
export function stripDiacritics(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
}

export function slugify(s: string): string {
  return stripDiacritics(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)
}

// Tách ô có nhiều giá trị cách nhau dấu ; (mã OEM, dòng xe, dung tích, ảnh)
export function splitList(s: string | null | undefined): string[] {
  if (!s) return []
  return String(s)
    .split(/[;\n]/)
    .map((x) => x.trim())
    .filter(Boolean)
}

export function formatVnd(n: number | null | undefined): string {
  if (n == null) return 'Liên hệ'
  return n.toLocaleString('vi-VN') + ' đ'
}

// Nhãn nút chọn loại trên trang sản phẩm: "Denso – Nhật Bản · 12V"
export function variantLabel(p: { brand: string | null; origin: string | null; voltage: string | null }): string {
  const main = [p.brand, p.origin].filter(Boolean).join(' – ')
  return [main, p.voltage].filter(Boolean).join(' · ') || 'Mặc định'
}

// Mã phụ tùng viết liền để tìm "976061R000" vẫn ra "97606-1R000"
export function compactCode(s: string): string {
  return s.replace(/[^0-9a-zA-Z]/g, '').toUpperCase()
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}
