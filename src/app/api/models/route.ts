import { NextRequest, NextResponse } from "next/server";
import {
  getUserFromSessionToken,
  hasRoleAccess,
  SESSION_COOKIE_NAME,
} from "@/lib/server/auth";
import { getLocalModelEndpoint, listLocalModels } from "@/lib/lmstudio";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const user = await getUserFromSessionToken(token);

    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    if (!hasRoleAccess(user.role, ["admin", "interviewee"])) {
      return NextResponse.json(
        { error: "모델 조회 권한이 없는 계정입니다." },
        { status: 403 },
      );
    }

    const models = await listLocalModels();

    return NextResponse.json({
      models,
      endpoint: getLocalModelEndpoint(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to reach LM Studio.";

    return NextResponse.json(
      {
        models: [],
        endpoint: getLocalModelEndpoint(),
        error: message,
      },
      { status: 502 },
    );
  }
}
