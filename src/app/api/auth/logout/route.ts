import { NextRequest, NextResponse } from "next/server";
import {
  clearSessionCookie,
  revokeSessionByToken,
  SESSION_COOKIE_NAME,
} from "@/lib/server/auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

    if (token) {
      await revokeSessionByToken(token);
    }

    const response = NextResponse.json({ ok: true });
    clearSessionCookie(response);
    return response;
  } catch (error) {
    const response = NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "로그아웃 처리 중 오류가 발생했습니다.",
      },
      { status: 500 },
    );

    clearSessionCookie(response);
    return response;
  }
}

