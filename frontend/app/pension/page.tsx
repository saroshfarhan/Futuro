"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { useUserProfile } from "@/context/UserProfileContext";
import { api, type PensionResult } from "@/lib/api";

const RISK_OPTIONS = [
  { key: "conservative", label: "Conservative", rate: "4% growth", color: "text-blue-600", desc: "Lower risk, steady returns" },
  { key: "moderate", label: "Moderate", rate: "6% growth", color: "text-indigo-600", desc: "Balanced risk and return" },
  { key: "aggressive", label: "Aggressive", rate: "8% growth", color: "text-purple-600", desc: "Higher risk, higher potential" },
];

const LIFESTYLE_COLORS: Record<string, string> = {
  "Back to Basics": "from-gray-400 to-gray-600",
  "Comfortable Retiree": "from-blue-400 to-blue-600",
  "Active Explorer": "from-indigo-400 to-indigo-600",
  "Mediterranean Retiree": "from-amber-400 to-orange-500",
  "Golden Years": "from-yellow-400 to-amber-500",
};

function formatEuro(n: number): string {
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(2)}m`;
  if (n >= 1_000) return `€${(n / 1_000).toFixed(0)}k`;
  return `€${n}`;
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format: (v: number) => string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-600">{label}</span>
        <span className="text-sm font-bold text-gray-900">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none bg-gray-200 cursor-pointer accent-indigo-600"
      />
      <div className="flex justify-between text-xs text-gray-400 mt-1">
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
    </div>
  );
}

export default function PensionPage() {
  const { profile, userId } = useUserProfile();

  const [age, setAge] = useState(profile.age || 30);
  const [salary, setSalary] = useState(profile.salary || 50000);
  const [contributionRate, setContributionRate] = useState(5);
  const [retirementAge, setRetirementAge] = useState(profile.retirement_age || 65);
  const [risk, setRisk] = useState(profile.risk_tolerance || "moderate");
  const [result, setResult] = useState<PensionResult | null>(null);
  const [loading, setLoading] = useState(false);

  // Sync profile changes
  useEffect(() => {
    if (profile.age) setAge(profile.age);
    if (profile.salary) setSalary(profile.salary);
    if (profile.retirement_age) setRetirementAge(profile.retirement_age);
    if (profile.risk_tolerance) setRisk(profile.risk_tolerance);
  }, [profile.age, profile.salary, profile.retirement_age, profile.risk_tolerance]);

  const calculate = useCallback(async () => {
    if (age >= retirementAge) return;
    setLoading(true);
    try {
      const res = await api.calculatePension({
        age,
        salary,
        contribution_rate: contributionRate,
        retirement_age: retirementAge,
        risk,
        user_id: userId,
      });
      setResult(res);
    } finally {
      setLoading(false);
    }
  }, [age, salary, contributionRate, retirementAge, risk, userId]);

  useEffect(() => {
    const t = setTimeout(calculate, 400);
    return () => clearTimeout(t);
  }, [calculate]);

  const chartData = result
    ? Object.entries(result.pot_at_decade).map(([yr, val]) => ({
        age: Number(yr),
        pot: val,
        label: formatEuro(val),
      }))
    : [];

  const lifestyleBg = result
    ? LIFESTYLE_COLORS[result.lifestyle_bucket.title] || "from-indigo-400 to-purple-500"
    : "from-indigo-400 to-purple-500";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Pension Journey</h1>
        <p className="text-gray-600">
          {profile.age && profile.salary
            ? "We've pre-filled this from your chat profile. Adjust the sliders to explore."
            : "Tell us about yourself below — or chat first to auto-fill everything."}
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Controls column */}
        <div className="space-y-5">
          <div className="rounded-2xl bg-white border border-gray-200 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-700 mb-5">Your Details</h2>
            <div className="space-y-6">
              <Slider
                label="Current Age"
                value={age}
                min={20}
                max={64}
                step={1}
                onChange={setAge}
                format={(v) => `${v} yrs`}
              />
              <Slider
                label="Annual Salary"
                value={salary}
                min={20000}
                max={200000}
                step={1000}
                onChange={setSalary}
                format={(v) => `€${v.toLocaleString()}`}
              />
              <Slider
                label="Contribution Rate"
                value={contributionRate}
                min={1}
                max={40}
                step={0.5}
                onChange={setContributionRate}
                format={(v) => `${v}%`}
              />
              <Slider
                label="Retirement Age"
                value={retirementAge}
                min={55}
                max={75}
                step={1}
                onChange={setRetirementAge}
                format={(v) => `${v} yrs`}
              />
            </div>
          </div>

          {/* Risk selector */}
          <div className="rounded-2xl bg-white border border-gray-200 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Investment Strategy</h2>
            <div className="space-y-2">
              {RISK_OPTIONS.map((r) => (
                <button
                  key={r.key}
                  onClick={() => setRisk(r.key)}
                  className={`w-full rounded-xl border-2 p-3 text-left transition-all ${
                    risk === r.key
                      ? "border-indigo-400 bg-indigo-50"
                      : "border-gray-200 bg-gray-50 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-medium ${risk === r.key ? "text-indigo-700" : "text-gray-700"}`}>
                      {r.label}
                    </span>
                    <span className={`text-xs font-semibold ${r.color}`}>{r.rate}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{r.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Tax relief badge */}
          {result && (
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4">
              <p className="text-xs font-semibold text-emerald-700 mb-1">Irish Tax Relief</p>
              <p className="text-2xl font-bold text-emerald-800">{result.tax_relief_rate_pct}%</p>
              <p className="text-xs text-emerald-600 mt-1">
                Your contribution costs you just <strong>€{result.monthly_net_cost}/month</strong> after tax relief.
              </p>
            </div>
          )}
        </div>

        {/* Results column (2/3 width) */}
        <div className="lg:col-span-2 space-y-5">
          {/* Lifestyle card — the hero */}
          <AnimatePresence mode="wait">
            {result && (
              <motion.div
                key={result.lifestyle_bucket.title}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                className={`rounded-2xl bg-linear-to-br ${lifestyleBg} p-6 text-white shadow-lg`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-white/70 text-sm mb-1">At {retirementAge}, your lifestyle could be…</p>
                    <h2 className="text-2xl font-bold">{result.lifestyle_bucket.emoji} {result.lifestyle_bucket.title}</h2>
                    <p className="text-white/80 mt-1 text-sm">{result.lifestyle_bucket.description}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-3xl font-bold">€{result.total_monthly_income.toLocaleString()}</div>
                    <div className="text-white/70 text-sm">per month</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl bg-white/15 p-3">
                    <div className="text-white/60 text-xs mb-1">From your pot</div>
                    <div className="font-bold text-lg">€{result.monthly_from_pot.toLocaleString()}/mo</div>
                  </div>
                  <div className="rounded-xl bg-white/15 p-3">
                    <div className="text-white/60 text-xs mb-1">State pension</div>
                    <div className="font-bold text-lg">€{result.monthly_state_pension.toLocaleString()}/mo</div>
                  </div>
                  <div className="rounded-xl bg-white/15 p-3">
                    <div className="text-white/60 text-xs mb-1">Pot size</div>
                    <div className="font-bold text-lg">{formatEuro(result.projected_pot)}</div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <p className="text-white/70 text-xs w-full font-medium">Your retirement could include:</p>
                  {result.lifestyle_bucket.activities.map((a) => (
                    <span key={a} className="rounded-full bg-white/20 px-2.5 py-1 text-xs">
                      {a}
                    </span>
                  ))}
                  <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs">
                    📍 {result.lifestyle_bucket.location}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Growth chart */}
          {result && chartData.length > 0 && (
            <div className="rounded-2xl bg-white border border-gray-200 p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Pension Pot Growth</h2>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="age"
                    tick={{ fontSize: 11, fill: "#6b7280" }}
                    tickLine={false}
                    label={{ value: "Age", position: "insideBottomRight", offset: -5, fontSize: 11, fill: "#9ca3af" }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#6b7280" }}
                    tickLine={false}
                    tickFormatter={(v) => formatEuro(v)}
                  />
                  <Tooltip
                    formatter={(v) => [`€${Number(v).toLocaleString()}`, "Pension pot"]}
                    labelFormatter={(l) => `Age ${l}`}
                    contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "12px" }}
                  />
                  <ReferenceLine
                    x={retirementAge}
                    stroke="#6366f1"
                    strokeDasharray="4 4"
                    label={{ value: "Retire", position: "top", fontSize: 11, fill: "#6366f1" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="pot"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    dot={{ fill: "#6366f1", r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Latte factor + peer comparison */}
          {result && (
            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-2xl bg-white border border-gray-200 p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">The +1% Impact</h3>
                <p className="text-gray-500 text-xs mb-3">
                  What does contributing 1% more actually cost you per day, after tax relief?
                </p>
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  €{result.latte_factor_1pct.daily_cost.toFixed(2)}
                  <span className="text-base font-normal text-gray-500">/day</span>
                </div>
                <p className="text-sm text-indigo-600 font-medium">
                  {result.latte_factor_1pct.comparison}
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  That 1% extra = €{result.latte_factor_1pct.annual_gross_extra.toLocaleString()}/yr gross, just €{result.latte_factor_1pct.annual_net_extra.toLocaleString()}/yr after {result.latte_factor_1pct.tax_relief_pct}% tax relief.
                </p>
              </div>

              <div className="rounded-2xl bg-white border border-gray-200 p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">How You Compare</h3>
                <p className="text-gray-500 text-xs mb-3">
                  vs. Irish peers in their {result.peer_comparison.age_group}
                </p>
                <div className="flex items-end gap-4 mb-3">
                  <div>
                    <div className="text-2xl font-bold text-indigo-600">{result.peer_comparison.your_rate}%</div>
                    <div className="text-xs text-gray-500">Your rate</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-400">{result.peer_comparison.peer_average_rate}%</div>
                    <div className="text-xs text-gray-500">Peer average</div>
                  </div>
                  <div className="ml-auto text-right">
                    <div className="text-xl font-bold text-emerald-600">Top {100 - result.peer_comparison.percentile}%</div>
                    <div className="text-xs text-gray-500">of savers</div>
                  </div>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">{result.peer_comparison.message}</p>
              </div>
            </div>
          )}

          {/* Loading state */}
          {loading && !result && (
            <div className="flex items-center justify-center h-48 rounded-2xl bg-white border border-gray-200">
              <div className="text-gray-400 text-sm">Calculating your pension…</div>
            </div>
          )}

          {/* CTA */}
          <div className="rounded-2xl bg-gray-900 p-5 text-white">
            <p className="font-semibold mb-1">Want a more personalised projection?</p>
            <p className="text-gray-400 text-sm mb-3">
              Chat with Futuro — mention your salary and retirement plans, and we&apos;ll fill this in automatically.
            </p>
            <a
              href="/chat"
              className="inline-block rounded-lg bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-100 transition-colors"
            >
              Open AI assistant →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
