import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

export const COOKIE_NAME = 'cmh_session'

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(password, passwordHash)
}

function secret(): string {
  const value = process.env.JWT_SECRET
  if (!value || value.length < 16) {
    throw new Error('JWT_SECRET is not configured.')
  }
  return value
}

export function signToken(user: { id: string; role: string }): string {
  return jwt.sign({ sub: user.id, role: user.role }, secret(), { expiresIn: '7d' })
}

export function readToken(token: string): { sub: string; role: string } | null {
  try {
    const payload = jwt.verify(token, secret())
    if (typeof payload === 'string' || !payload.sub) return null
    return { sub: payload.sub, role: String(payload.role ?? '') }
  } catch {
    return null
  }
}

export function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  }
}
