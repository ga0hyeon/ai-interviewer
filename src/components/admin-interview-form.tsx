"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  INTERVIEW_ACCESS_TYPES,
  type AdminInterview,
  type AdminInterviewAccessUser,
  type InterviewAccessType,
} from "@/lib/admin-interviews";

type AdminInterviewsPayload = {
  interviews?: AdminInterview[];
  interviewees?: AdminInterviewAccessUser[];
  error?: string;
};

type FormState = {
  title: string;
  startsAt: string;
  endsAt: string;
  talentProfile: string;
  accessType: InterviewAccessType;
  accessPassword: string;
  designatedUserIds: number[];
};

function toDateTimeInputValue(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

function toDisplayPeriod(startsAtIso: string, endsAtIso: string) {
  const formatter = new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return `${formatter.format(new Date(startsAtIso))} ~ ${formatter.format(new Date(endsAtIso))}`;
}

function createInitialFormState(): FormState {
  const start = new Date();
  start.setSeconds(0, 0);

  const end = new Date(start.getTime() + 1000 * 60 * 60 * 24 * 7);

  return {
    title: "",
    startsAt: toDateTimeInputValue(start),
    endsAt: toDateTimeInputValue(end),
    talentProfile: "",
    accessType: "password",
    accessPassword: "",
    designatedUserIds: [],
  };
}

function toFormState(interview: AdminInterview): FormState {
  return {
    title: interview.title,
    startsAt: toDateTimeInputValue(new Date(interview.startsAt)),
    endsAt: toDateTimeInputValue(new Date(interview.endsAt)),
    talentProfile: interview.talentProfile,
    accessType: interview.accessType,
    accessPassword: "",
    designatedUserIds: interview.designatedUsers.map((user) => user.id),
  };
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

export default function AdminInterviewForm({ interviewId }: { interviewId?: number }) {
  const router = useRouter();
  const isEditMode = typeof interviewId === "number";
  const [form, setForm] = useState<FormState>(() => createInitialFormState());
  const [interviews, setInterviews] = useState<AdminInterview[]>([]);
  const [interviewees, setInterviewees] = useState<AdminInterviewAccessUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const interview = useMemo(
    () => interviews.find((item) => item.id === interviewId) ?? null,
    [interviewId, interviews],
  );

  useEffect(() => {
    async function syncFromServer() {
      setIsLoading(true);
      setError("");

      try {
        const response = await fetch("/api/admin/interviews", { cache: "no-store" });
        const payload = (await response.json()) as AdminInterviewsPayload;

        if (!response.ok) {
          throw new Error(payload.error ?? "인터뷰 정보를 불러오지 못했습니다.");
        }

        const nextInterviews = payload.interviews ?? [];
        const nextInterviewees = payload.interviewees ?? [];

        setInterviews(nextInterviews);
        setInterviewees(nextInterviewees);

        if (!isEditMode) {
          return;
        }

        const targetInterview = nextInterviews.find((item) => item.id === interviewId);

        if (!targetInterview) {
          setError("해당 인터뷰를 찾을 수 없습니다.");
          return;
        }

        setForm(toFormState(targetInterview));
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "인터뷰 정보를 불러오지 못했습니다.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void syncFromServer();
  }, [interviewId, isEditMode]);

  function toggleDesignatedUser(userId: number, selected: boolean) {
    setForm((current) => {
      if (selected) {
        if (current.designatedUserIds.includes(userId)) {
          return current;
        }

        return {
          ...current,
          designatedUserIds: [...current.designatedUserIds, userId],
        };
      }

      return {
        ...current,
        designatedUserIds: current.designatedUserIds.filter((id) => id !== userId),
      };
    });
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isEditMode && !interview) {
      setError("수정할 인터뷰 정보를 찾을 수 없습니다.");
      return;
    }

    const title = form.title.trim();
    const talentProfile = form.talentProfile.trim();

    if (!title || !talentProfile) {
      setError("제목과 인재 정보를 모두 입력해주세요.");
      return;
    }

    const startsAt = new Date(form.startsAt);
    const endsAt = new Date(form.endsAt);

    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
      setError("기간 형식이 올바르지 않습니다.");
      return;
    }

    if (startsAt >= endsAt) {
      setError("종료 시각은 시작 시각보다 뒤여야 합니다.");
      return;
    }

    const isSwitchingToPasswordWithoutExistingPassword =
      form.accessType === "password" &&
      interview?.accessType !== "password" &&
      !form.accessPassword.trim();

    if (!isEditMode && form.accessType === "password" && !form.accessPassword.trim()) {
      setError("비밀번호 접근 방식은 비밀번호를 입력해야 합니다.");
      return;
    }

    if (isSwitchingToPasswordWithoutExistingPassword) {
      setError("비밀번호 접근 방식으로 변경하려면 비밀번호를 입력해주세요.");
      return;
    }

    if (form.accessType === "allowlist" && form.designatedUserIds.length === 0) {
      setError("지정 인원 접근 방식은 최소 1명을 선택해야 합니다.");
      return;
    }

    setIsSaving(true);
    setError("");
    setNotice("");

    const payload: Record<string, unknown> = {
      title,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      talentProfile,
      accessType: form.accessType,
      designatedUserIds:
        form.accessType === "allowlist" ? form.designatedUserIds : undefined,
    };

    if (form.accessType === "password" && form.accessPassword.trim()) {
      payload.accessPassword = form.accessPassword.trim();
    }

    try {
      const response = await fetch("/api/admin/interviews", {
        method: isEditMode ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          isEditMode
            ? {
                id: interviewId,
                ...payload,
              }
            : payload,
        ),
      });

      const result = (await response.json()) as AdminInterviewsPayload;

      if (!response.ok) {
        throw new Error(result.error ?? "인터뷰 저장에 실패했습니다.");
      }

      const nextInterviews = result.interviews ?? [];

      setInterviews(nextInterviews);
      setInterviewees(result.interviewees ?? interviewees);

      if (isEditMode) {
        const updatedInterview = nextInterviews.find((item) => item.id === interviewId);

        if (updatedInterview) {
          setForm(toFormState(updatedInterview));
        }

        setNotice("인터뷰가 수정되었습니다.");
      } else {
        setForm(createInitialFormState());
        setNotice("새 인터뷰가 생성되었습니다.");
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "인터뷰 저장에 실패했습니다.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleInterviewActive() {
    if (!isEditMode || !interview) {
      return;
    }

    setIsSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/admin/interviews", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: interview.id,
          isActive: !interview.isActive,
        }),
      });

      const payload = (await response.json()) as AdminInterviewsPayload;

      if (!response.ok) {
        throw new Error(payload.error ?? "상태 변경에 실패했습니다.");
      }

      setInterviews(payload.interviews ?? []);
      setInterviewees(payload.interviewees ?? []);
      setNotice(
        interview.isActive
          ? "인터뷰를 비활성화했습니다."
          : "인터뷰를 활성화했습니다.",
      );
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "상태 변경에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteInterview() {
    if (!isEditMode || !interview) {
      return;
    }

    const confirmed = window.confirm(`'${interview.title}' 인터뷰를 삭제할까요?`);

    if (!confirmed) {
      return;
    }

    setIsSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch(`/api/admin/interviews?id=${interview.id}`, {
        method: "DELETE",
      });

      const payload = (await response.json()) as AdminInterviewsPayload;

      if (!response.ok) {
        throw new Error(payload.error ?? "인터뷰 삭제에 실패했습니다.");
      }

      router.push("/admin");
      router.refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "인터뷰 삭제에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <section className="rounded-[2rem] border border-slate-200 bg-white/85 p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
        <p className="text-sm text-slate-500">인터뷰 정보를 불러오는 중입니다...</p>
      </section>
    );
  }

  if (isEditMode && !interview) {
    return (
      <section className="rounded-[2rem] border border-slate-200 bg-white/85 p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
        <h2 className="text-xl font-semibold text-slate-900">인터뷰를 찾을 수 없습니다.</h2>
        {error ? <p className="mt-2 text-sm text-rose-700">{error}</p> : null}
        <Link
          href="/admin"
          className="mt-4 inline-flex rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
        >
          목록으로 이동
        </Link>
      </section>
    );
  }

  const lifecycle = interview ? getLifecycleLabel(interview) : null;

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white/85 p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">Interview Manager</p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-900">
            {isEditMode ? "인터뷰 상세" : "인터뷰 생성"}
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            {isEditMode
              ? "인터뷰 상세에서 기간, 접근 방식, 활성 상태를 관리할 수 있습니다."
              : "제목, 기간, 인재 정보를 설정해 새 인터뷰를 생성합니다."}
          </p>
        </div>
        <Link
          href="/admin"
          className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
        >
          목록으로
        </Link>
      </div>

      {interview ? (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-slate-700">
              기간: {toDisplayPeriod(interview.startsAt, interview.endsAt)}
            </p>
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${lifecycle?.tone}`}
            >
              {lifecycle?.label}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            생성자: {interview.createdByName ?? "알 수 없음"}
          </p>
        </div>
      ) : null}

      <form onSubmit={submitForm} className="mt-6 space-y-4">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">제목</span>
          <input
            value={form.title}
            onChange={(event) =>
              setForm((current) => ({ ...current, title: event.target.value }))
            }
            placeholder="예: 2026 상반기 프론트엔드 채용 인터뷰"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-sky-400 focus:bg-white"
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">시작 시각</span>
            <input
              type="datetime-local"
              value={form.startsAt}
              onChange={(event) =>
                setForm((current) => ({ ...current, startsAt: event.target.value }))
              }
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-sky-400 focus:bg-white"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">종료 시각</span>
            <input
              type="datetime-local"
              value={form.endsAt}
              onChange={(event) =>
                setForm((current) => ({ ...current, endsAt: event.target.value }))
              }
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-sky-400 focus:bg-white"
            />
          </label>
        </div>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">인재 정보</span>
          <textarea
            value={form.talentProfile}
            onChange={(event) =>
              setForm((current) => ({ ...current, talentProfile: event.target.value }))
            }
            placeholder="예: React/TypeScript 실무 경험, 사용자 중심 문제 해결 능력, 협업 커뮤니케이션"
            className="min-h-28 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-7 outline-none transition focus:border-sky-400 focus:bg-white"
          />
        </label>

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-slate-700">인터뷰 접근 방식</legend>
          <div className="grid gap-3 md:grid-cols-2">
            {INTERVIEW_ACCESS_TYPES.map((accessType) => (
              <label
                key={accessType}
                className={`rounded-2xl border px-4 py-3 text-sm transition ${
                  form.accessType === accessType
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-slate-50 text-slate-700"
                }`}
              >
                <input
                  type="radio"
                  name="accessType"
                  value={accessType}
                  checked={form.accessType === accessType}
                  onChange={() =>
                    setForm((current) => ({
                      ...current,
                      accessType,
                    }))
                  }
                  className="sr-only"
                />
                <p className="font-semibold">
                  {accessType === "password" ? "비밀번호" : "지정된 인원"}
                </p>
                <p className="mt-1 text-xs opacity-80">
                  {accessType === "password"
                    ? "지원자가 비밀번호를 입력해 접근"
                    : "선택한 인터뷰이 계정만 접근"}
                </p>
              </label>
            ))}
          </div>
        </fieldset>

        {form.accessType === "password" ? (
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">
              비밀번호 {interview?.accessType === "password" ? "(변경 시 입력)" : ""}
            </span>
            <input
              type="password"
              value={form.accessPassword}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  accessPassword: event.target.value,
                }))
              }
              placeholder="4자 이상"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-sky-400 focus:bg-white"
            />
          </label>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-700">접근 허용 인터뷰이 선택</p>
            {interviewees.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">선택 가능한 인터뷰이 계정이 없습니다.</p>
            ) : (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {interviewees.map((interviewee) => (
                  <label
                    key={interviewee.id}
                    className="flex items-start gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                  >
                    <input
                      type="checkbox"
                      checked={form.designatedUserIds.includes(interviewee.id)}
                      onChange={(event) =>
                        toggleDesignatedUser(interviewee.id, event.target.checked)
                      }
                      className="mt-1 h-4 w-4 rounded border-slate-300"
                    />
                    <span>
                      <strong className="block text-slate-900">{interviewee.name}</strong>
                      <span className="text-xs text-slate-500">{interviewee.email}</span>
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </div>
        ) : null}

        {notice ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {notice}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isSaving ? "저장 중..." : isEditMode ? "인터뷰 수정" : "인터뷰 생성"}
          </button>

          {!isEditMode ? (
            <Link
              href="/admin"
              className="rounded-full border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
            >
              목록으로 이동
            </Link>
          ) : null}
        </div>
      </form>

      {isEditMode ? (
        <div className="mt-8 border-t border-slate-200 pt-6">
          <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
            상세 관리
          </h3>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void toggleInterviewActive()}
              disabled={isSaving || !interview}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {interview?.isActive ? "비활성화" : "활성화"}
            </button>
            <button
              type="button"
              onClick={() => void deleteInterview()}
              disabled={isSaving || !interview}
              className="rounded-full border border-rose-300 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              삭제
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
