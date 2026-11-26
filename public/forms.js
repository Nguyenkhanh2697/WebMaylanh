// Kiểm tra form thân thiện + màn hình chờ hình quạt dàn nóng.
// Dùng chung cho trang khách và trang quản trị (nạp trước app.js).
// - Lỗi hiện ngay dưới từng ô, ô viền đỏ; sửa đúng là lỗi tự biến mất
// - window.FormCheck.validate(form) / .show(el, msg) / .clear(el)
// - window.Loader.show(text, sub, delayMs) / .hide()
;(() => {
  // ---------- Màn hình chờ ----------
  const FAN = '<svg class="ld-fan" viewBox="0 0 120 120" aria-hidden="true">' +
    '<circle class="ld-ring" cx="60" cy="60" r="54"/>' +
    '<circle class="ld-flow" cx="60" cy="60" r="54"/>' +
    '<circle class="ld-shroud" cx="60" cy="60" r="44"/>' +
    // Khung đỡ mô tơ (đứng yên) phía sau cánh
    '<g class="ld-strut">' + [30, 150, 270].map((a) => `<rect transform="rotate(${a} 60 60)" x="58.5" y="17" width="3" height="43" rx="1.5"/>`).join('') + '</g>' +
    '<g class="ld-blades">' +
    [0, 51.43, 102.86, 154.29, 205.71, 257.14, 308.57].map((a) => `<path transform="rotate(${a} 60 60)" d="M60 60 C55 48 57 30 70 19 C80 23 84 31 82 38 C76 46 68 54 60 60 Z"/>`).join('') +
    '</g>' +
    '<circle class="ld-hub" cx="60" cy="60" r="11"/>' +
    '<g class="ld-snow" stroke-linecap="round"><path d="M60 53v14M54 56.5l12 7M54 63.5l12-7"/></g>' +
    '</svg>'
  let box, timer
  function ensure() {
    if (box) return box
    box = document.createElement('div')
    box.className = 'loader'
    box.setAttribute('role', 'status')
    box.setAttribute('aria-live', 'polite')
    box.innerHTML = `<div class="ld-card">${FAN}<p class="ld-text"></p><small class="ld-sub"></small></div>`
    document.body.appendChild(box)
    return box
  }
  const Loader = {
    show(text = 'Đang tải…', sub = 'Vui lòng chờ trong giây lát', delay = 0) {
      clearTimeout(timer)
      const run = () => {
        const b = ensure()
        b.querySelector('.ld-text').textContent = text
        b.querySelector('.ld-sub').textContent = sub
        b.classList.add('show')
        document.documentElement.classList.add('is-busy')
      }
      delay ? (timer = setTimeout(run, delay)) : run()
    },
    hide() {
      clearTimeout(timer)
      if (box) box.classList.remove('show')
      document.documentElement.classList.remove('is-busy')
    },
  }
  window.Loader = Loader
  // Quay lại bằng nút Back: tắt màn hình chờ còn sót
  window.addEventListener('pageshow', () => Loader.hide())

  // ---------- Kiểm tra từng ô ----------
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)
  function labelOf(el) {
    if (el.dataset.label) return el.dataset.label
    const span = el.closest('.f-row')?.querySelector(':scope > span')
    const t = span ? span.cloneNode(true) : null
    if (t) { t.querySelectorAll('i,em').forEach((x) => x.remove()); return t.textContent.trim().toLowerCase() }
    return (el.getAttribute('aria-label') || el.placeholder || 'thông tin này').replace(/\(.*\)|…|\.+$/g, '').trim().toLowerCase()
  }
  const isPhone = (el) => el.name === 'phone' || el.type === 'tel' || el.inputMode === 'tel'

  function rule(el) {
    if (el.disabled || el.type === 'hidden' || el.type === 'checkbox' || el.type === 'radio' || el.type === 'submit') return ''
    if (el.type === 'file') return el.required && !el.files.length ? `Vui lòng chọn ${labelOf(el)}.` : ''
    const v = el.value.trim()
    if (!v) return el.required ? `Vui lòng nhập ${labelOf(el)}.` : ''
    if (isPhone(el)) {
      const d = v.replace(/[\s.\-()]/g, '').replace(/^\+?84/, '0')
      if (/[^\d]/.test(d)) return 'Số điện thoại chỉ gồm chữ số. Ví dụ: 0912345678.'
      if (!d.startsWith('0')) return 'Số điện thoại bắt đầu bằng số 0. Ví dụ: 0912345678.'
      if (d.length < 10) return `Số điện thoại cần 10 chữ số, bạn mới nhập ${d.length} số.`
      if (d.length > 11) return `Số điện thoại dài quá (${d.length} số). Bạn kiểm tra lại giúp nhé.`
    }
    if (el.name === 'vin') {
      const s = v.toUpperCase().replace(/[\s]/g, '')
      if (/[^A-Z0-9-]/.test(s)) return 'Số khung chỉ gồm chữ và số. Bạn kiểm tra lại giúp nhé.'
      if (s.replace(/-/g, '').length < 6) return 'Số khung ngắn quá. Nhập đủ 17 ký tự trên giấy đăng ký xe.'
      if (s.length === 17 && /[IOQ]/.test(s)) return 'Số khung 17 ký tự không có chữ I, O, Q (dễ nhầm với số 1 và 0). Bạn kiểm tra lại giúp nhé.'
    }
    if (el.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return 'Email chưa đúng. Ví dụ: ten@gmail.com.'
    if (el.minLength > 0 && v.length < el.minLength) return `${cap(labelOf(el))} cần ít nhất ${el.minLength} ký tự, bạn đang nhập ${v.length}.`
    if (el.type === 'number' && v) {
      const n = Number(v)
      if (el.min !== '' && n < Number(el.min)) return `Nhỏ nhất là ${el.min}.`
      if (el.max !== '' && n > Number(el.max)) return `Lớn nhất là ${el.max}.`
    }
    return ''
  }

  let seq = 0
  // Ô nằm trong khung có icon (ô số khung) thì báo lỗi dưới cả khung
  const anchorOf = (el) => el.closest('.input-icon') || el
  // Lỗi có sẵn từ máy chủ (vd. sai mật khẩu) nằm ngay sau ô: dùng lại
  const errOf = (el) => { const n = anchorOf(el).nextElementSibling; return el._err || (n && n.classList.contains('f-err') ? n : null) }
  function show(el, msg) {
    const a = anchorOf(el)
    let m = errOf(el)
    if (!m) {
      m = document.createElement('small')
      m.className = 'f-err'
      m.id = 'ferr-' + ++seq
      m.setAttribute('role', 'alert')
      a.insertAdjacentElement('afterend', m)
    }
    el._err = m
    if (!m.id) m.id = 'ferr-' + ++seq
    m.innerHTML = '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><circle cx="8" cy="8" r="7" fill="currentColor"/><path d="M8 4.5v4.2M8 11.2v.3" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/></svg>'
    m.appendChild(document.createTextNode(msg))
    el.classList.add('is-invalid')
    a.classList.add('is-invalid')
    el.setAttribute('aria-invalid', 'true')
    el.setAttribute('aria-describedby', m.id)
  }
  function clear(el) {
    const m = errOf(el)
    if (m) m.remove()
    el._err = null
    el.classList.remove('is-invalid')
    anchorOf(el).classList.remove('is-invalid')
    el.removeAttribute('aria-invalid')
    el.removeAttribute('aria-describedby')
  }
  const fieldsOf = (form) => [...form.querySelectorAll('input, select, textarea')]
  function validate(form) {
    let first = null
    fieldsOf(form).forEach((el) => {
      const msg = rule(el)
      if (msg) { show(el, msg); first = first || el } else clear(el)
    })
    if (first) {
      first.scrollIntoView({ behavior: 'smooth', block: 'center' })
      first.focus({ preventScroll: true })
    }
    return !first
  }
  window.FormCheck = { validate, show, clear, rule }

  // Form cần kiểm tra: có ô bắt buộc, số điện thoại, số khung, email hoặc độ dài tối thiểu
  const needsCheck = (form) => !form.hasAttribute('data-no-check') &&
    form.querySelector('[required], [name=phone], [name=vin], [type=email], [minlength], input[type=number]')
  const init = () => document.querySelectorAll('form').forEach((f) => { if (needsCheck(f)) f.noValidate = true })
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init()

  // Chạy trước mọi xử lý gửi form khác (pha capture): sai thì chặn luôn
  document.addEventListener('submit', (e) => {
    const f = e.target
    if (!(f instanceof HTMLFormElement) || !needsCheck(f)) return
    if (!validate(f)) { e.preventDefault(); e.stopImmediatePropagation() }
  }, true)

  // Đang sửa ô bị đỏ: đúng là bỏ đỏ ngay. Rời ô đã gõ sai định dạng: báo luôn
  const live = (e) => {
    const el = e.target
    if (!el.matches?.('input, select, textarea')) return
    if (el.classList.contains('is-invalid')) { const msg = rule(el); msg ? show(el, msg) : clear(el) }
  }
  document.addEventListener('input', live)
  document.addEventListener('change', live)
  document.addEventListener('focusout', (e) => {
    const el = e.target
    if (!el.matches?.('input, textarea') || !el.value.trim() || !el.form || !needsCheck(el.form)) return
    const msg = rule(el)
    msg ? show(el, msg) : clear(el)
  })

  // Gửi form hợp lệ: hiện màn hình chờ (tìm kiếm chờ 0,35 giây mới hiện để khỏi nháy khi trang tải nhanh)
  document.addEventListener('submit', (e) => {
    const f = e.target
    if (!(f instanceof HTMLFormElement) || e.defaultPrevented || f.dataset.loader === 'off') return
    const post = f.method.toLowerCase() === 'post'
    const action = f.getAttribute('action') || ''
    const text = f.dataset.loader || (action.includes('tra-vin') ? 'Đang tra số khung…' : post ? 'Đang gửi…' : 'Đang tìm phụ tùng…')
    Loader.show(text, post ? 'Vui lòng chờ trong giây lát' : 'Đang lọc đúng phụ tùng cho xe của bạn', post ? 0 : 350)
  })
})()
