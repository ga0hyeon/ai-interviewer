import Link from "next/link";
import LogoutButton from "@/components/logout-button";
import { requirePageUser } from "@/lib/server/auth";

export default async function AdminModePage() {
  const user = await requirePageUser(["admin"]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_30%),radial-gradient(circle_at_top_right,rgba(251,146,60,0.14),transparent_28%),linear-gradient(180deg,#f7fbff_0%,#eef4ff_45%,#fff6ef_100%)] px-4 py-8 md:px-8">
      <section className="mx-auto w-full max-w-6xl space-y-6">
        <header className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-[0_20px_65px_rgba(15,23,42,0.1)] backdrop-blur md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Mode</p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-950">Admin</h1>
              <p className="mt-2 text-sm text-slate-600">
                {user.name} 계정으로 로그인되어 있습니다. 인터뷰 및 상세 프롬프트를
                관리하는 권한입니다.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/interviewer"
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
              >
                인터뷰어 모드
              </Link>
              <LogoutButton />
            </div>
          </div>
        </header>

        <section className="grid gap-6 md:grid-cols-2">
          <article className="rounded-[1.75rem] border border-slate-200 bg-white/85 p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
            <p className="text-sm font-medium text-slate-500">Interview Template</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">
              인터뷰 시나리오 관리
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              역할별 인터뷰 템플릿, 난이도, 평가 기준을 버전으로 관리할 수 있도록
              데이터 스키마를 준비해두었습니다.
            </p>
          </article>

          <article className="rounded-[1.75rem] border border-slate-200 bg-white/85 p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
            <p className="text-sm font-medium text-slate-500">Prompt Control</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">
              상세 프롬프트 관리
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              프롬프트 초안/배포 상태를 구분해 운영할 수 있게 확장 가능합니다.
              현재는 로그인과 권한 체계를 먼저 안정화한 상태입니다.
            </p>
          </article>
        </section>
      </section>
    </main>
  );
}

