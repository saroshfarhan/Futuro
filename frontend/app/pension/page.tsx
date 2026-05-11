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
  {
    key: "conservative",
    label: "Conservative",
    rate: "4% growth",
    desc: "Lower risk, steady returns",
    selected: "border-blue-400 bg-blue-500/12",
    rateTone: "bg-blue-500/15 text-blue-300 border border-blue-400/35",
  },
  {
    key: "moderate",
    label: "Moderate",
    rate: "6% growth",
    desc: "Balanced risk and return",
    selected: "border-kota-green bg-kota-green/12",
    rateTone: "bg-kota-green/15 text-kota-green border border-kota-green/35",
  },
  {
    key: "aggressive",
    label: "Aggressive",
    rate: "8% growth",
    desc: "Higher risk, higher potential",
    selected: "border-amber-400 bg-amber-500/12",
    rateTone: "bg-amber-500/15 text-amber-300 border border-amber-400/35",
  },
];

const LIFESTYLE_COLORS: Record<string, string> = {
  "Back to Basics": "from-slate-500 to-slate-700",
  "Comfortable Retiree": "from-blue-400 to-blue-600",
  "Active Explorer": "from-cyan-500 to-blue-700",
  "Mediterranean Retiree": "from-sky-500 to-indigo-700",
  "Golden Years": "from-blue-500 to-indigo-700",
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
        <span className="text-sm text-slate-600">{label}</span>
        <span className="text-sm font-bold text-slate-900">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-blue-600"
      />
      <div className="mt-1 flex justify-between text-xs text-slate-400">
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
    ? LIFESTYLE_COLORS[result.lifestyle_bucket.title] || "from-sky-500 to-indigo-700"
    : "from-sky-500 to-indigo-700";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="kota-section-title mb-2 text-3xl font-bold">Your Pension Journey</h1>
        <p className="text-slate-600">
          {profile.age && profile.salary
            ? "We've pre-filled this from your chat profile. Adjust the sliders to explore."
            : "Tell us about yourself below — or chat first to auto-fill everything."}
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Controls column */}
        <div className="space-y-5">
          <div className="kota-panel p-5">
            <h2 className="mb-5 text-sm font-semibold text-slate-700">Your Details</h2>
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
                format={(v) => `€${v.toLocaleString('en-IE')}`}
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
          <div className="kota-panel p-5">
            <h2 className="mb-3 text-sm font-semibold text-zinc-100">Investment Strategy</h2>
            <div className="space-y-2">
              {RISK_OPTIONS.map((r) => (
                <button
                  key={r.key}
                  onClick={() => setRisk(r.key)}
                  className={`w-full rounded-xl border-2 p-3 text-left transition-all ${
                    risk === r.key
                      ? `${r.selected} shadow-[0_0_0_1px_rgba(255,255,255,0.04)]`
                      : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-medium ${risk === r.key ? "text-zinc-100" : "text-zinc-200"}`}>
                      {r.label}
                    </span>
                    <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${r.rateTone}`}>{r.rate}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-zinc-400">{r.desc}</p>
                </button>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-zinc-500">
              Risk scale: Conservative (lower volatility) to Aggressive (higher volatility).
            </p>
          </div>

          {/* Tax relief badge */}
          {result && (
            <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4">
              <p className="mb-1 text-xs font-semibold text-cyan-800">Irish Tax Relief</p>
              <p className="text-2xl font-bold text-cyan-900">{result.tax_relief_rate_pct}%</p>
              <p className="mt-1 text-xs text-cyan-700">
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
                className={`kota-panel-strong bg-linear-to-br ${lifestyleBg} p-6 text-white`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-white/70 text-sm mb-1">At {retirementAge}, your lifestyle could be…</p>
                    <h2 className="text-2xl font-bold">{result.lifestyle_bucket.emoji} {result.lifestyle_bucket.title}</h2>
                    <p className="text-white/80 mt-1 text-sm">{result.lifestyle_bucket.description}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-3xl font-bold">€{result.total_monthly_income.toLocaleString('en-IE')}</div>
                    <div className="text-white/70 text-sm">per month</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl bg-white/15 p-3">
                    <div className="text-white/60 text-xs mb-1">From your pot</div>
                    <div className="font-bold text-lg">€{result.monthly_from_pot.toLocaleString('en-IE')}/mo</div>
                  </div>
                  <div className="rounded-xl bg-white/15 p-3">
                    <div className="text-white/60 text-xs mb-1">State pension</div>
                    <div className="font-bold text-lg">€{result.monthly_state_pension.toLocaleString('en-IE')}/mo</div>
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
            <div className="kota-panel p-5">
              <h2 className="mb-4 text-sm font-semibold text-slate-700">Pension Pot Growth</h2>
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
                    formatter={(v) => [`€${Number(v).toLocaleString('en-IE')}`, "Pension pot"]}
                    labelFormatter={(l) => `Age ${l}`}
                    contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "12px" }}
                  />
                  <ReferenceLine
                    x={retirementAge}
                    stroke="#1570ef"
                    strokeDasharray="4 4"
                    label={{ value: "Retire", position: "top", fontSize: 11, fill: "#1570ef" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="pot"
                    stroke="#1570ef"
                    strokeWidth={2.5}
                    dot={{ fill: "#1570ef", r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Latte factor + peer comparison */}
          {result && (
            <div className="grid md:grid-cols-2 gap-4">
              <div className="kota-panel p-5">
                <h3 className="mb-3 text-sm font-semibold text-slate-700">The +1% Impact</h3>
                <p className="mb-3 text-xs text-slate-500">
                  What does contributing 1% more actually cost you per day, after tax relief?
                </p>
                <div className="mb-1 text-3xl font-bold text-slate-900">
                  €{result.latte_factor_1pct.daily_cost.toFixed(2)}
                  <span className="text-base font-normal text-slate-500">/day</span>
                </div>
                <p className="text-sm font-medium text-blue-700">
                  {result.latte_factor_1pct.comparison}
                </p>
                <p className="mt-2 text-xs text-slate-400">
                  That 1% extra = €{result.latte_factor_1pct.annual_gross_extra.toLocaleString('en-IE')}/yr gross, just €{result.latte_factor_1pct.annual_net_extra.toLocaleString('en-IE')}/yr after {result.latte_factor_1pct.tax_relief_pct}% tax relief.
                </p>
              </div>

              <div className="kota-panel p-5">
                <h3 className="mb-3 text-sm font-semibold text-slate-700">How You Compare</h3>
                <p className="mb-3 text-xs text-slate-500">
                  vs. Irish peers in their {result.peer_comparison.age_group}
                </p>
                <div className="flex items-end gap-4 mb-3">
                  <div>
                    <div className="text-2xl font-bold text-blue-700">{result.peer_comparison.your_rate}%</div>
                    <div className="text-xs text-slate-500">Your rate</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-slate-400">{result.peer_comparison.peer_average_rate}%</div>
                    <div className="text-xs text-slate-500">Peer average</div>
                  </div>
                  <div className="ml-auto text-right">
                    <div className="text-xl font-bold text-teal-600">Top {100 - result.peer_comparison.percentile}%</div>
                    <div className="text-xs text-slate-500">of savers</div>
                  </div>
                </div>
                <p className="text-xs leading-relaxed text-slate-600">{result.peer_comparison.message}</p>
              </div>
            </div>
          )}

          {/* Loading state */}
          {loading && !result && (
            <div className="kota-panel flex h-48 items-center justify-center">
              <div className="text-sm text-slate-400">Calculating your pension…</div>
            </div>
          )}

          {/* CTA */}
          <div className="kota-panel-strong bg-linear-to-br from-[#0f2747] to-[#173b66] p-5 text-white">
            <p className="font-semibold mb-1">Want a more personalised projection?</p>
            <p className="mb-3 text-sm text-blue-100/80">
              Chat with Futuro — mention your salary and retirement plans, and we&apos;ll fill this in automatically.
            </p>
            <a
              href="/chat"
              className="kota-btn-secondary inline-block px-4 py-2 text-sm text-blue-800"
            >
              Open AI assistant →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
