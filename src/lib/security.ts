import crypto from 'crypto';
import { getTursoCache, setTursoCache, deleteTursoCache } from '@/lib/turso';

// ---------------------------------------------------------------------------
// MECANISMOS ANTI-INVASÃO, CRIPTOGRAFIA & SESSÕES (OWASP HARDENING)
// ---------------------------------------------------------------------------

const JWT_SECRET = process.env.JWT_SECRET || 'plugue-super-secret-jwt-key-2026-production-school-os';
const JWT_ACCESS_EXPIRY_MS = 15 * 60 * 1000; // 15 minutos (expiração curta)
const JWT_REFRESH_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

// ---------------------------------------------------------------------------
// CRIPTOGRAFIA DE SENHAS (PBKDF2 com Salt Rounds >= 10 / 100.000 iterações SHA-512)
// ---------------------------------------------------------------------------
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `pbkdf2$100000$${salt}$${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash) return false;

  // 1. Suporte a senhas simples legadas / sementes (ex: 'admin123', CPF)
  if (password === storedHash) return true;

  // 2. Suporte a hashes SHA-256 legados (64 caracteres hexadecimais)
  if (storedHash.length === 64 && /^[0-9a-f]{64}$/i.test(storedHash)) {
    const sha256 = crypto.createHash('sha256').update(password).digest('hex');
    if (sha256.toLowerCase() === storedHash.toLowerCase()) return true;
  }

  // 3. Suporte a PBKDF2 com Salt Rounds (padrão de alta segurança da plataforma)
  if (!storedHash.startsWith('pbkdf2$')) {
    return false;
  }

  const parts = storedHash.split('$');
  if (parts.length !== 4) return false;

  const iterations = parseInt(parts[1], 10);
  const salt = parts[2];
  const originalHash = parts[3];

  const calculatedHash = crypto.pbkdf2Sync(password, salt, iterations, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(calculatedHash), Buffer.from(originalHash));
}

export const bcrypt = {
  hash: async (password: string, _rounds: number = 10): Promise<string> => hashPassword(password),
  compare: async (password: string, hash: string): Promise<boolean> => verifyPassword(password, hash),
  hashSync: (password: string, _rounds: number = 10): string => hashPassword(password),
  compareSync: (password: string, hash: string): boolean => verifyPassword(password, hash),
};

// ---------------------------------------------------------------------------
// TOKENS JWT (RFC 7519 Puro com HMAC-SHA256)
// ---------------------------------------------------------------------------
interface JwtHeader {
  alg: 'HS256';
  typ: 'JWT';
}

export interface JwtPayload {
  userId: string;
  name: string;
  email?: string;
  role: 'admin' | 'direcao' | 'professor';
  cpf: string;
  exp: number; // unix timestamp em segundos
  iat: number;
  type: 'access' | 'refresh';
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

export function generateAccessToken(user: { id: string; name: string; email?: string; role: 'admin' | 'direcao' | 'professor'; cpf: string }): string {
  const header: JwtHeader = { alg: 'HS256', typ: 'JWT' };
  const nowSec = Math.floor(Date.now() / 1000);
  const payload: JwtPayload = {
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    cpf: user.cpf,
    iat: nowSec,
    exp: nowSec + Math.floor(JWT_ACCESS_EXPIRY_MS / 1000),
    type: 'access',
  };

  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${headerB64}.${payloadB64}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${headerB64}.${payloadB64}.${signature}`;
}

export function generateRefreshToken(user: { id: string; name: string; email?: string; role: 'admin' | 'direcao' | 'professor'; cpf: string }): string {
  const header: JwtHeader = { alg: 'HS256', typ: 'JWT' };
  const nowSec = Math.floor(Date.now() / 1000);
  const payload: JwtPayload = {
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    cpf: user.cpf,
    iat: nowSec,
    exp: nowSec + Math.floor(JWT_REFRESH_EXPIRY_MS / 1000),
    type: 'refresh',
  };

  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${headerB64}.${payloadB64}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${headerB64}.${payloadB64}.${signature}`;
}

export function verifyJwt(token: string): JwtPayload | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [headerB64, payloadB64, signature] = parts;
  const expectedSignature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${headerB64}.${payloadB64}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  if (signature !== expectedSignature) {
    return null;
  }

  try {
    const payload: JwtPayload = JSON.parse(base64UrlDecode(payloadB64));
    const nowSec = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < nowSec) {
      return null; // Expirado
    }
    return payload;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// RATE LIMITING ANTI-BRUTE FORCE DISTRIBUÍDO NO TURSO (ADEQUAÇÃO SERVERLESS)
// ---------------------------------------------------------------------------
interface RateLimitRecord {
  attempts: number;
  blockedUntil?: number;
}

const memoryRateLimitStore: Map<string, RateLimitRecord> = new Map();
const MAX_FAILED_ATTEMPTS = 5;
const BLOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutos de bloqueio

function getRateLimitCacheKey(ip: string): string {
  return `rate_limit_login_${ip.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
}

export async function checkRateLimit(ip: string): Promise<{ allowed: boolean; remainingAttempts: number; retryAfterSeconds?: number }> {
  const now = Date.now();
  const cacheKey = getRateLimitCacheKey(ip);

  // 1. Tenta carregar do Turso Cache
  let record: RateLimitRecord | null = null;
  try {
    record = await getTursoCache<RateLimitRecord>(cacheKey);
  } catch {}

  // 2. Fallback para memória local
  if (!record) {
    record = memoryRateLimitStore.get(ip) || null;
  }

  if (!record) {
    return { allowed: true, remainingAttempts: MAX_FAILED_ATTEMPTS };
  }

  if (record.blockedUntil && record.blockedUntil > now) {
    const retryAfterSeconds = Math.ceil((record.blockedUntil - now) / 1000);
    return { allowed: false, remainingAttempts: 0, retryAfterSeconds };
  }

  // Se o período de bloqueio expirou, limpa
  if (record.blockedUntil && record.blockedUntil <= now) {
    memoryRateLimitStore.delete(ip);
    deleteTursoCache(cacheKey).catch(() => {});
    return { allowed: true, remainingAttempts: MAX_FAILED_ATTEMPTS };
  }

  const remaining = Math.max(0, MAX_FAILED_ATTEMPTS - record.attempts);
  return { allowed: remaining > 0, remainingAttempts: remaining };
}

export async function registerFailedLogin(ip: string): Promise<{ remainingAttempts: number; isBlocked: boolean; retryAfterSeconds?: number }> {
  const now = Date.now();
  const cacheKey = getRateLimitCacheKey(ip);

  let record: RateLimitRecord | null = null;
  try {
    record = await getTursoCache<RateLimitRecord>(cacheKey);
  } catch {}

  if (!record) {
    record = memoryRateLimitStore.get(ip) || null;
  }

  if (!record || (record.blockedUntil && record.blockedUntil <= now)) {
    record = { attempts: 1 };
  } else {
    record.attempts += 1;
  }

  let isBlocked = false;
  let retryAfterSeconds: number | undefined = undefined;

  if (record.attempts >= MAX_FAILED_ATTEMPTS) {
    record.blockedUntil = now + BLOCK_DURATION_MS;
    isBlocked = true;
    retryAfterSeconds = Math.ceil(BLOCK_DURATION_MS / 1000);
  }

  // Atualiza memória local
  memoryRateLimitStore.set(ip, record);

  // Persiste no Turso Cache com TTL de 15 minutos (900s)
  setTursoCache(cacheKey, record, 900).catch(() => {});

  const remaining = Math.max(0, MAX_FAILED_ATTEMPTS - record.attempts);
  return {
    remainingAttempts: remaining,
    isBlocked,
    retryAfterSeconds,
  };
}

export async function resetFailedLogin(ip: string): Promise<void> {
  const cacheKey = getRateLimitCacheKey(ip);
  memoryRateLimitStore.delete(ip);
  deleteTursoCache(cacheKey).catch(() => {});
}

// ---------------------------------------------------------------------------
// SANITIZAÇÃO DE INPUTS (PREVENÇÃO DE XSS & INJEÇÃO)
// ---------------------------------------------------------------------------
export function sanitizeString(input: unknown): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove tags script
    .replace(/<[^>]+>/g, '') // Remove tags HTML diretas
    .replace(/[;`]/g, '') // Previne caracteres de injeção em comandos
    .replace(/'/g, "''") // Escapa aspas simples
    .trim();
}

export function sanitizeTextarea(input: unknown): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/onerror\s*=/gi, '')
    .replace(/onload\s*=/gi, '')
    .replace(/onclick\s*=/gi, '')
    .trim();
}

// ---------------------------------------------------------------------------
// NORMALIZAÇÃO DE CAMINHOS GOOGLE DRIVE (SEM ACENTOS, SEM CARACTERES ESPECIAIS)
// ---------------------------------------------------------------------------
export function normalizarNomeParaDrive(texto: string): string {
  if (!texto) return 'sem_nome';
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_\s-]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .toLowerCase();
}

export function obterCaminhoEstudanteDrive(nomeEstudante: string): string {
  const normalizado = normalizarNomeParaDrive(nomeEstudante);
  const primeiraLetra = normalizado.charAt(0).toUpperCase() || 'X';
  return `PLUGUE/estudantes/${primeiraLetra}/${normalizado}/`;
}

export function obterCaminhoProfessorDrive(nomeProfessor: string): string {
  const nomeLimpo = (nomeProfessor || 'PROFESSOR').trim().toUpperCase();
  return `FICHA DOS PROFESSORES / ${nomeLimpo}`;
}
