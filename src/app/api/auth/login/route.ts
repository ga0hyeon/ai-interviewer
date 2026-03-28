import { NextRequest, NextResponse } from "next/server";
import {
  createSessionForUser,
  findUserByEmail,
  getRoleHomePath,
  setSessionCookie,
  verifyPassword,
} from "@/lib/server/auth";

export const runtime = "nodejs";

type LoginRequestBody = {
  email?: string;
  password?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as LoginRequestBody;
    const email = body.email?.trim() ?? "";
    const password = body.password ?? "";

    if (!email || !password) {
      return NextResponse.json(
        { error: "이메일과 비밀번호를 모두 입력해주세요." },
        { status: 400 },
      );
    }

    const foundUser = await findUserByEmail(email);

    if (!foundUser?.user || !verifyPassword(password, foundUser.password_hash)) {
      return NextResponse.json(
        { error: "이메일 또는 비밀번호가 일치하지 않습니다." },
        { status: 401 },
      );
    }

    const session = await createSessionForUser(foundUser.user);
    const response = NextResponse.json({
      user: foundUser.user,
      redirectPath: getRoleHomePath(foundUser.user.role),
    });

    setSessionCookie(response, session.token, session.expiresAt);

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "로그인 처리 중 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}

