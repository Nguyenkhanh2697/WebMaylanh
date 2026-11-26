// Giỏ hàng lưu ở trình duyệt khách; giá thật luôn được máy chủ tính lại khi đặt hàng
const CART_KEY = 'mlot_cart'
const cart = {
  get() {
    try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]') } catch { return [] }
  },
  set(items) {
    try { localStorage.setItem(CART_KEY, JSON.stringify(items)) } catch {}
    updateBadge()
  },
  add(item) {
    const items = cart.get()
    const found = items.find((i) => i.id === item.id)
    if (found) found.qty += item.qty
    else items.push(item)
    cart.set(items)
  },
}
const vnd = (n) => (n == null ? 'Liên hệ' : n.toLocaleString('vi-VN') + ' đ')

function updateBadge() {
  const el = document.getElementById('cart-count')
  if (el) el.textContent = cart.get().reduce((s, i) => s + i.qty, 0)
}
updateBadge()

// Bộ lọc xe: chọn hãng thì tải dòng xe, chọn dòng thì tải động cơ
const makeSel = document.getElementById('vf-make')
const modelSel = document.getElementById('vf-model')
const engineSel = document.getElementById('vf-engine')
function fill(sel, items, placeholder) {
  sel.innerHTML = `<option value="">${placeholder}</option>`
  for (const m of items) {
    const o = document.createElement('option')
    o.value = o.textContent = m
    if (sel.dataset.selected === m) o.selected = true
    sel.appendChild(o)
  }
}
// Trong lúc tải: ô bị khoá, hiện "Đang tải..." và vòng xoay cạnh nhãn
async function fetchInto(sel, url, placeholder) {
  if (!url) return fill(sel, [], placeholder)
  const label = sel.closest('label')
  sel.disabled = true
  sel.innerHTML = '<option>Đang tải...</option>'
  label && label.classList.add('is-loading')
  try {
    fill(sel, await fetch(url).then((r) => r.json()), placeholder)
  } catch {
    fill(sel, [], placeholder)
  } finally {
    sel.disabled = false
    label && label.classList.remove('is-loading')
  }
}
async function loadModels() {
  if (!makeSel || !modelSel) return
  const make = makeSel.value
  await fetchInto(modelSel, make && '/api/models?make=' + encodeURIComponent(make), 'Chọn tên xe')
  loadEngines()
}
async function loadEngines() {
  if (!engineSel) return
  const make = makeSel.value, model = modelSel.value
  const url = '/api/engines?make=' + encodeURIComponent(make) + '&model=' + encodeURIComponent(model)
  await fetchInto(engineSel, make && url, 'Chọn động cơ')
}
if (makeSel) {
  makeSel.addEventListener('change', () => { modelSel.dataset.selected = ''; engineSel && (engineSel.dataset.selected = ''); loadModels() })
  modelSel.addEventListener('change', () => { engineSel && (engineSel.dataset.selected = ''); loadEngines() })
  loadModels()
}

// Nút "Thêm giỏ" trên thẻ sản phẩm (sản phẩm chỉ có 1 loại)
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-add]')
  if (!b) return
  cart.add({ id: Number(b.dataset.add), name: b.dataset.name, label: '', price: Number(b.dataset.price), qty: 1 })
  const old = b.innerHTML
  b.textContent = 'Đã thêm ✓'
  setTimeout(() => (b.innerHTML = old), 1200)
})

// Trang sản phẩm: đổi loại thì đổi giá, ảnh, mã
const product = document.getElementById('product')
if (product) {
  const variants = JSON.parse(product.dataset.variants)
  let current = 0
  const $ = (id) => document.getElementById(id)
  function show(i) {
    current = i
    const v = variants[i]
    $('pv-price').textContent = v.priceText
    $('pv-sku').textContent = v.sku
    $('pv-status').textContent = v.status
    $('pv-status').dataset.status = v.status
    $('pv-codes').textContent = [v.oem && 'Mã OEM: ' + v.oem, v.equiv && 'Tương đương: ' + v.equiv].filter(Boolean).join(' · ')
    $('pv-desc').textContent = v.description || 'Cửa hàng đang cập nhật mô tả. Cần thông số chi tiết, vui lòng gọi hoặc nhắn Zalo.'
    $('pv-image').src = v.images[0] || '/no-image.svg'
    const thumbs = $('pv-thumbs')
    thumbs.innerHTML = ''
    v.images.forEach((src) => {
      const img = document.createElement('img')
      img.src = src
      img.onclick = () => ($('pv-image').src = src)
      thumbs.appendChild(img)
    })
    const add = $('pv-add')
    add.disabled = v.price == null || v.status === 'Hết hàng'
    add.textContent = v.price == null ? 'Gọi để báo giá' : v.status === 'Hết hàng' ? 'Hết hàng' : 'Thêm vào giỏ'
    // Nút theo nhóm: sáng nút đang chọn; làm mờ giá trị không có loại nào khớp với các nhóm còn lại
    document.querySelectorAll('.variant-btn').forEach((b) => {
      const g = b.dataset.group, val = b.dataset.value
      b.classList.toggle('active', v[g] === val)
      const ok = variants.some((x) => x[g] === val && GROUPS.every((k) => k === g || x[k] === v[k]))
      b.classList.toggle('unavailable', !ok)
      b.title = ok ? '' : 'Không có loại này với lựa chọn hiện tại, bấm để chuyển loại'
    })
    document.querySelectorAll('[data-sel]').forEach((el) => (el.textContent = v[el.dataset.sel] || '—'))
  }
  const GROUPS = ['brand', 'origin', 'voltage']
  // Bấm 1 giá trị: lấy loại có giá trị đó và giữ được nhiều lựa chọn khác nhất
  document.querySelectorAll('.variant-btn').forEach((b) => b.addEventListener('click', () => {
    const g = b.dataset.group, val = b.dataset.value, cur = variants[current]
    let best = -1, bestScore = -1
    variants.forEach((x, i) => {
      if (x[g] !== val) return
      const score = GROUPS.filter((k) => k !== g && x[k] === cur[k]).length
      if (score > bestScore) { best = i; bestScore = score }
    })
    if (best >= 0) show(best)
  }))
  $('pv-add').addEventListener('click', () => {
    if (document.body.classList.contains('hide-cart')) { toast('Giỏ hàng sẽ mở trên link chạy thử ngày 11/12'); return }
    const v = variants[current]
    const qty = Math.max(1, Number($('pv-qty').value) || 1)
    cart.add({ id: v.id, name: product.dataset.name, label: v.label, price: v.price, qty })
    $('pv-add').textContent = 'Đã thêm ✓'
    setTimeout(() => show(current), 1200)
  })
  show(0)
}

// Trang giỏ hàng (mẫu cửa hàng gửi 21/11): danh sách bên phải, form liên hệ + địa chỉ bên trái
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]))
const cartBox = document.getElementById('cart')
if (cartBox) {
  const form = document.getElementById('checkout')
  const co = document.getElementById('co')
  const quote = co && co.dataset.mode === 'quote'
  const err = document.getElementById('co-err')
  const short = (n) => (n.split(' ')[0] || '').slice(0, 4)
  function render() {
    const items = cart.get()
    const count = items.reduce((s, i) => s + i.qty, 0)
    document.getElementById('co-count').textContent = count + ' sản phẩm'
    const total = items.reduce((s, i) => s + i.price * i.qty, 0)
    document.getElementById('co-total').textContent = vnd(total)
    document.getElementById('co-submit').disabled = !items.length
    if (!items.length) {
      cartBox.innerHTML = '<div class="co-empty">Giỏ hàng đang trống.<br><a href="/tim-kiem">Tìm phụ tùng</a> hoặc <a href="/#tim-theo-xe">tìm theo xe</a></div>'
      return
    }
    cartBox.innerHTML = items.map((i, idx) =>
      `<div class="cl"><span class="cl-thumb">${esc(short(i.name))}<em>${i.qty}</em></span>` +
      `<div class="cl-body"><b>${esc(i.name)}</b>${i.label ? `<small>${esc(i.label)}</small>` : ''}` +
      `<div class="cl-ctl"><div class="qty-step sm"><button type="button" data-q="-1" data-idx="${idx}" aria-label="Bớt 1">−</button>` +
      `<input type="number" min="1" max="99" value="${i.qty}" data-idx="${idx}" class="cart-qty" aria-label="Số lượng">` +
      `<button type="button" data-q="1" data-idx="${idx}" aria-label="Thêm 1">+</button></div>` +
      `<button type="button" class="cl-del" data-del="${idx}">Xoá</button></div></div>` +
      `<span class="cl-price">${vnd(i.price * i.qty)}</span></div>`).join('')
  }
  const setQty = (idx, q) => { const items = cart.get(); if (!items[idx]) return; items[idx].qty = Math.min(99, Math.max(1, q || 1)); cart.set(items); render() }
  cartBox.addEventListener('change', (e) => { if (e.target.classList.contains('cart-qty')) setQty(Number(e.target.dataset.idx), Number(e.target.value)) })
  cartBox.addEventListener('click', (e) => {
    const q = e.target.closest('[data-q]')
    if (q) { const items = cart.get(); const i = Number(q.dataset.idx); setQty(i, (items[i]?.qty || 1) + Number(q.dataset.q)); return }
    const d = e.target.closest('[data-del]')
    if (d) { const items = cart.get(); items.splice(Number(d.dataset.del), 1); cart.set(items); render() }
  })
  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    err.textContent = ''
    const data = Object.fromEntries(new FormData(form))
    if (!String(data.customer_name || '').trim()) { err.textContent = 'Vui lòng nhập tên.'; form.customer_name.focus(); return }
    if (String(data.phone || '').replace(/\D/g, '').length < 9) { err.textContent = 'Vui lòng nhập số điện thoại đúng.'; form.phone.focus(); return }
    if (data.pay === 'cod') data.note = ['Thanh toán khi nhận hàng', data.note].filter(Boolean).join(' · ')
    data.items = cart.get().map((i) => ({ id: i.id, qty: i.qty }))
    const btn = document.getElementById('co-submit')
    btn.disabled = true
    btn.classList.add('is-loading')
    try {
      const res = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      const out = await res.json()
      if (!res.ok) throw new Error(out.error || 'Gửi chưa được, vui lòng thử lại')
      cart.set([])
      location.href = '/don-hang/' + out.code
    } catch (x) {
      err.textContent = x.message
      btn.disabled = false
      btn.classList.remove('is-loading')
    }
  })
  render()
}

// Ô số lượng có nút − + (trang sản phẩm)
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-step]')
  if (!b) return
  const inp = b.parentElement.querySelector('input')
  inp.value = Math.min(99, Math.max(1, (Number(inp.value) || 1) + Number(b.dataset.step)))
})

// Menu trượt: nút ☰ cạnh logo, đóng bằng nút ×, bấm nền mờ hoặc phím Esc
const drawer = document.getElementById('drawer')
const menuBtn = document.querySelector('[data-drawer-open]')
function setDrawer(open) {
  if (!drawer) return
  document.body.classList.toggle('drawer-open', open)
  drawer.setAttribute('aria-hidden', String(!open))
  menuBtn && menuBtn.setAttribute('aria-expanded', String(open))
  if (open) drawer.querySelector('.drawer-close').focus()
  else menuBtn && menuBtn.focus()
}
menuBtn && menuBtn.addEventListener('click', () => setDrawer(true))
document.querySelectorAll('[data-drawer-close]').forEach((el) => el.addEventListener('click', () => setDrawer(false)))
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && document.body.classList.contains('drawer-open')) setDrawer(false)
})

// Đổ bóng thanh đầu trang khi cuộn
const header = document.querySelector('.site-header')
const onScroll = () => header && header.classList.toggle('scrolled', window.scrollY > 4)
window.addEventListener('scroll', onScroll, { passive: true })
onScroll()

// Ảnh hiện dần khi tải xong, nền xám giữ chỗ trong lúc chờ
document.querySelectorAll('.post-cover img, .product-gallery img, .thumbs img').forEach((img) => {
  img.classList.add('fade')
  img.parentElement.classList.add('img-wrap')
  const done = () => img.classList.add('loaded')
  if (img.complete && img.naturalWidth) done()
  else img.addEventListener('load', done), img.addEventListener('error', done)
})

// Hiện dần từng khối khi cuộn tới; các thẻ cùng hàng hiện lệch nhau một chút
const REVEAL = '.block-head, .cat-card, .search-panel, .help-card, .list-head, .pcard, .feature, .post, .news-feature, .news-item'
function reveal(root) {
  const els = [...root.querySelectorAll(REVEAL)]
  if (!('IntersectionObserver' in window)) return els.forEach((el) => el.classList.add('reveal', 'in'))
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (!en.isIntersecting) continue
      en.target.classList.add('in')
      io.unobserve(en.target)
    }
  }, { rootMargin: '0px 0px -8% 0px' })
  els.forEach((el) => {
    const sibs = [...el.parentElement.children].filter((c) => c.matches(REVEAL))
    el.style.setProperty('--i', String(Math.min(sibs.indexOf(el) % 4, 6)))
    el.classList.add('reveal')
    io.observe(el)
  })
}
reveal(document)

// Chuyển trang: thanh tiến trình trên cùng; đổi khoảng giá / xem thêm thì danh sách hiện khung xương
const topbar = document.createElement('div')
topbar.className = 'topbar'
document.body.appendChild(topbar)
const skeletonCard = () =>
  '<div class="pcard-skel" aria-hidden="true">' +
  '<div class="row"><span class="skel" style="width:70px;height:18px"></span><span class="skel" style="width:60px;height:12px"></span></div>' +
  '<span class="skel" style="width:92%;height:16px"></span><span class="skel" style="width:65%;height:16px"></span>' +
  '<span class="skel" style="width:80%;height:12px;margin-top:6px"></span><span class="skel" style="width:55%;height:12px"></span>' +
  '<div class="row" style="margin-top:8px"><span class="skel" style="width:90px;height:22px"></span><span class="skel" style="width:74px;height:30px"></span></div>' +
  '</div>'
function startLoading(withSkeleton) {
  topbar.classList.add('run')
  // Dải sản phẩm trượt: thay cả dải bằng 1 trang khung xương
  const track = withSkeleton && document.querySelector('.pslider-track')
  if (track) {
    track.innerHTML = '<div class="pslider-page"><div class="pgrid loading" aria-busy="true">' + Array.from({ length: 4 }, skeletonCard).join('') + '</div></div>'
    return
  }
  const grid = withSkeleton && document.querySelector('.pgrid')
  if (grid) {
    const n = Math.min(Math.max(grid.children.length, 4), 8)
    grid.classList.add('loading')
    grid.setAttribute('aria-busy', 'true')
    grid.innerHTML = Array.from({ length: n }, skeletonCard).join('')
  }
}
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href]')
  if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
  if (a.target === '_blank' || a.hasAttribute('download')) return
  if (a.closest('.drawer')) setDrawer(false)
  const url = new URL(a.href, location.href)
  if (url.origin !== location.origin) return
  if (url.pathname === location.pathname && url.search === location.search) return
  startLoading(!!a.closest('.price-chips, .list-card, .quick'))
})
document.addEventListener('submit', (e) => {
  const f = e.target
  if (e.defaultPrevented || f.id === 'checkout') return
  const btn = f.querySelector('button[type=submit]')
  btn && btn.classList.add('busy')
  startLoading(false)
})
// Quay lại bằng nút Back: trang lấy từ bộ nhớ đệm, tắt trạng thái đang tải
window.addEventListener('pageshow', (e) => {
  if (!e.persisted) return
  topbar.classList.remove('run')
  document.querySelectorAll('.busy').forEach((b) => b.classList.remove('busy'))
  if (document.querySelector('.pgrid.loading')) location.reload()
})

// Banner điện thoại: 3 slide tự chạy 5 giây; chấm, mũi tên hoặc vuốt để chuyển; dừng khi rê chuột / tab bị ẩn
const hero = document.querySelector('[data-hero]')
if (hero) {
  const slides = [...hero.querySelectorAll('.hero-slide')]
  const arts = [...hero.querySelectorAll('.hero-bg')]
  const dots = [...hero.querySelectorAll('.hero-dot')]
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  let cur = 0, timer = null, hovering = false
  slides.forEach((s, i) => { if (i !== cur) s.inert = true })
  function go(i) {
    i = (i + slides.length) % slides.length
    if (i === cur) return
    const dir = i > cur ? 1 : -1
    slides.forEach((s) => s.classList.remove('is-prev'))
    // Slide cũ trượt ra ngược hướng với slide mới
    if (dir > 0) slides[cur].classList.add('is-prev')
    else slides[i].classList.add('is-prev')
    void slides[i].offsetWidth
    slides[i].classList.remove('is-prev')
    ;[slides, arts, dots].forEach((list) => {
      list[cur] && list[cur].classList.remove('is-active')
      list[i] && list[i].classList.add('is-active')
    })
    slides[cur].setAttribute('aria-hidden', 'true'); slides[cur].inert = true
    slides[i].setAttribute('aria-hidden', 'false'); slides[i].inert = false
    cur = i
  }
  // Máy tính chỉ có 1 banner cố định; chuyển cảnh chỉ chạy trên điện thoại
  const mobile = window.matchMedia('(max-width:720px)')
  const stop = () => { clearInterval(timer); timer = null }
  const play = () => {
    stop()
    if (!mobile.matches) { go(0); return }
    if (!reduce && !hovering && !document.hidden && slides.length > 1) timer = setInterval(() => go(cur + 1), 5000)
  }
  mobile.addEventListener ? mobile.addEventListener('change', play) : mobile.addListener(play)
  hero.querySelector('[data-hero-prev]')?.addEventListener('click', () => { go(cur - 1); play() })
  hero.querySelector('[data-hero-next]')?.addEventListener('click', () => { go(cur + 1); play() })
  dots.forEach((d) => d.addEventListener('click', () => { go(Number(d.dataset.heroDot)); play() }))
  if (window.matchMedia('(hover: hover)').matches) {
    hero.addEventListener('mouseenter', () => { hovering = true; stop() })
    hero.addEventListener('mouseleave', () => { hovering = false; play() })
  }
  hero.addEventListener('focusin', () => { hovering = true; stop() })
  hero.addEventListener('focusout', () => { hovering = false; play() })
  document.addEventListener('visibilitychange', play)
  // Vuốt ngang trên điện thoại (bỏ qua khi đang chạm vào ô tìm kiếm)
  let x0 = null, y0 = null
  hero.addEventListener('touchstart', (e) => {
    if (e.target.closest('form')) return
    x0 = e.touches[0].clientX; y0 = e.touches[0].clientY
  }, { passive: true })
  hero.addEventListener('touchend', (e) => {
    if (x0 == null) return
    const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0
    x0 = null
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2) { go(cur + (dx < 0 ? 1 : -1)); play() }
  }, { passive: true })
  play()
}

// Khung tìm: đổi tab Tên/mã – Số khung; gõ đủ 17 ký tự số khung vào ô tên/mã thì tự tra số khung
document.querySelectorAll('.sp-tabs').forEach((tabs) => {
  const panel = tabs.closest('.search-panel')
  const show = (key, focus) => {
    tabs.querySelectorAll('.sp-tab').forEach((t) => {
      const on = t.dataset.spTab === key
      t.classList.toggle('is-active', on)
      t.setAttribute('aria-selected', String(on))
    })
    panel.querySelectorAll('[data-sp-form]').forEach((f) => (f.hidden = f.dataset.spForm !== key))
    if (focus) panel.querySelector(`[data-sp-form="${key}"] input`).focus()
  }
  tabs.addEventListener('click', (e) => {
    const t = e.target.closest('.sp-tab')
    if (t) show(t.dataset.spTab, true)
  })
  const qForm = panel.querySelector('[data-sp-form="q"]')
  const vinTab = tabs.querySelector('[data-sp-tab="vin"]')
  qForm && qForm.addEventListener('submit', (e) => {
    const v = qForm.q.value.trim()
    const vinOn = vinTab && getComputedStyle(tabs).display !== 'none' && getComputedStyle(vinTab).display !== 'none'
    if (vinOn && /^[A-HJ-NPR-Z0-9]{17}$/i.test(v)) {
      e.preventDefault()
      location.href = '/tra-vin?vin=' + encodeURIComponent(v.toUpperCase())
    }
  })
})

// Dải sản phẩm: 4 thẻ mỗi trang; nút ‹ ›, chấm, vuốt tay (scroll-snap). Không tự chuyển trang, khách tự lướt
document.querySelectorAll('[data-pslider]').forEach((sl) => {
  const track = sl.querySelector('.pslider-track')
  const pages = [...track.children]
  const dots = [...sl.querySelectorAll('.pslider-dot')]
  if (pages.length < 2) return
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  let cur = 0
  const mark = () => dots.forEach((d, k) => d.classList.toggle('is-active', k === cur))
  const go = (i) => {
    cur = (i + pages.length) % pages.length
    track.scrollTo({ left: pages[cur].offsetLeft, behavior: reduce ? 'auto' : 'smooth' })
    mark()
  }
  // Vuốt tay: cập nhật chấm theo trang đang hiện
  let t
  track.addEventListener('scroll', () => {
    clearTimeout(t)
    t = setTimeout(() => {
      const i = Math.round(track.scrollLeft / track.clientWidth)
      if (i !== cur) { cur = i; mark() }
    }, 80)
  }, { passive: true })
  sl.querySelector('[data-ps-prev]').addEventListener('click', () => go(cur - 1))
  sl.querySelector('[data-ps-next]').addEventListener('click', () => go(cur + 1))
  dots.forEach((d) => d.addEventListener('click', () => go(Number(d.dataset.psDot))))
})

// Nút kính lúp đầu trang / "Tìm phụ tùng ngay": cuộn tới khung tìm kiếm và mở bàn phím
document.querySelectorAll('[data-focus-search]').forEach((a) => a.addEventListener('click', (e) => {
  const panel = document.getElementById('tim-theo-xe')
  const input = panel && panel.querySelector('[data-sp-form]:not([hidden]) input')
  if (!input) return
  e.preventDefault()
  if (document.body.classList.contains('drawer-open')) setDrawer(false)
  panel.scrollIntoView({ behavior: 'smooth', block: 'start' })
  setTimeout(() => input.focus({ preventScroll: true }), 500)
}))

// Chân trang: điện thoại thu gọn nhóm link, máy tính luôn mở
const footMq = window.matchMedia('(max-width: 720px)')
const syncFooter = () => document.querySelectorAll('.f-group').forEach((d) => { d.open = !footMq.matches })
syncFooter()
footMq.addEventListener('change', syncFooter)

// Nút giỏ hàng cạnh giá trên thẻ sản phẩm. Trên link chạy thử khi giỏ hàng chưa mở thì báo ngày mở
function toast(msg) {
  let el = document.getElementById('toast')
  if (!el) { el = document.createElement('div'); el.id = 'toast'; el.setAttribute('role', 'status'); document.body.appendChild(el) }
  el.textContent = msg
  el.classList.add('show')
  clearTimeout(el._t)
  el._t = setTimeout(() => el.classList.remove('show'), 2600)
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-cart]')
  if (!b) return
  if (document.body.classList.contains('hide-cart')) { toast('Giỏ hàng sẽ mở trên link chạy thử ngày 11/12'); return }
  cart.add({ id: Number(b.dataset.cart), name: b.dataset.name, label: '', price: Number(b.dataset.price), qty: 1 })
  b.classList.add('added')
  toast('Đã thêm vào giỏ hàng')
  setTimeout(() => b.classList.remove('added'), 1200)
})
