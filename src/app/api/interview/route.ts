import { NextRequest, NextResponse } from "next/server";
import {
  buildInterviewSystemPrompt,
  buildKickoffPrompt,
  type InterviewConfig,
  type InterviewMessage,
} from "@/lib/interview";
import {
  getUserFromSessionToken,
  hasRoleAccess,
  SESSION_COOKIE_NAME,
} from "@/lib/server/auth";
import { createLocalChatCompletion } from "@/lib/lmstudio";

type InterviewRequestBody = {
  model?: string;
  config?: InterviewConfig;
  transcript?: InterviewMessage[];
};

function isValidConfig(config: InterviewConfig | undefined): config is InterviewConfig {
  return Boolean(
    config &&
      config.role.trim() &&
      config.experience.trim() &&
      config.stack.trim() &&
      config.focus.trim() &&
      config.style.trim(),
  );
}

function isValidTranscript(transcript: InterviewMessage[] | undefined) {
  return Boolean(
    transcript?.every(
      (message) =>
        (message.role === "assistant" || message.role === "user") &&
        typeof message.content === "string" &&
        message.content.trim().length > 0,
    ),
  );
}

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const user = await getUserFromSessionToken(token);

    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    if (!hasRoleAccess(user.role, ["admin", "interviewee"])) {
      return NextResponse.json(
        { error: "인터뷰 실행 권한이 없는 계정입니다." },
        { status: 403 },
      );
    }

    const body = (await request.json()) as InterviewRequestBody;

    if (!body.model?.trim()) {
      return NextResponse.json(
        { error: "A local model must be selected before starting the interview." },
        { status: 400 },
      );
    }

    if (!isValidConfig(body.config)) {
      return NextResponse.json(
        { error: "Interview configuration is incomplete." },
        { status: 400 },
      );
    }

    const transcript = body.transcript ?? [];

    if (!Array.isArray(transcript) || !isValidTranscript(transcript)) {
      return NextResponse.json(
        { error: "Transcript format is invalid." },
        { status: 400 },
      );
    }

    const messages: Array<{
      role: "system" | "assistant" | "user";
      content: string;
    }> = [
      {
        role: "system",
        content: buildInterviewSystemPrompt(body.config),
      },
      ...transcript,
    ];

    if (transcript.length === 0) {
      messages.push({
        role: "user",
        content: buildKickoffPrompt(body.config),
      });
    }

    const reply = await createLocalChatCompletion(messages, body.model);

    return NextResponse.json({ reply });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate interview turn.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
