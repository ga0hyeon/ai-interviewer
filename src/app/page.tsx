export default function Home() {
  return (
    <main className="flex min-h-screen flex-col bg-[radial-gradient(circle_at_top,#fef3c7,transparent_30%),linear-gradient(180deg,#fffdf7_0%,#fff7ed_45%,#ffffff_100%)] px-6 py-10 text-slate-900">
      <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-between gap-12 rounded-[2rem] border border-amber-200/70 bg-white/80 p-8 shadow-[0_24px_80px_rgba(217,119,6,0.12)] backdrop-blur md:p-12">
        <div className="space-y-6">
          <div className="inline-flex rounded-full border border-amber-300 bg-amber-100 px-4 py-1 text-sm font-medium text-amber-900">
            Next.js 16 + TypeScript Starter
          </div>
          <div className="max-w-3xl space-y-4">
            <h1 className="text-4xl font-semibold tracking-tight text-balance md:text-6xl">
              Build your LLM interview system on a clean, production-ready base.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
              This project is initialized with the latest stable Next.js App
              Router, TypeScript, ESLint, Tailwind CSS v4, and a `src/`
              directory structure.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-medium text-slate-500">Core stack</p>
            <p className="mt-2 text-xl font-semibold">Next.js 16.2.1</p>
            <p className="mt-1 text-sm text-slate-600">App Router + React 19</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-medium text-slate-500">Language</p>
            <p className="mt-2 text-xl font-semibold">TypeScript 5.9</p>
            <p className="mt-1 text-sm text-slate-600">Strict, ready for scaling</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-medium text-slate-500">Styling</p>
            <p className="mt-2 text-xl font-semibold">Tailwind CSS v4</p>
            <p className="mt-1 text-sm text-slate-600">Fast UI prototyping</p>
          </article>
        </div>

        <div className="grid gap-6 rounded-[1.5rem] bg-slate-950 p-6 text-white md:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <p className="text-sm uppercase tracking-[0.18em] text-amber-300">
              Suggested next steps
            </p>
            <ul className="space-y-3 text-sm leading-6 text-slate-300">
              <li>1. Add interview flow routes like `/interview`, `/report`, `/api/session`.</li>
              <li>2. Connect your LLM provider and stream responses from a server route.</li>
              <li>3. Store transcripts, scores, and feedback in a database.</li>
            </ul>
          </div>
          <div className="rounded-[1.25rem] border border-white/10 bg-white/5 p-5">
            <p className="text-sm text-slate-400">Run locally</p>
            <code className="mt-3 block rounded-xl bg-black/30 px-4 py-3 text-sm text-amber-200">
              pnpm dev
            </code>
          </div>
        </div>
      </section>
    </main>
  );
}
