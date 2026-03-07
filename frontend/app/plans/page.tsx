"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUserProfile } from "@/context/UserProfileContext";
import { api } from "@/lib/api";

const PLAN_TIERS = ["Basic", "Essential", "Standard", "Plus", "Premium"];
const PLAN_COLORS = [
  { badge: "bg-white/10 text-zinc-200", accent: "text-zinc-300" },
  { badge: "bg-blue-500/15 text-blue-300", accent: "text-blue-300" },
  { badge: "bg-teal-500/15 text-teal-300", accent: "text-teal-300" },
  { badge: "bg-cyan-500/15 text-cyan-300", accent: "text-cyan-300" },
  { badge: "bg-kota-green/15 text-kota-green font-semibold", accent: "text-kota-green" },
];

const BENEFIT_ICONS: Record<string, string> = {
  gp: "👨‍⚕️",
  physio: "💪",
  maternity: "🤱",
  hospital: "🏥",
  consultant: "🩺",
  dental: "🦷",
  excess: "💶",
};

const PRIORITY_OPTIONS = [
  { key: "gp", label: "GP visits" },
  { key: "physio", label: "Physiotherapy" },
  { key: "maternity", label: "Maternity" },
  { key: "dental", label: "Dental" },
  { key: "mental_health", label: "Mental health" },
  { key: "consultant", label: "Consultants" },
  { key: "hospital", label: "Hospital cover" },
  { key: "cancer", label: "Cancer support" },
  { key: "international", label: "International" },
];

interface PlanSummary {
  id: number;
  name: string;
  tier: string;
  key_benefits: Record<string, string>;
}

interface RecommendResult {
  recommended_plan: { plan_id: number; score: number; reasoning: string[] };
  runner_up: { plan_id: number; score: number };
  all_scores: { plan_id: number; score: number }[];
  recommendation_reason: string;
}

export default function PlansPage() {
  const { profile } = useUserProfile();
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [recommendation, setRecommendation] = useState<RecommendResult | null>(null);
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
  const [budgetSensitive, setBudgetSensitive] = useState(false);
  const [comparingPlans, setComparingPlans] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setRecLoading] = useState(false);

  // Seed priorities from profile
  useEffect(() => {
    if (profile.health_priorities && profile.health_priorities.length > 0) {
      setSelectedPriorities(profile.health_priorities);
    }
  }, [profile.health_priorities]);

  useEffect(() => {
    api.getPlans().then((res) => {
      setPlans(res.plans);
      setLoading(false);
    });
  }, []);

  const getRecommendation = useCallback(async () => {
    if (selectedPriorities.length === 0) return;
    setRecLoading(true);
    try {
      const res = await api.recommendPlan({
        health_priorities: selectedPriorities,
        budget_sensitive: budgetSensitive,
      });
      setRecommendation(res);
    } finally {
      setRecLoading(false);
    }
  }, [selectedPriorities, budgetSensitive]);

  useEffect(() => {
    if (selectedPriorities.length > 0) getRecommendation();
  }, [selectedPriorities.length, getRecommendation]);

  const togglePriority = (key: string) => {
    setSelectedPriorities((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  };

  const toggleCompare = (planId: number) => {
    setComparingPlans((prev) => {
      if (prev.includes(planId)) return prev.filter((p) => p !== planId);
      if (prev.length >= 2) return [prev[1], planId];
      return [...prev, planId];
    });
  };

  const getScore = (planId: number) => {
    return recommendation?.all_scores.find((s) => s.plan_id === planId)?.score;
  };

  const isRecommended = (planId: number) =>
    recommendation?.recommended_plan.plan_id === planId;

  const isRunnerUp = (planId: number) =>
    recommendation?.runner_up?.plan_id === planId;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-sm text-slate-400">Loading plans…</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="kota-section-title mb-2 text-3xl font-bold">Choose Your Plan</h1>
        <p className="text-slate-600">
          {profile.health_priorities && profile.health_priorities.length > 0
            ? "Based on your profile, we have pre-selected your priorities. Adjust below to explore."
            : "Select your health priorities to get a personalised recommendation."}
        </p>
      </div>

      {/* Priority filters */}
      <div className="kota-panel mb-6 p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">What matters most to you?</h2>
        <div className="flex flex-wrap gap-2 mb-4">
          {PRIORITY_OPTIONS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => togglePriority(key)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                selectedPriorities.includes(key)
                  ? "bg-blue-600 text-white"
                  : "kota-pill text-slate-600 hover:bg-blue-50 hover:text-blue-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={budgetSensitive}
            onChange={(e) => setBudgetSensitive(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-blue-600"
          />
          <span className="text-sm text-slate-600">I&apos;m budget-conscious — show cheaper options first</span>
        </label>
      </div>

      {/* Recommendation banner */}
      <AnimatePresence>
        {recommendation && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="kota-panel-strong mb-6 bg-linear-to-r from-[#0f4f97] to-[#1570ef] p-5 text-white"
          >
            <div className="flex items-start gap-4">
              <div className="shrink-0 h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center text-2xl font-bold">
                {recommendation.recommended_plan.plan_id}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-lg mb-1">
                  We recommend Plan {recommendation.recommended_plan.plan_id} — {PLAN_TIERS[recommendation.recommended_plan.plan_id - 1]}
                </p>
                <p className="text-blue-100 text-sm">{recommendation.recommendation_reason}</p>
                {recommendation.recommended_plan.reasoning?.slice(0, 2).map((r, i) => (
                  <p key={i} className="mt-1 text-xs text-blue-200">• {r}</p>
                ))}
              </div>
              <div className="shrink-0 text-right">
                <div className="text-3xl font-bold">{recommendation.recommended_plan.score}</div>
                <div className="text-xs text-blue-200">match score</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Plan grid */}
      <div className="grid md:grid-cols-5 gap-4 mb-8">
        {plans.map((plan, i) => {
          const colors = PLAN_COLORS[i];
          const score = getScore(plan.id);
          const recommended = isRecommended(plan.id);
          const runnerUp = isRunnerUp(plan.id);
          const comparing = comparingPlans.includes(plan.id);
          const scoreTone = recommended
            ? "text-kota-green"
            : runnerUp
            ? "text-blue-300"
            : comparing
            ? "text-teal-300"
            : colors.accent;
          const scoreBar = recommended
            ? "bg-kota-green"
            : runnerUp
            ? "bg-blue-400"
            : comparing
            ? "bg-teal-400"
            : "bg-zinc-400";

          return (
            <motion.div
              key={plan.id}
              layout
              className={`relative rounded-2xl border p-4 backdrop-blur-sm transition-all ${
                recommended
                  ? "scale-[1.02] border-kota-green shadow-[0_0_26px_rgba(0,200,150,0.26)]"
                  : runnerUp
                  ? "border-blue-400/80 shadow-[0_0_18px_rgba(59,130,246,0.22)]"
                  : comparing
                  ? "border-teal-400/80 shadow-[0_0_18px_rgba(45,212,191,0.2)]"
                  : "border-white/10 hover:border-white/20"
              } bg-white/5`}
            >
              {recommended && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-kota-green px-3 py-0.5 text-xs font-semibold text-kota-dark">
                  ⭐ Best for you
                </div>
              )}
              {runnerUp && !recommended && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-blue-500 px-3 py-0.5 text-xs font-semibold text-white">
                  Runner up
                </div>
              )}

              <div className="mb-3">
                <span className={`inline-block rounded-full px-2 py-0.5 text-xs ${colors.badge} mb-2`}>
                  {plan.tier}
                </span>
                <h3 className="font-bold text-zinc-100">{plan.name}</h3>
                {score !== undefined && (
                  <div className="mt-1 flex items-center gap-1.5">
                    <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div
                        className={`h-full rounded-full ${scoreBar}`}
                        style={{ width: `${score}%` }}
                      />
                    </div>
                    <span className={`text-xs font-semibold ${scoreTone}`}>{score}</span>
                  </div>
                )}
              </div>

              <div className="space-y-1.5 mb-4">
                {Object.entries(plan.key_benefits).slice(0, 5).map(([key, val]) => (
                  <div key={key}>
                    <div className="flex items-start gap-1.5">
                      <span className="text-xs shrink-0 mt-0.5">{BENEFIT_ICONS[key] || "•"}</span>
                      <div>
                        <div className="text-xs text-zinc-400 capitalize">{key.replace("_", " ")}</div>
                        <div className="text-xs font-medium text-zinc-100 leading-tight">{val.split("\n")[0].slice(0, 60)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => toggleCompare(plan.id)}
                className={`w-full rounded-lg py-1.5 text-xs font-medium transition-colors ${
                  comparing
                    ? "kota-btn-primary"
                    : "kota-btn-secondary text-zinc-100 hover:text-kota-green"
                }`}
              >
                {comparing ? "✓ Comparing" : "Compare"}
              </button>
            </motion.div>
          );
        })}
      </div>

      {/* Side-by-side comparison */}
      <AnimatePresence>
        {comparingPlans.length === 2 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="kota-panel p-6"
          >
            <h2 className="mb-4 text-lg font-bold text-slate-900">
              Plan {comparingPlans[0]} vs Plan {comparingPlans[1]}
            </h2>
            {plans.length > 0 && (() => {
              const planA = plans.find((p) => p.id === comparingPlans[0])!;
              const planB = plans.find((p) => p.id === comparingPlans[1])!;
              return (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        <th className="w-1/3 py-2 pr-4 text-left font-medium text-slate-500">Benefit</th>
                        <th className="py-2 pr-4 text-left font-semibold text-blue-700">{planA.name} ({planA.tier})</th>
                        <th className="py-2 text-left font-semibold text-cyan-700">{planB.name} ({planB.tier})</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.keys(planA.key_benefits).map((key) => (
                        <tr key={key} className="border-t border-slate-100">
                          <td className="py-2.5 pr-4 font-medium capitalize text-slate-500">
                            {BENEFIT_ICONS[key]} {key.replace("_", " ")}
                          </td>
                          <td className="py-2.5 pr-4 text-slate-800">
                            {planA.key_benefits[key]?.split("\n")[0] || "—"}
                          </td>
                          <td className="py-2.5 text-slate-800">
                            {planB.key_benefits[key]?.split("\n")[0] || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
            <button
              onClick={() => setComparingPlans([])}
              className="mt-4 text-sm text-slate-500 hover:text-slate-700"
            >
              Clear comparison
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CTA to chat */}
      <div className="kota-panel-strong mt-8 bg-linear-to-br from-[#0f2747] to-[#173b66] p-6 text-white">
        <p className="font-semibold mb-1">Not sure which plan is right for you?</p>
        <p className="mb-3 text-sm text-blue-100/80">Chat with Futuro — just describe your situation and we will guide you to the right plan.</p>
        <a
          href="/chat"
          className="kota-btn-secondary inline-block px-4 py-2 text-sm text-blue-800"
        >
          Chat with AI assistant →
        </a>
      </div>
    </div>
  );
}
