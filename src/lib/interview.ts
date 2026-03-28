export type InterviewMessageRole = "assistant" | "user";

export type InterviewMessage = {
  role: InterviewMessageRole;
  content: string;
};

export type InterviewConfig = {
  role: string;
  experience: string;
  stack: string;
  focus: string;
  style: string;
};

export const INTERVIEW_STYLES = [
  {
    id: "balanced",
    label: "Balanced",
    description: "실무와 개념을 고르게 묻는 일반 인터뷰",
  },
  {
    id: "technical-deep-dive",
    label: "Technical Deep Dive",
    description: "구현 선택과 트레이드오프를 깊게 파고드는 인터뷰",
  },
  {
    id: "behavioral",
    label: "Behavioral",
    description: "협업, 문제 해결, 회고 중심의 인터뷰",
  },
  {
    id: "pressure-test",
    label: "Pressure Test",
    description: "꼬리 질문과 예외 상황 대응을 집중 점검하는 인터뷰",
  },
] as const;

export function buildInterviewSystemPrompt(config: InterviewConfig) {
  return [
    "You are an experienced technical interviewer running a live mock interview.",
    "Keep the conversation interactive and realistic.",
    `Candidate target role: ${config.role}.`,
    `Candidate experience level: ${config.experience}.`,
    `Primary stack or domain: ${config.stack}.`,
    `Focus areas: ${config.focus}.`,
    `Interview style: ${config.style}.`,
    "Rules:",
    "- Ask one question at a time.",
    "- Keep most questions under 120 words.",
    "- Adapt difficulty based on the candidate's answers.",
    "- Ask follow-up questions when the answer is vague, shallow, or interesting.",
    "- Do not provide the model answer unless the user explicitly asks.",
    "- Stay in interviewer role for the entire conversation.",
    "- If the candidate asks for clarification, answer briefly and continue the interview.",
  ].join("\n");
}

export function buildKickoffPrompt(config: InterviewConfig) {
  return [
    `Start the interview for a ${config.experience} ${config.role}.`,
    `The stack/domain is ${config.stack}.`,
    `The interviewer should emphasize ${config.focus}.`,
    "Introduce the interview in one or two sentences and ask the first question immediately.",
  ].join(" ");
}
