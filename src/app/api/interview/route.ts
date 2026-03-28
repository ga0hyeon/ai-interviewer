import { NextResponse } from "next/server";
import {
  buildInterviewSystemPrompt,
  buildKickoffPrompt,
  type InterviewConfig,
  type InterviewMessage,
} from "@/lib/interview";
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

export async function POST(request: Request) {
  try {
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
