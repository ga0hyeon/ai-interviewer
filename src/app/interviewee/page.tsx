import IntervieweeConsole from "@/components/interviewee-console";
import LogoutButton from "@/components/logout-button";
import { requirePageUser } from "@/lib/server/auth";

export default async function IntervieweeModePage() {
  const user = await requirePageUser(["interviewee"]);

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur md:px-8">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Mode</p>
            <p className="text-sm font-semibold text-slate-900">Interviewee</p>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-sm text-slate-600">{user.name}</p>
            <LogoutButton />
          </div>
        </div>
      </header>
      <IntervieweeConsole />
    </div>
  );
}
