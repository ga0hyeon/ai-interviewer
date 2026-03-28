import Link from "next/link";
import LogoutButton from "@/components/logout-button";
import { requirePageUser } from "@/lib/server/auth";

export default async function InterviewerModePage() {
  const user = await requirePageUser(["admin", "interviewer"]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(125,211,252,0.2),transparent_30%),linear-gradient(180deg,#f8fbff_0%,#f3f6ff_40%,#fff8f1_100%)] px-4 py-8 md:px-8">
      <section className="mx-auto w-full max-w-5xl space-y-6">
        <header className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-[0_20px_65px_rgba(15,23,42,0.1)] backdrop-blur md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Mode</p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-950">Interviewer</h1>
              <p className="mt-2 text-sm text-slate-600">
                {user.name} 계정으로 로그인되어 있습니다. 이 모드는 인터뷰 결과
                리뷰 전용 권한입니다.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {user.role === "admin" ? (
                <Link
                  href="/admin"
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
                >
                  관리자 모드
                </Link>
              ) : null}
              <LogoutButton />
            </div>
          </div>
        </header>

        <section className="rounded-[2rem] border border-slate-200 bg-white/85 p-6 shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
          <p className="text-sm font-medium text-slate-500">Review Queue</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">
            인터뷰 리뷰 기능 준비 완료
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            현재 단계에서는 로그인/권한 분리까지 우선 적용되었습니다. 다음
            단계에서 이 화면에 인터뷰 결과 리스트, 평가 코멘트, 재검토 히스토리를
            붙이면 인터뷰어 워크플로우를 완성할 수 있습니다.
          </p>
        </section>
      </section>
    </main>
  );
}

