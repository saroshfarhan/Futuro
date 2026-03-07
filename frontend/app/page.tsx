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
    color: "from-indigo-500 to-purple-600",
    bg: "bg-indigo-50",
    border: "border-indigo-100",
  },
  {
    href: "/plans",
    icon: "🏥",
    title: "Smart Plan Picker",
    description:
      "Compare all 5 insurance plans with personalised recommendations based on your health needs.",
    color: "from-emerald-500 to-teal-600",
    bg: "bg-emerald-50",
    border: "border-emerald-100",
  },
  {
    href: "/pension",
    icon: "📈",
    title: "Engaging Pension Calculator",
    description:
      "See your retirement as a lifestyle, not just a number. Interactive, visual, and actually motivating.",
    color: "from-amber-500 to-orange-600",
    bg: "bg-amber-50",
    border: "border-amber-100",
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
      <section className="relative overflow-hidden bg-linear-to-br from-indigo-600 via-purple-600 to-indigo-800 px-4 py-20 text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 h-64 w-64 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-10 right-10 h-96 w-96 rounded-full bg-purple-300 blur-3xl" />

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
            <h1 className="text-5xl font-bold tracking-tight mb-6">
              Your benefits, finally{" "}
              <span className="text-purple-200">making sense</span>
            </h1>
            <p className="text-xl text-indigo-100 max-w-2xl mx-auto mb-10">
              One platform to understand your health insurance, find the right plan, and see your
              retirement as a real lifestyle — not just a spreadsheet.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/chat"
                className="rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-indigo-700 shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
              >
                Start Chatting
              </Link>
              <Link
                href="/pension"
                className="rounded-xl border border-white/30 bg-white/10 backdrop-blur px-8 py-3.5 text-base font-semibold text-white hover:bg-white/20 transition-all"
              >
                Check My Pension
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Profile prompt banner */}
      {hasProfile && (
        <div className="bg-indigo-50 border-b border-indigo-100 px-4 py-3">
          <div className="mx-auto max-w-7xl flex items-center justify-between">
            <p className="text-sm text-indigo-700">
              <span className="font-semibold">Your profile is {profileCompletion}% complete.</span>{" "}
              {profile.age && `Age ${profile.age}`}{profile.age && profile.salary ? " · " : ""}
              {profile.salary && `€${profile.salary.toLocaleString()}/yr`}
              {" — "}All your data is pre-filled across all three tools.
            </p>
            <Link href="/chat" className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
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
                className={`block rounded-2xl border ${f.border} ${f.bg} p-6 hover:shadow-lg transition-all hover:-translate-y-1 group`}
              >
                <div
                  className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br ${f.color} text-2xl mb-4`}
                >
                  {f.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-indigo-700 transition-colors">
                  {f.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">{f.description}</p>
                <div className="mt-4 text-sm font-medium text-indigo-600 group-hover:text-indigo-800">
                  Get started →
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white border-y border-gray-100 px-4 py-16">
        <div className="mx-auto max-w-4xl text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">No forms. Just conversation.</h2>
          <p className="text-gray-600 text-lg">
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
              <div className="shrink-0 h-8 w-8 rounded-full bg-indigo-600 text-white text-sm font-bold flex items-center justify-center">
                {step}
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">{title}</h4>
                <p className="text-sm text-gray-600">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Personas */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Built for everyone</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {PERSONAS.map((p) => (
            <div key={p.name} className="rounded-2xl bg-white border border-gray-200 p-6 shadow-sm">
              <div className="text-4xl mb-3">{p.emoji}</div>
              <div className="text-sm font-semibold text-indigo-600 mb-1">{p.role}</div>
              <div className="font-semibold text-gray-900 mb-2">{p.name}</div>
              <p className="text-sm text-gray-600">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
