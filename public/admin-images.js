// Nén ảnh sang WebP ngay trên trình duyệt (cạnh dài tối đa 1200px) rồi tải lên R2
const imgLog = document.getElementById('img-log')
const sayImg = (t) => { imgLog.textContent += t + '\n' }

function toKey(filename) {
  const base = filename.replace(/\.[^.]+$/, '')
  return base.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') + '.webp'
}

async function compress(file, max = 1200, quality = 0.82) {
  const bmp = await createImageBitmap(file)
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height))
  const canvas = new OffscreenCanvas(Math.round(bmp.width * scale), Math.round(bmp.height * scale))
  canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height)
  return canvas.convertToBlob({ type: 'image/webp', quality })
}

document.getElementById('img-upload').addEventListener('click', async () => {
  const files = [...document.getElementById('img-files').files]
  if (!files.length) return alert('Chọn ảnh trước')
  imgLog.textContent = ''
  let ok = 0
  for (const f of files) {
    try {
      const blob = await compress(f)
      const key = toKey(f.name)
      const res = await fetch('/admin/api/images/' + key, { method: 'PUT', body: blob })
      if (!res.ok) throw new Error((await res.json()).error)
      ok++
      sayImg(`✓ ${f.name} → ${key} (${Math.round(f.size / 1024)}KB → ${Math.round(blob.size / 1024)}KB)`)
    } catch (e) {
      sayImg(`✗ ${f.name}: ${e.message}`)
    }
  }
  sayImg(`\nĐã tải ${ok}/${files.length} ảnh`)
})
