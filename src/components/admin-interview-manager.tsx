"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
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

export default function AdminInterviewManager() {
  const [form, setForm] = useState<FormState>(() => createInitialFormState());
  const [interviews, setInterviews] = useState<AdminInterview[]>([]);
  const [interviewees, setInterviewees] = useState<AdminInterviewAccessUser[]>([]);
  const [editingInterviewId, setEditingInterviewId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const editingInterview = useMemo(
    () => interviews.find((interview) => interview.id === editingInterviewId) ?? null,
    [editingInterviewId, interviews],
  );

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
      setInterviewees(payload.interviewees ?? []);
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

  useEffect(() => {
    void syncFromServer();
  }, []);

  function resetForm() {
    setForm(createInitialFormState());
    setEditingInterviewId(null);
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

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
      editingInterview?.accessType !== "password" &&
      !form.accessPassword.trim();

    if (!editingInterviewId && form.accessType === "password" && !form.accessPassword.trim()) {
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
      const isEdit = editingInterviewId !== null;
      const response = await fetch("/api/admin/interviews", {
        method: isEdit ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          isEdit
            ? {
                id: editingInterviewId,
                ...payload,
              }
            : payload,
        ),
      });

      const result = (await response.json()) as AdminInterviewsPayload;

      if (!response.ok) {
        throw new Error(result.error ?? "인터뷰 저장에 실패했습니다.");
      }

      setInterviews(result.interviews ?? []);
      setInterviewees(result.interviewees ?? []);
      resetForm();
      setNotice(isEdit ? "인터뷰가 수정되었습니다." : "새 인터뷰가 생성되었습니다.");
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

  function startEditing(interview: AdminInterview) {
    setEditingInterviewId(interview.id);
    setForm({
      title: interview.title,
      startsAt: toDateTimeInputValue(new Date(interview.startsAt)),
      endsAt: toDateTimeInputValue(new Date(interview.endsAt)),
      talentProfile: interview.talentProfile,
      accessType: interview.accessType,
      accessPassword: "",
      designatedUserIds: interview.designatedUsers.map((user) => user.id),
    });
    setError("");
    setNotice("");
  }

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

  async function toggleInterviewActive(interview: AdminInterview) {
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

  async function deleteInterview(interview: AdminInterview) {
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

      setInterviews(payload.interviews ?? []);
      setInterviewees(payload.interviewees ?? []);

      if (editingInterviewId === interview.id) {
        resetForm();
      }

      setNotice("인터뷰가 삭제되었습니다.");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "인터뷰 삭제에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white/85 p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
        <p className="text-sm font-medium text-slate-500">Interview Manager</p>
        <h2 className="mt-1 text-2xl font-semibold text-slate-900">
          {editingInterviewId ? "인터뷰 수정" : "인터뷰 생성"}
        </h2>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          제목, 기간, 채용하고 싶은 인재 정보, 접근 방식을 설정해 인터뷰를 운영할 수
          있습니다.
        </p>

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
                비밀번호 {editingInterview?.accessType === "password" ? "(변경 시 입력)" : ""}
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
                <p className="mt-2 text-sm text-slate-500">
                  선택 가능한 인터뷰이 계정이 없습니다.
                </p>
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
              {isSaving
                ? "저장 중..."
                : editingInterviewId
                  ? "인터뷰 수정"
                  : "인터뷰 생성"}
            </button>

            {editingInterviewId ? (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-full border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
              >
                수정 취소
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white/85 p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
        <p className="text-sm font-medium text-slate-500">Interview List</p>
        <h2 className="mt-1 text-2xl font-semibold text-slate-900">등록된 인터뷰</h2>

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
                      <h3 className="text-lg font-semibold text-slate-900">
                        {interview.title}
                      </h3>
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

                  <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                    {interview.talentProfile}
                  </p>

                  {interview.accessType === "allowlist" ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {interview.designatedUsers.map((user) => (
                        <span
                          key={user.id}
                          className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs text-sky-900"
                        >
                          {user.name} ({user.email})
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-4 text-xs text-slate-500">
                      비밀번호 설정됨: {interview.hasPassword ? "예" : "아니오"}
                    </p>
                  )}

                  <div className="mt-5 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => startEditing(interview)}
                      disabled={isSaving}
                      className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      onClick={() => void toggleInterviewActive(interview)}
                      disabled={isSaving}
                      className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {interview.isActive ? "비활성화" : "활성화"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteInterview(interview)}
                      disabled={isSaving}
                      className="rounded-full border border-rose-300 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      삭제
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
