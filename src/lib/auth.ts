// Mật khẩu quản trị băm bằng PBKDF2 (WebCrypto có sẵn trên Workers, không cần thư viện)
const ITER = 100_000

function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function randomSalt(): string {
  const a = new Uint8Array(16)
  crypto.getRandomValues(a)
  return toHex(a.buffer)
}

export async function hashPassword(password: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations: ITER },
    key,
    256,
  )
  return toHex(bits)
}

export async function verifyPassword(password: string, salt: string, hash: string): Promise<boolean> {
  const h = await hashPassword(password, salt)
  if (h.length !== hash.length) return false
  let diff = 0
  for (let i = 0; i < h.length; i++) diff |= h.charCodeAt(i) ^ hash.charCodeAt(i)
  return diff === 0
}
