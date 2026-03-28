import { NextRequest, NextResponse } from "next/server";
import { getUserFromSessionToken, SESSION_COOKIE_NAME } from "@/lib/server/auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const user = await getUserFromSessionToken(token);

    if (!user) {
      return NextResponse.json({ error: "인증되지 않은 사용자입니다." }, { status: 401 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "세션 정보를 조회하는 중 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}

