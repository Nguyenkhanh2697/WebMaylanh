// Đọc file Excel mẫu ngay trên trình duyệt, đổi tên cột tiếng Việt sang khoá, gửi từng phần lên máy chủ
const PRODUCT_COLS = {
  'Mã sản phẩm': 'sku',
  'Tên sản phẩm': 'name',
  'Danh mục': 'category',
  'Mã nhóm xe': 'vehicle_group',
  'Thương hiệu': 'brand',
  'Xuất xứ': 'origin',
  'Điện áp': 'voltage',
  'Mã OEM (chính hãng)': 'oem_codes',
  'Mã tương đương': 'equiv_codes',
  'Giá bán (đ)': 'price',
  'Tình trạng': 'status',
  'Tên file ảnh': 'images',
  'Mô tả ngắn': 'description',
}
const FITMENT_COLS = {
  'Mã nhóm xe hoặc Mã sản phẩm': 'group_key',
  'Hãng xe': 'make',
  'Dòng xe': 'model',
  'Đời từ năm': 'year_from',
  'Đời đến năm': 'year_to',
  'Nhiên liệu': 'fuel',
  'Dung tích động cơ (L)': 'engine',
  'Ghi chú': 'note',
}

const log = document.getElementById('import-log')
const say = (t) => { log.textContent += t + '\n'; log.scrollTop = log.scrollHeight }

// Tiêu đề cột nằm ở dòng 2 của file mẫu (dòng 1 là tên sheet)
function readSheet(wb, name, cols) {
  const ws = wb.Sheets[name]
  if (!ws) throw new Error(`Không thấy sheet "${name}"`)
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
  const headerIdx = raw.findIndex((r) => r.some((c) => Object.keys(cols).includes(String(c).trim())))
  if (headerIdx < 0) throw new Error(`Sheet "${name}" không đúng mẫu`)
  const header = raw[headerIdx].map((c) => cols[String(c).trim()])
  return raw.slice(headerIdx + 1).map((r, i) => {
    const o = { row: headerIdx + i + 2 }
    header.forEach((k, j) => { if (k) o[k] = r[j] })
    return o
  })
}

async function post(url, rows) {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rows }) })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText)
  return res.json()
}

document.getElementById('xlsx-import').addEventListener('click', async () => {
  const file = document.getElementById('xlsx-file').files[0]
  if (!file) return alert('Chọn file Excel trước')
  const skip = document.getElementById('skip-examples').checked
  log.textContent = ''
  try {
    const wb = XLSX.read(await file.arrayBuffer())
    let products = readSheet(wb, 'Sản phẩm', PRODUCT_COLS)
    let fitments = readSheet(wb, 'Xe phù hợp', FITMENT_COLS)
    if (skip) {
      products = products.filter((r) => !String(r.description || '').includes('VÍ DỤ'))
      fitments = fitments.filter((r) => !String(r.note || '').includes('VÍ DỤ'))
    }
    say(`Đọc được ${products.length} dòng sản phẩm, ${fitments.length} dòng xe phù hợp`)

    let errors = []
    let n = 0
    for (let i = 0; i < products.length; i += 500) {
      const r = await post('/admin/api/import/products', products.slice(i, i + 500))
      n += r.imported
      errors = errors.concat(r.errors)
      say(`Sản phẩm: ${Math.min(i + 500, products.length)}/${products.length}`)
    }
    say(`✓ Nhập ${n} sản phẩm`)

    // Gửi theo nhóm: các dòng cùng mã nhóm luôn đi chung một lần gửi
    const byGroup = {}
    fitments.forEach((r) => { const g = String(r.group_key || '').trim(); (byGroup[g] = byGroup[g] || []).push(r) })
    let chunk = [], m = 0
    const flush = async () => {
      if (!chunk.length) return
      const r = await post('/admin/api/import/fitments', chunk)
      m += r.imported
      errors = errors.concat(r.errors)
      chunk = []
    }
    for (const rows of Object.values(byGroup)) {
      if (chunk.length + rows.length > 1500) await flush()
      chunk = chunk.concat(rows)
    }
    await flush()
    say(`✓ Nhập ${m} dòng xe phù hợp`)

    await fetch('/admin/api/reindex', { method: 'POST' })
    say('✓ Đã cập nhật chỉ mục tìm kiếm')

    if (errors.length) {
      say(`\n${errors.length} dòng lỗi (đã bỏ qua, sửa trong Excel rồi nhập lại):`)
      errors.forEach((e) => say(`  ${e.row ? 'Dòng ' + e.row + ': ' : ''}${e.message}`))
    } else say('\nKhông có lỗi.')
  } catch (e) {
    say('Lỗi: ' + e.message)
  }
})
