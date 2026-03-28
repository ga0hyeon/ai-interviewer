"use client";

import { useEffect, useMemo, useState } from "react";
import {
  INTERVIEW_STYLES,
  type InterviewConfig,
  type InterviewMessage,
} from "@/lib/interview";

const DEFAULT_CONFIG: InterviewConfig = {
  role: "Frontend Engineer",
  experience: "3-5 years",
  stack: "React, Next.js, TypeScript, accessibility, testing",
  focus: "problem solving, architecture tradeoffs, communication",
  style: "balanced",
};

export default function Home() {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [endpoint, setEndpoint] = useState("http://127.0.0.1:1234/v1");
  const [connectionError, setConnectionError] = useState("");
  const [composer, setComposer] = useState("");
  const [transcript, setTranscript] = useState<InterviewMessage[]>([]);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const canSend = composer.trim().length > 0 && sessionStarted && !isSending;
  const styleLabel = useMemo(
    () =>
      INTERVIEW_STYLES.find((style) => style.id === config.style)?.label ??
      config.style,
    [config.style],
  );

  async function loadModels() {
    setIsLoadingModels(true);
    setConnectionError("");

    try {
      const response = await fetch("/api/models", { cache: "no-store" });
      const payload = (await response.json()) as {
        models?: string[];
        endpoint?: string;
        error?: string;
      };

      setEndpoint(payload.endpoint ?? "http://127.0.0.1:1234/v1");

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to load local models.");
      }

      const nextModels = payload.models ?? [];
      setModels(nextModels);
      setSelectedModel((current) => current || nextModels[0] || "");
    } catch (error) {
      setModels([]);
      setConnectionError(
        error instanceof Error ? error.message : "Unable to load local models.",
      );
    } finally {
      setIsLoadingModels(false);
    }
  }

  useEffect(() => {
    void loadModels();
  }, []);

  async function requestInterviewTurn(nextTranscript: InterviewMessage[]) {
    const response = await fetch("/api/interview", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: selectedModel,
        config,
        transcript: nextTranscript,
      }),
    });

    const payload = (await response.json()) as {
      reply?: string;
      error?: string;
    };

    if (!response.ok || !payload.reply) {
      throw new Error(payload.error ?? "The local interview turn failed.");
    }

    return payload.reply;
  }

  function handleStartInterview() {
    if (!selectedModel || isSending) {
      return;
    }

    void (async () => {
      setIsSending(true);
      setConnectionError("");

      try {
        const firstReply = await requestInterviewTurn([]);
        setTranscript([{ role: "assistant", content: firstReply }]);
        setSessionStarted(true);
        setComposer("");
      } catch (error) {
        setConnectionError(
          error instanceof Error ? error.message : "Unable to start interview.",
        );
      } finally {
        setIsSending(false);
      }
    })();
  }

  function handleSendMessage() {
    const userMessage = composer.trim();

    if (!userMessage || !sessionStarted || isSending) {
      return;
    }

    const nextTranscript: InterviewMessage[] = [
      ...transcript,
      { role: "user", content: userMessage },
    ];

    void (async () => {
      setIsSending(true);
      setConnectionError("");
      setTranscript(nextTranscript);
      setComposer("");

      try {
        const reply = await requestInterviewTurn(nextTranscript);
        setTranscript((current) => [
          ...current,
          { role: "assistant", content: reply },
        ]);
      } catch (error) {
        setTranscript(transcript);
        setComposer(userMessage);
        setConnectionError(
          error instanceof Error ? error.message : "Unable to send message.",
        );
      } finally {
        setIsSending(false);
      }
    })();
  }

  function resetInterview() {
    setTranscript([]);
    setComposer("");
    setSessionStarted(false);
    setConnectionError("");
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(125,211,252,0.28),transparent_24%),radial-gradient(circle_at_top_right,rgba(249,115,22,0.18),transparent_28%),linear-gradient(180deg,#f6fbff_0%,#eef4ff_46%,#fcf7f0_100%)] px-4 py-6 text-slate-950 md:px-8 md:py-8">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-[0_22px_70px_rgba(15,23,42,0.08)] backdrop-blur md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-1 text-sm font-medium text-sky-950">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Local AI Interview Console
              </div>
              <div className="space-y-3">
                <h1 className="font-serif text-4xl leading-tight tracking-tight text-balance md:text-6xl">
                  LM Studio에 올린 로컬 모델로 모의 인터뷰를 바로 진행하세요.
                </h1>
                <p className="max-w-2xl text-sm leading-7 text-slate-600 md:text-base">
                  모델 목록 조회, 인터뷰 설정, 질문/답변 대화가 한 화면에서
                  이어집니다. 브라우저는 Next.js 서버만 호출하고, 서버가
                  `localhost:1234/v1`로 프록시합니다.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-950 p-4 text-white">
                <p className="text-xs uppercase tracking-[0.22em] text-sky-300">
                  Connection
                </p>
                <p className="mt-3 text-lg font-semibold">
                  {models.length > 0 ? "Connected" : "Waiting"}
                </p>
                <p className="mt-2 text-sm text-slate-300">{endpoint}</p>
              </div>
              <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-amber-700">
                  Interview Mode
                </p>
                <p className="mt-3 text-lg font-semibold text-slate-900">
                  {styleLabel}
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  질문은 한 번에 하나씩 진행되며, 답변 수준에 맞춰 난도가 조절됩니다.
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
          <section className="flex min-h-[720px] flex-col rounded-[2rem] border border-white/70 bg-white/82 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 md:px-6">
              <div>
                <p className="text-sm font-medium text-slate-500">Live transcript</p>
                <p className="text-lg font-semibold text-slate-950">
                  {sessionStarted ? "인터뷰 진행 중" : "인터뷰 준비 중"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={resetInterview}
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                >
                  새 세션
                </button>
                <button
                  type="button"
                  onClick={handleStartInterview}
                  disabled={!selectedModel || isSending}
                  className="rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {sessionStarted ? "다시 시작" : "인터뷰 시작"}
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5 md:px-6">
              {transcript.length === 0 ? (
                <div className="flex h-full min-h-[360px] flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-slate-300 bg-[linear-gradient(180deg,rgba(248,250,252,0.9)_0%,rgba(241,245,249,0.7)_100%)] p-8 text-center">
                  <p className="text-sm uppercase tracking-[0.24em] text-sky-700">
                    Ready when you are
                  </p>
                  <h2 className="mt-4 max-w-xl font-serif text-3xl text-slate-950">
                    오른쪽에서 모델과 인터뷰 조건을 고른 뒤 첫 질문을 받아보세요.
                  </h2>
                  <p className="mt-4 max-w-lg text-sm leading-7 text-slate-600">
                    시작 버튼을 누르면 로컬 모델이 인터뷰어 역할로 자기소개와 첫
                    질문을 바로 던집니다. 이후에는 답변을 입력할 때마다 다음
                    꼬리질문이 이어집니다.
                  </p>
                </div>
              ) : (
                transcript.map((message, index) => (
                  <article
                    key={`${message.role}-${index}`}
                    className={`max-w-3xl rounded-[1.5rem] px-5 py-4 shadow-sm ${
                      message.role === "assistant"
                        ? "border border-sky-100 bg-sky-50/90"
                        : "ml-auto border border-slate-200 bg-slate-950 text-white"
                    }`}
                  >
                    <p
                      className={`text-xs font-semibold uppercase tracking-[0.22em] ${
                        message.role === "assistant"
                          ? "text-sky-800"
                          : "text-slate-300"
                      }`}
                    >
                      {message.role === "assistant" ? "Interviewer" : "Candidate"}
                    </p>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-7">
                      {message.content}
                    </p>
                  </article>
                ))
              )}

              {isSending ? (
                <div className="max-w-3xl rounded-[1.5rem] border border-slate-200 bg-slate-100 px-5 py-4 text-sm text-slate-600">
                  로컬 모델이 다음 질문을 준비하고 있습니다...
                </div>
              ) : null}
            </div>

            <div className="border-t border-slate-200 px-5 py-4 md:px-6">
              <label className="mb-3 block text-sm font-medium text-slate-700">
                답변 입력
              </label>
              <textarea
                value={composer}
                onChange={(event) => setComposer(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={
                  sessionStarted
                    ? "답변을 입력하고 Enter로 전송하세요. 줄바꿈은 Shift+Enter."
                    : "먼저 인터뷰를 시작하면 여기에 답변을 입력할 수 있습니다."
                }
                disabled={!sessionStarted || isSending}
                className="min-h-32 w-full resize-none rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-white"
              />
              <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <p className="text-sm text-slate-500">
                  {selectedModel
                    ? `현재 모델: ${selectedModel}`
                    : "먼저 연결된 로컬 모델을 선택해주세요."}
                </p>
                <button
                  type="button"
                  onClick={handleSendMessage}
                  disabled={!canSend}
                  className="rounded-full bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:bg-orange-200"
                >
                  답변 전송
                </button>
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-[2rem] border border-white/70 bg-white/82 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Local model</p>
                  <h2 className="text-xl font-semibold text-slate-950">
                    연결 상태와 모델 선택
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => void loadModels()}
                  disabled={isLoadingModels}
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  새로고침
                </button>
              </div>

              <div className="mt-5 space-y-4">
                <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                    Endpoint
                  </p>
                  <p className="mt-2 break-all text-sm font-medium text-slate-900">
                    {endpoint}
                  </p>
                </div>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Model
                  </span>
                  <select
                    value={selectedModel}
                    onChange={(event) => setSelectedModel(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-400 focus:bg-white"
                  >
                    <option value="">모델을 선택하세요</option>
                    {models.map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                  </select>
                </label>

                {connectionError ? (
                  <div className="rounded-[1.5rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-800">
                    {connectionError}
                  </div>
                ) : null}

                {!connectionError && models.length === 0 ? (
                  <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
                    모델 목록을 아직 불러오지 못했습니다. LM Studio 서버가
                    `http://localhost:1234`에서 실행 중인지 확인해보세요.
                  </div>
                ) : null}
              </div>
            </section>

            <section className="rounded-[2rem] border border-white/70 bg-white/82 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur md:p-6">
              <p className="text-sm font-medium text-slate-500">Interview setup</p>
              <h2 className="text-xl font-semibold text-slate-950">
                인터뷰 조건
              </h2>

              <div className="mt-5 space-y-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Role
                  </span>
                  <input
                    value={config.role}
                    onChange={(event) =>
                      setConfig((current) => ({
                        ...current,
                        role: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-sky-400 focus:bg-white"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Experience
                  </span>
                  <input
                    value={config.experience}
                    onChange={(event) =>
                      setConfig((current) => ({
                        ...current,
                        experience: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-sky-400 focus:bg-white"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Stack / domain
                  </span>
                  <textarea
                    value={config.stack}
                    onChange={(event) =>
                      setConfig((current) => ({
                        ...current,
                        stack: event.target.value,
                      }))
                    }
                    className="min-h-24 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-7 outline-none transition focus:border-sky-400 focus:bg-white"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Focus
                  </span>
                  <textarea
                    value={config.focus}
                    onChange={(event) =>
                      setConfig((current) => ({
                        ...current,
                        focus: event.target.value,
                      }))
                    }
                    className="min-h-24 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-7 outline-none transition focus:border-sky-400 focus:bg-white"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Style
                  </span>
                  <select
                    value={config.style}
                    onChange={(event) =>
                      setConfig((current) => ({
                        ...current,
                        style: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-sky-400 focus:bg-white"
                  >
                    {INTERVIEW_STYLES.map((style) => (
                      <option key={style.id} value={style.id}>
                        {style.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </section>

            <section className="rounded-[2rem] border border-slate-900 bg-slate-950 p-5 text-white shadow-[0_18px_60px_rgba(15,23,42,0.18)] md:p-6">
              <p className="text-sm font-medium text-slate-400">Flow</p>
              <h2 className="text-xl font-semibold">사용 흐름</h2>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-300">
                <li>1. LM Studio에서 로컬 모델을 로드하고 OpenAI 호환 서버를 실행합니다.</li>
                <li>2. 이 화면에서 모델을 선택하고 인터뷰 역할과 집중 영역을 설정합니다.</li>
                <li>3. 첫 질문을 받은 뒤 답변을 이어가며 실전처럼 인터뷰를 진행합니다.</li>
              </ul>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}
