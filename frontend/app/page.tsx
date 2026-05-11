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
    tone: "bg-kota-green/15 text-kota-green",
  },
  {
    href: "/plans",
    icon: "🏥",
    title: "Smart Plan Picker",
    description:
      "Compare all 5 insurance plans with personalised recommendations based on your health needs.",
    tone: "bg-blue-500/15 text-blue-300",
  },
  {
    href: "/pension",
    icon: "📈",
    title: "Engaging Pension Calculator",
    description:
      "See your retirement as a lifestyle, not just a number. Interactive, visual, and actually motivating.",
    tone: "bg-teal-500/15 text-teal-300",
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
    <div className="min-h-screen bg-kota-dark text-zinc-100">
      {/* Hero */}
      <section className="relative overflow-hidden px-4 py-16">
        <div className="absolute inset-0 opacity-40">
          <div className="absolute top-0 left-0 h-64 w-64 rounded-full bg-kota-green/20 blur-3xl" />
          <div className="absolute right-0 bottom-0 h-80 w-80 rounded-full bg-blue-500/15 blur-3xl" />
        </div>
        <div className="kota-panel-strong relative mx-auto max-w-5xl border-white/10 bg-kota-charcoal/80 p-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="kota-pill mb-6 inline-block border-kota-green/35 bg-kota-green/10 px-4 py-1.5 text-sm font-medium text-kota-green">
              AI-powered benefits &amp; pension platform
            </span>
            <h1 className="mb-6 text-5xl font-bold tracking-tight text-zinc-100">
              Your benefits, finally{" "}
              <span className="text-kota-green">making sense</span>
            </h1>
            <p className="mx-auto mb-10 max-w-2xl text-lg text-zinc-300">
              One platform to understand your health insurance, find the right plan, and see your
              retirement as a real lifestyle — not just a spreadsheet.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/chat"
                className="kota-btn-primary px-8 py-3.5 text-base"
              >
                Start Chatting
              </Link>
              <Link
                href="/pension"
                className="kota-btn-secondary px-8 py-3.5 text-base text-zinc-100"
              >
                Check My Pension
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Profile prompt banner */}
      {hasProfile && (
        <div className="border-y border-kota-green/20 bg-kota-green/10 px-4 py-3">
          <div className="mx-auto max-w-7xl flex items-center justify-between">
            <p className="text-sm text-zinc-200">
              <span className="font-semibold">Your profile is {profileCompletion}% complete.</span>{" "}
              {profile.age && `Age ${profile.age}`}{profile.age && profile.salary ? " · " : ""}
              {profile.salary && `€${profile.salary.toLocaleString('en-IE')}/yr`}
              {" — "}All your data is pre-filled across all three tools.
            </p>
            <Link href="/chat" className="text-sm font-medium text-kota-green hover:text-white">
              Continue chatting →
            </Link>
          </div>
        </div>
      )}

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <h2 className="mb-8 text-center text-2xl font-bold text-zinc-100">Everything in one flow</h2>
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
                className="kota-panel block border-white/10 bg-kota-card/70 p-6 transition-all group hover:-translate-y-1"
              >
                <div
                  className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl text-2xl ${f.tone}`}
                >
                  {f.icon}
                </div>
                <h3 className="mb-2 text-lg font-semibold text-zinc-100 transition-colors group-hover:text-kota-green">
                  {f.title}
                </h3>
                <p className="text-sm leading-relaxed text-zinc-300">{f.description}</p>
                <div className="mt-4 text-sm font-medium text-kota-green group-hover:text-white">
                  Get started →
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="px-4 py-4">
        <div className="kota-panel mx-auto max-w-6xl border-white/10 bg-kota-charcoal/70 p-10">
          <div className="mx-auto max-w-4xl text-center mb-12">
            <h2 className="mb-4 text-3xl font-bold text-zinc-100">No forms. Just conversation.</h2>
            <p className="text-lg text-zinc-300">
            As you chat with Futuro, it quietly builds your profile. That data then powers your
            personalised plan recommendation and pension calculation — automatically.
            </p>
          </div>
          <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
            {[
              { step: "1", title: "Chat naturally", desc: "Ask anything about your health cover. Futuro learns about you as you talk." },
              { step: "2", title: "Profile builds silently", desc: "Age, salary, family needs — extracted from conversation, never from a form." },
              { step: "3", title: "Everything pre-filled", desc: "Visit Plans or Pension — your data is already there. No re-entry, ever." },
            ].map(({ step, title, desc }) => (
              <div key={step} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-kota-green text-sm font-bold text-kota-dark">
                  {step}
                </div>
                <h4 className="mb-1 font-semibold text-zinc-100">{title}</h4>
                <p className="text-sm text-zinc-300">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Personas */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <h2 className="mb-8 text-center text-2xl font-bold text-zinc-100">Built for everyone</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {PERSONAS.map((p) => (
            <div key={p.name} className="kota-panel border-white/10 bg-kota-card/70 p-6">
              <div className="text-4xl mb-3">{p.emoji}</div>
              <div className="mb-1 text-sm font-semibold text-kota-green">{p.role}</div>
              <div className="mb-2 font-semibold text-zinc-100">{p.name}</div>
              <p className="text-sm text-zinc-300">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
