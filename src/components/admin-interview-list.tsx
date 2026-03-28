"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { AdminInterview, AdminInterviewAccessUser } from "@/lib/admin-interviews";

type AdminInterviewsPayload = {
  interviews?: AdminInterview[];
  interviewees?: AdminInterviewAccessUser[];
  error?: string;
};

function toDisplayPeriod(startsAtIso: string, endsAtIso: string) {
  const formatter = new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return `${formatter.format(new Date(startsAtIso))} ~ ${formatter.format(new Date(endsAtIso))}`;
}

function getLifecycleLabel(interview: AdminInterview) {
  if (!interview.isActive) {
    return { label: "비활성", tone: "bg-slate-100 text-slate-700" };
  }

  const now = Date.now();
  const startsAt = new Date(interview.startsAt).getTime();
  const endsAt = new Date(interview.endsAt).getTime();

  if (now < startsAt) {
    return { label: "예정", tone: "bg-sky-100 text-sky-700" };
  }

  if (now > endsAt) {
    return { label: "종료", tone: "bg-amber-100 text-amber-700" };
  }

  return { label: "진행중", tone: "bg-emerald-100 text-emerald-700" };
}

export default function AdminInterviewList() {
  const [interviews, setInterviews] = useState<AdminInterview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function syncFromServer() {
      setIsLoading(true);
      setError("");

      try {
        const response = await fetch("/api/admin/interviews", { cache: "no-store" });
        const payload = (await response.json()) as AdminInterviewsPayload;

        if (!response.ok) {
          throw new Error(payload.error ?? "인터뷰 목록을 불러오지 못했습니다.");
        }

        setInterviews(payload.interviews ?? []);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "인터뷰 목록을 불러오지 못했습니다.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void syncFromServer();
  }, []);

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white/85 p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">Interview List</p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-900">등록된 인터뷰</h2>
          <p className="mt-2 text-sm text-slate-600">
            목록에서 인터뷰를 선택하면 상세 화면으로 이동해 수정/활성 상태를 관리할
            수 있습니다.
          </p>
        </div>
        <Link
          href="/admin/interviews/new"
          className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          새 인터뷰 생성
        </Link>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <p className="mt-4 text-sm text-slate-500">인터뷰 목록을 불러오는 중입니다...</p>
      ) : interviews.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">등록된 인터뷰가 없습니다.</p>
      ) : (
        <div className="mt-5 grid gap-4">
          {interviews.map((interview) => {
            const lifecycle = getLifecycleLabel(interview);

            return (
              <article
                key={interview.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold text-slate-900">{interview.title}</h3>
                    <p className="text-sm text-slate-600">
                      기간: {toDisplayPeriod(interview.startsAt, interview.endsAt)}
                    </p>
                    <p className="text-sm text-slate-600">
                      접근방식: {interview.accessType === "password" ? "비밀번호" : "지정된 인원"}
                    </p>
                  </div>
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${lifecycle.tone}`}
                  >
                    {lifecycle.label}
                  </span>
                </div>

                <p className="mt-3 line-clamp-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                  {interview.talentProfile}
                </p>

                <div className="mt-5">
                  <Link
                    href={`/admin/interviews/${interview.id}`}
                    className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-white"
                  >
                    상세 보기
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
