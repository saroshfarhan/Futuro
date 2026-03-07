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
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-kota-dark/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-kota-green text-kota-dark text-sm font-bold shadow-md shadow-emerald-400/30">
            F
          </div>
          <span className="text-lg font-semibold text-white">Futuro</span>
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
                    ? "bg-kota-green/20 text-kota-green"
                    : "text-kota-muted hover:bg-white/5 hover:text-white"
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
            <span className="text-xs text-kota-muted">Profile</span>
            <div className="relative h-2 w-20 overflow-hidden rounded-full bg-white/10">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-kota-green transition-all duration-700"
                style={{ width: `${profileCompletion}%` }}
              />
            </div>
            <span className="text-xs font-medium text-kota-green">{profileCompletion}%</span>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white">
            U
          </div>
        </div>
      </div>
    </nav>
  );
}
