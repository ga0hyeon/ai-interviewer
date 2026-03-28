"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  {
    href: "/admin",
    label: "인터뷰 목록",
    isActive: (pathname: string) =>
      pathname === "/admin" ||
      (pathname.startsWith("/admin/interviews/") && pathname !== "/admin/interviews/new"),
  },
  {
    href: "/admin/interviews/new",
    label: "인터뷰 생성",
    isActive: (pathname: string) => pathname === "/admin/interviews/new",
  },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="mt-6 flex flex-wrap gap-2">
      {NAV_ITEMS.map((item) => {
        const isActive = item.isActive(pathname);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              isActive
                ? "bg-slate-900 text-white"
                : "border border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-slate-100"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
