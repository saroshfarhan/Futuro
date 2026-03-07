"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUserProfile } from "@/context/UserProfileContext";
import { api } from "@/lib/api";

const PLAN_TIERS = ["Basic", "Essential", "Standard", "Plus", "Premium"];
const PLAN_COLORS = [
  { bg: "bg-gray-50", border: "border-gray-200", badge: "bg-gray-100 text-gray-700", accent: "text-gray-600" },
  { bg: "bg-blue-50", border: "border-blue-200", badge: "bg-blue-100 text-blue-700", accent: "text-blue-600" },
  { bg: "bg-indigo-50", border: "border-indigo-200", badge: "bg-indigo-100 text-indigo-700", accent: "text-indigo-600" },
  { bg: "bg-purple-50", border: "border-purple-200", badge: "bg-purple-100 text-purple-700", accent: "text-purple-600" },
  { bg: "bg-amber-50", border: "border-amber-200", badge: "bg-amber-100 text-amber-700 font-semibold", accent: "text-amber-600" },
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
  const { profile, userId } = useUserProfile();
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [recommendation, setRecommendation] = useState<RecommendResult | null>(null);
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
  const [budgetSensitive, setBudgetSensitive] = useState(false);
  const [comparingPlans, setComparingPlans] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [recLoading, setRecLoading] = useState(false);

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

  const getRecommendation = async () => {
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
  };

  useEffect(() => {
    if (selectedPriorities.length > 0) {
      getRecommendation();
    }
  }, [selectedPriorities, budgetSensitive]);

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
        <div className="text-gray-400 text-sm">Loading plans…</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Choose Your Plan</h1>
        <p className="text-gray-600">
          {profile.health_priorities && profile.health_priorities.length > 0
            ? `Based on your profile, we've pre-selected your priorities. Adjust below to explore.`
            : "Select your health priorities to get a personalised recommendation."}
        </p>
      </div>

      {/* Priority filters */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">What matters most to you?</h2>
        <div className="flex flex-wrap gap-2 mb-4">
          {PRIORITY_OPTIONS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => togglePriority(key)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                selectedPriorities.includes(key)
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
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
            className="h-4 w-4 rounded border-gray-300 text-indigo-600"
          />
          <span className="text-sm text-gray-600">I'm budget-conscious — show cheaper options first</span>
        </label>
      </div>

      {/* Recommendation banner */}
      <AnimatePresence>
        {recommendation && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-6 rounded-2xl bg-linear-to-r from-indigo-600 to-purple-600 p-5 text-white shadow-lg"
          >
            <div className="flex items-start gap-4">
              <div className="shrink-0 h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center text-2xl font-bold">
                {recommendation.recommended_plan.plan_id}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-lg mb-1">
                  We recommend Plan {recommendation.recommended_plan.plan_id} — {PLAN_TIERS[recommendation.recommended_plan.plan_id - 1]}
                </p>
                <p className="text-indigo-100 text-sm">{recommendation.recommendation_reason}</p>
                {recommendation.recommended_plan.reasoning?.slice(0, 2).map((r, i) => (
                  <p key={i} className="text-indigo-200 text-xs mt-1">• {r}</p>
                ))}
              </div>
              <div className="shrink-0 text-right">
                <div className="text-3xl font-bold">{recommendation.recommended_plan.score}</div>
                <div className="text-indigo-200 text-xs">match score</div>
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

          return (
            <motion.div
              key={plan.id}
              layout
              className={`relative rounded-2xl border-2 p-4 transition-all ${
                recommended
                  ? "border-indigo-400 shadow-lg shadow-indigo-100 scale-[1.02]"
                  : runnerUp
                  ? "border-purple-300 shadow-md"
                  : comparing
                  ? "border-emerald-400 shadow-md"
                  : `${colors.border}`
              } ${colors.bg}`}
            >
              {recommended && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-3 py-0.5 text-xs font-semibold text-white whitespace-nowrap">
                  ⭐ Best for you
                </div>
              )}
              {runnerUp && !recommended && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-purple-500 px-3 py-0.5 text-xs font-semibold text-white whitespace-nowrap">
                  Runner up
                </div>
              )}

              <div className="mb-3">
                <span className={`inline-block rounded-full px-2 py-0.5 text-xs ${colors.badge} mb-2`}>
                  {plan.tier}
                </span>
                <h3 className="font-bold text-gray-900">{plan.name}</h3>
                {score !== undefined && (
                  <div className="mt-1 flex items-center gap-1.5">
                    <div className="flex-1 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${recommended ? "bg-indigo-500" : "bg-gray-400"}`}
                        style={{ width: `${score}%` }}
                      />
                    </div>
                    <span className={`text-xs font-medium ${colors.accent}`}>{score}</span>
                  </div>
                )}
              </div>

              <div className="space-y-1.5 mb-4">
                {Object.entries(plan.key_benefits).slice(0, 5).map(([key, val]) => (
                  <div key={key}>
                    <div className="flex items-start gap-1.5">
                      <span className="text-xs shrink-0 mt-0.5">{BENEFIT_ICONS[key] || "•"}</span>
                      <div>
                        <div className="text-xs text-gray-500 capitalize">{key.replace("_", " ")}</div>
                        <div className="text-xs font-medium text-gray-800 leading-tight">{val.split("\n")[0].slice(0, 60)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => toggleCompare(plan.id)}
                className={`w-full rounded-lg py-1.5 text-xs font-medium transition-colors ${
                  comparing
                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                    : "border border-gray-300 bg-white text-gray-700 hover:border-indigo-300 hover:text-indigo-700"
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
            className="bg-white rounded-2xl border border-emerald-200 p-6 shadow-md"
          >
            <h2 className="font-bold text-gray-900 mb-4 text-lg">
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
                        <th className="text-left py-2 pr-4 text-gray-500 font-medium w-1/3">Benefit</th>
                        <th className="text-left py-2 pr-4 text-indigo-700 font-semibold">{planA.name} ({planA.tier})</th>
                        <th className="text-left py-2 text-purple-700 font-semibold">{planB.name} ({planB.tier})</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.keys(planA.key_benefits).map((key) => (
                        <tr key={key} className="border-t border-gray-50">
                          <td className="py-2.5 pr-4 text-gray-500 capitalize font-medium">
                            {BENEFIT_ICONS[key]} {key.replace("_", " ")}
                          </td>
                          <td className="py-2.5 pr-4 text-gray-800">
                            {planA.key_benefits[key]?.split("\n")[0] || "—"}
                          </td>
                          <td className="py-2.5 text-gray-800">
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
              className="mt-4 text-sm text-gray-500 hover:text-gray-700"
            >
              Clear comparison
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CTA to chat */}
      <div className="mt-8 rounded-2xl bg-linear-to-br from-gray-900 to-gray-800 p-6 text-white">
        <p className="font-semibold mb-1">Not sure which plan is right for you?</p>
        <p className="text-gray-400 text-sm mb-3">Chat with Futuro — just describe your situation and we'll guide you to the right plan.</p>
        <a
          href="/chat"
          className="inline-block rounded-lg bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-100 transition-colors"
        >
          Chat with AI assistant →
        </a>
      </div>
    </div>
  );
}
