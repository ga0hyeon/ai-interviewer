import "server-only";

import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextResponse } from "next/server";
import { getRedisClient } from "@/lib/server/cache";
import { getDbPool } from "@/lib/server/db";

export const APP_ROLES = ["admin", "interviewer", "interviewee"] as const;
export type AppRole = (typeof APP_ROLES)[number];

export type SessionUser = {
  id: number;
  email: string;
  name: string;
  role: AppRole;
};

type UserRow = {
  id: number;
  email: string;
  display_name: string;
  role: string;
  password_hash: string;
};

type SessionRow = {
  id: number;
  email: string;
  display_name: string;
  role: string;
  expires_at: Date;
};

type CachedSessionPayload = {
  user: SessionUser;
  expiresAt: string;
};

export const SESSION_COOKIE_NAME = "aii_session";
export const SESSION_TTL_SECONDS =
  Number(process.env.SESSION_TTL_SECONDS ?? 60 * 60 * 24 * 7) || 60 * 60 * 24 * 7;

const ROLE_HOME_PATH: Record<AppRole, string> = {
  admin: "/admin",
  interviewer: "/interviewer",
  interviewee: "/interviewee",
};

export function isAppRole(role: string): role is AppRole {
  return APP_ROLES.includes(role as AppRole);
}

export function getRoleHomePath(role: AppRole) {
  return ROLE_HOME_PATH[role];
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function hashPassword(password: string, saltHex?: string) {
  const salt = saltHex ? Buffer.from(saltHex, "hex") : randomBytes(16);
  const derived = scryptSync(password, salt, 64);

  return `${salt.toString("hex")}:${derived.toString("hex")}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [saltHex, hashHex] = storedHash.split(":");

  if (!saltHex || !hashHex) {
    return false;
  }

  const expectedHash = Buffer.from(hashHex, "hex");
  const actualHash = scryptSync(password, Buffer.from(saltHex, "hex"), 64);

  if (expectedHash.length !== actualHash.length) {
    return false;
  }

  return timingSafeEqual(expectedHash, actualHash);
}

function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function toSessionUser(row: Pick<UserRow, "id" | "email" | "display_name" | "role">) {
  if (!isAppRole(row.role)) {
    return null;
  }

  return {
    id: row.id,
    email: row.email,
    name: row.display_name,
    role: row.role,
  } satisfies SessionUser;
}

function getCacheKey(tokenHash: string) {
  return `auth:session:${tokenHash}`;
}

async function readCachedSession(tokenHash: string) {
  const redis = await getRedisClient();

  if (!redis) {
    return null;
  }

  try {
    const raw = await redis.get(getCacheKey(tokenHash));

    if (!raw) {
      return null;
    }

    const payload = JSON.parse(raw) as CachedSessionPayload;

    if (new Date(payload.expiresAt).getTime() <= Date.now()) {
      await redis.del(getCacheKey(tokenHash));
      return null;
    }

    return payload.user;
  } catch {
    return null;
  }
}

async function writeCachedSession(tokenHash: string, payload: CachedSessionPayload) {
  const redis = await getRedisClient();

  if (!redis) {
    return;
  }

  const ttlSeconds = Math.max(
    1,
    Math.floor((new Date(payload.expiresAt).getTime() - Date.now()) / 1000),
  );

  try {
    await redis.set(getCacheKey(tokenHash), JSON.stringify(payload), {
      EX: ttlSeconds,
    });
  } catch {
    // no-op: cache is optional
  }
}

export async function clearCachedSession(token: string) {
  const redis = await getRedisClient();

  if (!redis) {
    return;
  }

  try {
    await redis.del(getCacheKey(hashSessionToken(token)));
  } catch {
    // no-op
  }
}

export async function findUserByEmail(email: string) {
  const pool = getDbPool();
  const normalizedEmail = normalizeEmail(email);
  const result = await pool.query<UserRow>(
    `
      SELECT id, email, display_name, role, password_hash
      FROM auth_users
      WHERE email = $1
      LIMIT 1
    `,
    [normalizedEmail],
  );

  const row = result.rows[0];

  if (!row) {
    return null;
  }

  return {
    ...row,
    user: toSessionUser(row),
  };
}

export async function createSessionForUser(user: SessionUser) {
  const pool = getDbPool();
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);

  await pool.query(
    `
      INSERT INTO auth_sessions (session_id, user_id, token_hash, expires_at)
      VALUES ($1, $2, $3, $4)
    `,
    [randomBytes(16).toString("hex"), user.id, tokenHash, expiresAt],
  );

  await writeCachedSession(tokenHash, {
    user,
    expiresAt: expiresAt.toISOString(),
  });

  return { token, expiresAt };
}

export async function revokeSessionByToken(token: string) {
  const pool = getDbPool();
  const tokenHash = hashSessionToken(token);

  await pool.query(
    `
      UPDATE auth_sessions
      SET revoked_at = NOW()
      WHERE token_hash = $1
    `,
    [tokenHash],
  );

  await clearCachedSession(token);
}

export async function getUserFromSessionToken(token: string | null | undefined) {
  if (!token) {
    return null;
  }

  const tokenHash = hashSessionToken(token);
  const cachedUser = await readCachedSession(tokenHash);

  if (cachedUser) {
    return cachedUser;
  }

  const pool = getDbPool();
  const result = await pool.query<SessionRow>(
    `
      SELECT u.id, u.email, u.display_name, u.role, s.expires_at
      FROM auth_sessions s
      JOIN auth_users u ON u.id = s.user_id
      WHERE s.token_hash = $1
      AND s.revoked_at IS NULL
      AND s.expires_at > NOW()
      LIMIT 1
    `,
    [tokenHash],
  );

  const row = result.rows[0];

  if (!row) {
    return null;
  }

  const user = toSessionUser(row);

  if (!user) {
    return null;
  }

  await writeCachedSession(tokenHash, {
    user,
    expiresAt: row.expires_at.toISOString(),
  });

  return user;
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  return getUserFromSessionToken(token);
}

export function setSessionCookie(
  response: NextResponse,
  token: string,
  expiresAt: Date,
) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export function hasRoleAccess(userRole: AppRole, allowedRoles: AppRole[]) {
  return allowedRoles.includes(userRole);
}

export async function requirePageUser(allowedRoles: AppRole[]) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!hasRoleAccess(user.role, allowedRoles)) {
    redirect(getRoleHomePath(user.role));
  }

  return user;
}

