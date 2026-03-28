import { redirect } from "next/navigation";
import LoginForm from "@/components/login-form";
import { getCurrentUser, getRoleHomePath } from "@/lib/server/auth";

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect(getRoleHomePath(user.role));
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(125,211,252,0.22),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(249,115,22,0.18),transparent_28%),linear-gradient(180deg,#f8fbff_0%,#f3f4ff_45%,#fff8f1_100%)] px-4 py-10 text-slate-950 md:px-8 md:py-14">
      <section className="mx-auto grid w-full max-w-6xl gap-6 md:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[2rem] border border-white/70 bg-white/85 p-7 shadow-[0_22px_70px_rgba(15,23,42,0.1)] backdrop-blur md:p-10">
          <p className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-sky-900">
            AI Interviewer
          </p>
          <h1 className="mt-5 font-serif text-4xl leading-tight tracking-tight md:text-5xl">
            역할 기반 인터뷰 플랫폼
          </h1>
          <p className="mt-5 text-sm leading-7 text-slate-600 md:text-base">
            관리자, 인터뷰어, 인터뷰이 권한이 분리되어 동작합니다. 로그인하면
            계정 역할에 맞는 모드로 자동 이동합니다.
          </p>
          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-700">
            <p className="font-semibold text-slate-900">권한 안내</p>
            <p>관리자: 인터뷰/프롬프트 관리</p>
            <p>인터뷰어: 결과 리뷰</p>
            <p>인터뷰이: 실전 인터뷰 진행</p>
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-[0_22px_70px_rgba(15,23,42,0.1)] backdrop-blur md:p-8">
          <h2 className="text-2xl font-semibold text-slate-950">로그인</h2>
          <p className="mt-2 text-sm text-slate-600">
            계정 정보를 입력하면 역할별 화면으로 이동합니다.
          </p>
          <div className="mt-6">
            <LoginForm />
          </div>
        </div>
      </section>
    </main>
  );
}

