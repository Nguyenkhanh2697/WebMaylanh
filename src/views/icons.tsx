// Biểu tượng vẽ bằng SVG (không tải ảnh ngoài, nhẹ và sắc nét trên mọi màn hình)
import type { FC } from 'hono/jsx'

type P = { size?: number; class?: string }
const S: FC<P & { children?: any; vb?: string }> = ({ size = 20, class: cls, children, vb = '0 0 24 24' }) => (
  <svg width={size} height={size} viewBox={vb} fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class={cls} aria-hidden="true">
    {children}
  </svg>
)

export const IconSnow: FC<P> = (p) => (
  <S {...p}><path d="M12 2v20M4.9 6.5l14.2 11M4.9 17.5l14.2-11M9 3.5l3 2.5 3-2.5M9 20.5l3-2.5 3 2.5M3 9.5l3.6.6-1.2 3.4M21 14.5l-3.6-.6 1.2-3.4M3 14.5l3.6-.6-1.2-3.4M21 9.5l-3.6.6 1.2 3.4" /></S>
)
export const IconCar: FC<P> = (p) => (
  <S {...p}><path d="M5 16h14M3 16v-3l2-5a2 2 0 0 1 1.9-1.3h10.2A2 2 0 0 1 19 8l2 5v3M6.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM17.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM4 12h16" /></S>
)
export const IconPhone: FC<P> = (p) => (
  <S {...p}><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" /></S>
)
export const IconCart: FC<P> = (p) => (
  <S {...p}><path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6.2M10 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM18 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" /></S>
)
export const IconSearch: FC<P> = (p) => (
  <S {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></S>
)
export const IconFilter: FC<P> = (p) => (
  <S {...p}><path d="M3 5h18l-7 8v6l-4-2v-4z" /></S>
)
export const IconBarcode: FC<P> = (p) => (
  <S {...p}><path d="M4 5v14M7 5v14M10 5v14M14 5v14M17 5v14M20 5v14" /></S>
)
export const IconCheck: FC<P> = (p) => (
  <S {...p}><circle cx="12" cy="12" r="9" fill="currentColor" stroke="none" /><path d="m8 12 3 3 5-6" stroke="#fff" /></S>
)
export const IconArrow: FC<P> = (p) => (
  <S {...p}><path d="M5 12h14M13 6l6 6-6 6" /></S>
)
export const IconChevron: FC<P> = (p) => (
  <S {...p}><circle cx="12" cy="12" r="9" fill="currentColor" stroke="none" /><path d="m10.5 8.5 3.5 3.5-3.5 3.5" stroke="#fff" /></S>
)
export const IconRefresh: FC<P> = (p) => (
  <S {...p}><path d="M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6" /></S>
)
export const IconEngine: FC<P> = (p) => (
  <S {...p}><path d="M4 10h2V8h4V6h4v2h3l2 3h1v5h-1l-2 3H9l-3-3H4z" /></S>
)
export const IconTag: FC<P> = (p) => (
  <S {...p}><path d="M3 12V4h8l10 10-8 8z" /><circle cx="7.5" cy="8.5" r="1.3" /></S>
)
export const IconCalendar: FC<P> = (p) => (
  <S {...p}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></S>
)
export const IconShield: FC<P> = (p) => (
  <S {...p}><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z" /><path d="M12 7v10" /></S>
)
export const IconUser: FC<P> = (p) => (
  <S {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4.5 4.5-6 8-6s7 1.5 8 6" /></S>
)
export const IconTruck: FC<P> = (p) => (
  <S {...p}><path d="M2 6h12v10H2zM14 10h4l3 3v3h-7M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" /></S>
)
export const IconBadge: FC<P> = (p) => (
  <S {...p}><circle cx="12" cy="9" r="6" /><path d="m9 14-2 7 5-3 5 3-2-7M10 9l1.5 1.5L14.5 7.5" /></S>
)
export const IconMail: FC<P> = (p) => (
  <S {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></S>
)
export const IconPin: FC<P> = (p) => (
  <S {...p}><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></S>
)
export const IconGrid: FC<P> = (p) => (
  <S {...p}><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></S>
)
export const IconWrench: FC<P> = (p) => (
  <S {...p}><path d="M14.5 6.5a4 4 0 0 0 5 5L12 19a2.1 2.1 0 0 1-3-3l7.5-7.5a4 4 0 0 0-2-2z" /></S>
)

// Biểu tượng 5 danh mục chính, vẽ theo kiểu minh hoạ có màu
export const PartCompressor: FC<P> = ({ size = 64 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
    <rect x="10" y="20" width="44" height="26" rx="10" fill="#e3f3e9" stroke="#1f5130" stroke-width="2.5" />
    <rect x="22" y="26" width="16" height="10" rx="2" fill="#3aa36a" />
    <circle cx="10" cy="33" r="8" fill="#fff" stroke="#1f5130" stroke-width="2.5" />
    <circle cx="10" cy="33" r="3" fill="#1f5130" />
    <rect x="44" y="14" width="6" height="8" rx="1.5" fill="#fff" stroke="#1f5130" stroke-width="2" />
    <path d="M18 46v4M46 46v4" stroke="#1f5130" stroke-width="2.5" stroke-linecap="round" />
  </svg>
)
export const PartCondenser: FC<P> = ({ size = 64 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
    <rect x="10" y="12" width="40" height="40" rx="3" fill="#eef7f1" stroke="#1f5130" stroke-width="2.5" />
    {[18, 23, 28, 33, 38, 43].map((y) => <path d={`M14 ${y}h32`} stroke="#7aa38a" stroke-width="2" />)}
    <rect x="50" y="16" width="5" height="32" rx="2" fill="#fff" stroke="#1f5130" stroke-width="2" />
  </svg>
)
export const PartEvaporator: FC<P> = ({ size = 64 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
    <rect x="16" y="16" width="36" height="32" rx="3" fill="#eef7f1" stroke="#1f5130" stroke-width="2.5" />
    {[22, 27, 32, 37, 42, 47].map((x) => <path d={`M${x} 20v24`} stroke="#7aa38a" stroke-width="2" />)}
    <path d="M8 24h8M8 32h8M12 20v16" stroke="#1f5130" stroke-width="2.5" stroke-linecap="round" />
  </svg>
)
export const PartFan: FC<P> = ({ size = 64 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
    <rect x="10" y="10" width="44" height="44" rx="4" fill="#fff" stroke="#1f5130" stroke-width="2.5" />
    <circle cx="32" cy="32" r="18" fill="none" stroke="#1f5130" stroke-width="2" />
    {[0, 90, 180, 270].map((a) => (
      <path d="M32 32c2-8 8-12 12-10-1 6-6 10-12 10z" fill="#1f5130" transform={`rotate(${a} 32 32)`} />
    ))}
    <circle cx="32" cy="32" r="3.5" fill="#3aa36a" />
  </svg>
)
export const PartBlower: FC<P> = ({ size = 64 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
    <circle cx="32" cy="32" r="20" fill="#14301d" />
    <circle cx="32" cy="32" r="13" fill="#1f5130" />
    {Array.from({ length: 12 }, (_, i) => (
      <path d="M32 19v5" stroke="#7aa38a" stroke-width="2" transform={`rotate(${i * 30} 32 32)`} />
    ))}
    <circle cx="32" cy="32" r="4" fill="#e3f3e9" />
    <path d="M32 6v6M32 52v6M6 32h6M52 32h6" stroke="#14301d" stroke-width="3" stroke-linecap="round" />
  </svg>
)

// Logo Zalo theo icon ứng dụng: nền xanh #0068FF, bong bóng chat trắng, chữ "Zalo" (đường vẽ từ Simple Icons, CC0)
export const IconZalo: FC<{ size?: number }> = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
    <rect width="48" height="48" rx="12" fill="#0068ff" />
    <path d="M24 9.5c-9.9 0-17.5 6.1-17.5 13.6 0 4.3 2.5 8.1 6.5 10.6-.3 2-1.3 3.8-2.8 5.1 3.2.1 5.9-.9 8-2.5 1.9.5 3.8.7 5.8.7 9.9 0 17.5-6.1 17.5-13.9S33.9 9.5 24 9.5z" fill="#fff" />
    <g transform="translate(11.5 11.2) scale(1.04)" fill="#0068ff">
      <path d="M12.49 10.2722v-.4496h1.3467v6.3218h-.7704a.576.576 0 01-.5763-.5729l-.0006.0005a3.273 3.273 0 01-1.9372.6321c-1.8138 0-3.2844-1.4697-3.2844-3.2823 0-1.8125 1.4706-3.2822 3.2844-3.2822a3.273 3.273 0 011.9372.6321l.0006.0005zM6.9188 7.7896v.205c0 .3823-.051.6944-.2995 1.0605l-.03.0343c-.0542.0615-.1815.206-.2421.2843L2.024 14.8h4.8948v.7682a.5764.5764 0 01-.5767.5761H0v-.3622c0-.4436.1102-.6414.2495-.8476L4.8582 9.23H.1922V7.7896h6.7266zm8.5513 8.3548a.4805.4805 0 01-.4803-.4798v-7.875h1.4416v8.3548H15.47zM20.6934 9.6C22.52 9.6 24 11.0807 24 12.9044c0 1.8252-1.4801 3.306-3.3066 3.306-1.8264 0-3.3066-1.4808-3.3066-3.306 0-1.8237 1.4802-3.3044 3.3066-3.3044zm-10.1412 5.253c1.0675 0 1.9324-.8645 1.9324-1.9312 0-1.065-.865-1.9295-1.9324-1.9295s-1.9324.8644-1.9324 1.9295c0 1.0667.865 1.9312 1.9324 1.9312zm10.1412-.0033c1.0737 0 1.945-.8707 1.945-1.9453 0-1.073-.8713-1.9436-1.945-1.9436-1.0753 0-1.945.8706-1.945 1.9436 0 1.0746.8697 1.9453 1.945 1.9453z" />
    </g>
  </svg>
)
export const IconFacebook: FC<{ size?: number }> = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="12" fill="#1877f2" />
    <path d="M13.2 19v-6h2l.3-2.4h-2.3V9.2c0-.7.2-1.2 1.2-1.2h1.2V5.9c-.2 0-.9-.1-1.8-.1-1.8 0-3 1.1-3 3.1v1.7H8.8V13h2V19z" fill="#fff" />
  </svg>
)
export const IconYoutube: FC<{ size?: number }> = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="12" fill="#ff0000" />
    <path d="M10 8.8v6.4l5.4-3.2z" fill="#fff" />
  </svg>
)

// Biểu tượng trang quản trị
export const IconDashboard: FC<P> = (p) => (
  <S {...p}><rect x="3" y="3" width="8" height="10" rx="2" /><rect x="13" y="3" width="8" height="6" rx="2" /><rect x="13" y="11" width="8" height="10" rx="2" /><rect x="3" y="15" width="8" height="6" rx="2" /></S>
)
export const IconReceipt: FC<P> = (p) => (
  <S {...p}><path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6M9 16h3" /></S>
)
export const IconChat: FC<P> = (p) => (
  <S {...p}><path d="M4 5h16v11H9l-5 4zM8 9h8M8 12h5" /></S>
)
export const IconBox: FC<P> = (p) => (
  <S {...p}><path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5zM3 7.5l9 4.5 9-4.5M12 12v9" /></S>
)
export const IconSort: FC<P> = (p) => (
  <S {...p}><path d="M7 4v16M3.5 7.5 7 4l3.5 3.5M17 20V4M13.5 16.5 17 20l3.5-3.5" /></S>
)
export const IconUpload: FC<P> = (p) => (
  <S {...p}><path d="M12 16V4M7.5 8.5 12 4l4.5 4.5M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" /></S>
)
export const IconImage: FC<P> = (p) => (
  <S {...p}><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="m3 17 5-4 4 3 3-2 6 4" /></S>
)
export const IconLogout: FC<P> = (p) => (
  <S {...p}><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h10" /></S>
)
export const IconExternal: FC<P> = (p) => (
  <S {...p}><path d="M14 4h6v6M20 4l-9 9M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" /></S>
)
export const IconMenu: FC<P> = (p) => (
  <S {...p}><path d="M4 7h16M4 12h16M4 17h16" /></S>
)
export const IconClock: FC<P> = (p) => (
  <S {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></S>
)
export const IconMoney: FC<P> = (p) => (
  <S {...p}><rect x="2.5" y="6" width="19" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /><path d="M6 9.5v5M18 9.5v5" /></S>
)
export const IconChart: FC<P> = (p) => (
  <S {...p}><path d="M4 20V4M4 20h16M8 16v-4M12 16V8M16 16v-6" /></S>
)
export const IconDatabase: FC<P> = (p) => (
  <S {...p}><ellipse cx="12" cy="6" rx="7" ry="3" /><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" /></S>
)
export const IconRocket: FC<P> = (p) => (
  <S {...p}><path d="M14 4c3 0 6 3 6 6l-7 7-6-6zM7 11l-3 1 2 2M13 17l-1 3-2-2M15 9h.01" /></S>
)
