"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUserProfile } from "@/context/UserProfileContext";

const NAV_LINKS = [
  { href: "/chat", label: "AI Assistant", icon: "💬" },
  { href: "/plans", label: "Plan Picker", icon: "🏥" },
  { href: "/pension", label: "Pension", icon: "📈" },
];

export default function Navbar() {
  const pathname = usePathname();
  const { profileCompletion } = useUserProfile();

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 text-white font-bold text-sm">
            F
          </div>
          <span className="font-semibold text-gray-900 text-lg">Futuro</span>
        </Link>

        <div className="flex items-center gap-1">
          {NAV_LINKS.map(({ href, label, icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <span>{icon}</span>
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-xs text-gray-500">Profile</span>
            <div className="relative h-2 w-20 rounded-full bg-gray-200 overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-700"
                style={{ width: `${profileCompletion}%` }}
              />
            </div>
            <span className="text-xs font-medium text-indigo-600">{profileCompletion}%</span>
          </div>
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-semibold">
            U
          </div>
        </div>
      </div>
    </nav>
  );
}
