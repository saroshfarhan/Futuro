"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useUserProfile } from "@/context/UserProfileContext";

const FEATURES = [
  {
    href: "/chat",
    icon: "💬",
    title: "AI Benefits Assistant",
    description:
      "Ask anything about your health cover. File claims and book appointments through natural conversation.",
    color: "from-sky-500 to-blue-700",
  },
  {
    href: "/plans",
    icon: "🏥",
    title: "Smart Plan Picker",
    description:
      "Compare all 5 insurance plans with personalised recommendations based on your health needs.",
    color: "from-cyan-500 to-teal-600",
  },
  {
    href: "/pension",
    icon: "📈",
    title: "Engaging Pension Calculator",
    description:
      "See your retirement as a lifestyle, not just a number. Interactive, visual, and actually motivating.",
    color: "from-blue-500 to-indigo-700",
  },
];

const PERSONAS = [
  { emoji: "🎓", name: "Aisha", role: "International Student", desc: "New to Ireland, needs guidance on health cover on a student budget." },
  { emoji: "🤱", name: "Sarah", role: "Pregnant Professional", desc: "18 weeks pregnant, wanting to upgrade her plan before her due date." },
  { emoji: "🌅", name: "Michael", role: "Almost-Retiree", desc: "58, retiring at 65 — wants real pension numbers and better hospital cover." },
];

export default function HomePage() {
  const { profile, profileCompletion } = useUserProfile();
  const hasProfile = profileCompletion > 0;

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-linear-to-br from-[#10376d] via-[#1958a8] to-[#1171c2] px-4 py-20 text-white">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-10 left-10 h-64 w-64 rounded-full bg-cyan-100 blur-3xl" />
          <div className="absolute bottom-10 right-10 h-96 w-96 rounded-full bg-blue-200 blur-3xl" />

        </div>
        <div className="relative mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block rounded-full bg-white/20 px-4 py-1.5 text-sm font-medium backdrop-blur mb-6">
              AI-powered benefits &amp; pension platform
            </span>
            <h1 className="kota-section-title mb-6 text-5xl font-bold tracking-tight">
              Your benefits, finally{" "}
              <span className="text-cyan-100">making sense</span>
            </h1>
            <p className="mx-auto mb-10 max-w-2xl text-xl text-blue-100">
              One platform to understand your health insurance, find the right plan, and see your
              retirement as a real lifestyle — not just a spreadsheet.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/chat"
                className="kota-btn-secondary px-8 py-3.5 text-base text-blue-800"
              >
                Start Chatting
              </Link>
              <Link
                href="/pension"
                className="rounded-xl border border-white/35 bg-white/10 px-8 py-3.5 text-base font-semibold text-white backdrop-blur hover:bg-white/20 transition-all"
              >
                Check My Pension
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Profile prompt banner */}
      {hasProfile && (
        <div className="border-b border-[var(--border)] bg-[color:var(--brand-soft)] px-4 py-3">
          <div className="mx-auto max-w-7xl flex items-center justify-between">
            <p className="text-sm text-blue-800">
              <span className="font-semibold">Your profile is {profileCompletion}% complete.</span>{" "}
              {profile.age && `Age ${profile.age}`}{profile.age && profile.salary ? " · " : ""}
              {profile.salary && `€${profile.salary.toLocaleString()}/yr`}
              {" — "}All your data is pre-filled across all three tools.
            </p>
            <Link href="/chat" className="text-sm font-medium text-blue-700 hover:text-blue-900">
              Continue chatting →
            </Link>
          </div>
        </div>
      )}

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="grid md:grid-cols-3 gap-6">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.href}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Link
                href={f.href}
                className="kota-panel block p-6 transition-all group hover:-translate-y-1"
              >
                <div
                  className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br ${f.color} text-2xl mb-4`}
                >
                  {f.icon}
                </div>
                <h3 className="mb-2 text-lg font-semibold text-slate-900 transition-colors group-hover:text-blue-700">
                  {f.title}
                </h3>
                <p className="text-sm leading-relaxed text-slate-600">{f.description}</p>
                <div className="mt-4 text-sm font-medium text-blue-600 group-hover:text-blue-800">
                  Get started →
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-[var(--border)] bg-white/75 px-4 py-16">
        <div className="mx-auto max-w-4xl text-center mb-12">
          <h2 className="kota-section-title mb-4 text-3xl font-bold">No forms. Just conversation.</h2>
          <p className="text-lg text-slate-600">
            As you chat with Futuro, it quietly builds your profile. That data then powers your
            personalised plan recommendation and pension calculation — automatically.
          </p>
        </div>
        <div className="mx-auto max-w-3xl flex flex-col md:flex-row items-start gap-8">
          {[
            { step: "1", title: "Chat naturally", desc: "Ask anything about your health cover. Futuro learns about you as you talk." },
            { step: "2", title: "Profile builds silently", desc: "Age, salary, family needs — extracted from conversation, never from a form." },
            { step: "3", title: "Everything pre-filled", desc: "Visit Plans or Pension — your data is already there. No re-entry, ever." },
          ].map(({ step, title, desc }) => (
            <div key={step} className="flex gap-4 flex-1">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-700 text-sm font-bold text-white">
                {step}
              </div>
              <div>
                <h4 className="mb-1 font-semibold text-slate-900">{title}</h4>
                <p className="text-sm text-slate-600">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Personas */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <h2 className="kota-section-title mb-8 text-center text-2xl font-bold">Built for everyone</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {PERSONAS.map((p) => (
            <div key={p.name} className="kota-panel p-6">
              <div className="text-4xl mb-3">{p.emoji}</div>
              <div className="mb-1 text-sm font-semibold text-blue-700">{p.role}</div>
              <div className="mb-2 font-semibold text-slate-900">{p.name}</div>
              <p className="text-sm text-slate-600">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
