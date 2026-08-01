import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'

const JWT_SECRET = process.env.JWT_SECRET || 'crypto-mining-platform-2026-super-secret-key-change-in-production'
const JWT_EXPIRES_IN = '7d'
const COOKIE_NAME = 'cmip_token'

export interface JwtPayload {
  userId: string
  phone: string
  email?: string | null
  role: string
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload
  } catch {
    return null
  }
}

export async function setAuthCookie(token: string) {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  })
}

export async function clearAuthCookie() {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}

export async function getAuthToken(): Promise<string | undefined> {
  const cookieStore = await cookies()
  return cookieStore.get(COOKIE_NAME)?.value
}

export async function getCurrentUser() {
  const token = await getAuthToken()
  if (!token) return null
  const payload = verifyToken(token)
  if (!payload) return null
  return payload
}

export function generateReferralCode(name: string): string {
  const base = name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase().padEnd(4, 'X')
  const random = Math.random().toString(36).slice(2, 8).toUpperCase()
  return `${base}${random}`
}

/**
 * Normalize a phone number for storage/lookup.
 * Strips everything except digits, so "777 123 456" and "+967 777 123 456" both become "967777123456".
 * Returns the digit-only string.
 */
export function normalizePhone(input: string): string {
  return (input || '').replace(/[^\d]/g, '')
}

/**
 * Validate that a phone number looks reasonable.
 * Accepts 6-15 digits (no leading +, no spaces).
 */
export function isValidPhone(input: string): boolean {
  const digits = normalizePhone(input)
  return /^\d{6,15}$/.test(digits)
}
