"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUserProfile } from "@/context/UserProfileContext";
import { api, type PendingAction } from "@/lib/api";

const QUICK_ACTIONS = [
  "What's covered for physiotherapy?",
  "Compare Plan 2 vs Plan 4 for maternity",
  "Help me file a claim",
  "Book a GP appointment",
  "Which plan is best for my family?",
];

const PROFILE_LABELS: Record<string, string> = {
  age: "Age",
  salary: "Salary",
  family_size: "Family",
  health_priorities: "Health priorities",
  retirement_age: "Retirement age",
  risk_tolerance: "Risk profile",
  current_plan: "Current plan",
  location: "Location",
  is_pregnant: "Pregnant",
  is_student: "Student",
  occupation: "Occupation",
};

function formatProfileValue(key: string, val: unknown): string {
  if (key === "salary") return `€${(val as number).toLocaleString('en-IE')}/yr`;
  if (key === "family_size") {
    const labels: Record<number, string> = { 1: "Single", 2: "Couple", 3: "Couple + 1", 4: "Couple + 2", 5: "Family of 5+" };
    return labels[val as number] || `${val} people`;
  }
  if (key === "health_priorities" && Array.isArray(val)) return val.join(", ");
  if (key === "current_plan") return `Plan ${val}`;
  if (typeof val === "boolean") return val ? "Yes" : "No";
  return String(val);
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  pending_action?: PendingAction;
  action_result?: { status: string; claim_id?: string; confirmation_number?: string; message?: string };
}
type ActionResult = NonNullable<Message["action_result"]>;

function ActionReviewCard({
  action,
  userId,
  onConfirm,
  onCancel,
}: {
  action: PendingAction;
  userId: string;
  onConfirm: (result: { status: string; message?: string; claim_id?: string; confirmation_number?: string }) => void;
  onCancel: () => void;
}) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const result = await api.confirmAction({ action_id: action.action_id, user_id: userId, confirmed: true });
      onConfirm(result);
    } catch {
      onConfirm({ status: "error", message: "Failed to submit. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    await api.confirmAction({ action_id: action.action_id, user_id: userId, confirmed: false });
    onCancel();
  };

  const isClaim = action.type === "claim";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="kota-panel mt-3 p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg text-blue-700">{isClaim ? "🧾" : "📅"}</span>
        <span className="text-sm font-semibold text-slate-800">
          {isClaim ? "Review Your Claim Before Submitting" : "Review Your Appointment Request"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        {isClaim ? (
          <>
            <div className="rounded-lg border border-[var(--border)] bg-white p-2.5">
              <div className="kota-label mb-0.5">Type</div>
              <div className="text-sm font-medium capitalize text-slate-900">{action.claim_type?.replace("_", " ")}</div>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-white p-2.5">
              <div className="kota-label mb-0.5">Date</div>
              <div className="text-sm font-medium text-slate-900">{action.claim_date}</div>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-white p-2.5">
              <div className="kota-label mb-0.5">Amount</div>
              <div className="text-sm font-medium text-slate-900">€{action.amount?.toFixed(2)}</div>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-white p-2.5">
              <div className="kota-label mb-0.5">Plan</div>
              <div className="text-sm font-medium text-slate-900">Plan {action.plan_id}</div>
            </div>
          </>
        ) : (
          <>
            <div className="rounded-lg border border-[var(--border)] bg-white p-2.5">
              <div className="kota-label mb-0.5">Type</div>
              <div className="text-sm font-medium text-slate-900">{action.appointment_type}</div>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-white p-2.5">
              <div className="kota-label mb-0.5">Preferred Date</div>
              <div className="text-sm font-medium text-slate-900">{action.preferred_date}</div>
            </div>
            {action.notes && (
              <div className="col-span-2 rounded-lg border border-[var(--border)] bg-white p-2.5">
                <div className="kota-label mb-0.5">Notes</div>
                <div className="text-sm font-medium text-slate-900">{action.notes}</div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleConfirm}
          disabled={loading}
          className="kota-btn-primary flex-1 py-2 text-sm disabled:opacity-50"
        >
          {loading ? "Submitting…" : isClaim ? "Confirm & Submit Claim" : "Confirm & Book Appointment"}
        </button>
        <button
          onClick={handleCancel}
          disabled={loading}
          className="kota-btn-secondary px-4 py-2 text-sm disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </motion.div>
  );
}

function MessageBubble({
  msg,
  userId,
  onActionConfirm,
  onActionCancel,
}: {
  msg: Message;
  userId: string;
  onActionConfirm: (msgId: string, result: ActionResult) => void;
  onActionCancel: (msgId: string) => void;
}) {
  const isUser = msg.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}
    >
      <div className={`max-w-[80%] ${isUser ? "order-2" : "order-1"}`}>
        {!isUser && (
          <div className="flex items-center gap-1.5 mb-1.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-linear-to-br from-sky-500 to-blue-700 text-xs font-bold text-white">F</div>
            <span className="text-xs font-medium text-zinc-300">Futuro</span>
          </div>
        )}
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
            isUser
              ? "kota-user-message rounded-br-sm bg-kota-light shadow-md"
              : "kota-agent-message rounded-bl-sm border border-white/10 bg-kota-card"
          }`}
        >
          {msg.content}
        </div>

        {/* HITL Action Card */}
        {msg.pending_action && !msg.action_result && (
          <ActionReviewCard
            action={msg.pending_action}
            userId={userId}
            onConfirm={(result) => onActionConfirm(msg.id, result)}
            onCancel={() => onActionCancel(msg.id)}
          />
        )}

        {/* Action result */}
        {msg.action_result && (
          <div className={`mt-2 rounded-lg px-3 py-2 text-sm ${
            msg.action_result.status === "error"
              ? "border border-red-200 bg-red-50 text-red-700"
              : "border border-teal-200 bg-teal-50 text-teal-700"
          }`}>
            {msg.action_result.status === "cancelled"
              ? "❌ Cancelled — nothing was submitted."
              : msg.action_result.status === "error"
              ? `❌ ${msg.action_result.message}`
              : `✅ ${msg.action_result.message || "Done!"}`}
            {msg.action_result.claim_id && (
              <div className="mt-1 text-xs font-mono">Ref: {msg.action_result.claim_id}</div>
            )}
            {msg.action_result.confirmation_number && (
              <div className="mt-1 text-xs font-mono">Confirmation: {msg.action_result.confirmation_number}</div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function ProfileSidebar() {
  const { profile, profileCompletion, newFields, clearNewFields } = useUserProfile();

  useEffect(() => {
    if (newFields.length > 0) {
      const t = setTimeout(clearNewFields, 4000);
      return () => clearTimeout(t);
    }
  }, [newFields, clearNewFields]);

  const profileEntries = Object.entries(profile).filter(([, v]) =>
    v !== null && v !== undefined && !(Array.isArray(v) && v.length === 0)
  );

  return (
    <div className="w-72 shrink-0 overflow-y-auto border-l border-white/10 bg-[color:var(--surface)] text-zinc-100">
      <div className="border-b border-[var(--border)] p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-zinc-100">Your Profile</h2>
          <span className="text-xs font-medium text-kota-green">{profileCompletion}% complete</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full rounded-full bg-kota-green"
            animate={{ width: `${profileCompletion}%` }}
            transition={{ duration: 0.7 }}
          />
        </div>
      </div>

      {/* New field notification */}
      <AnimatePresence>
        {newFields.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mx-3 mt-3 rounded-lg border border-kota-green/40 bg-kota-green/10 px-3 py-2"
          >
            <p className="text-xs font-medium text-kota-green">
              ✨ Picked up: {newFields.join(", ")}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-4 space-y-2">
        {profileEntries.length === 0 ? (
          <p className="py-8 text-center text-xs text-zinc-400">
            Start chatting — your profile will build up here automatically.
          </p>
        ) : (
          profileEntries.map(([key, val]) => (
            <div key={key} className="flex items-start justify-between gap-2 border-b border-white/10 py-1.5 last:border-0">
              <span className="shrink-0 text-xs text-zinc-400">{PROFILE_LABELS[key] || key}</span>
              <span className="text-right text-xs font-medium text-zinc-100">
                {formatProfileValue(key, val)}
              </span>
            </div>
          ))
        )}
      </div>

      {profileEntries.length > 0 && (
        <div className="px-4 pb-4">
          <a
            href="/plans"
            className="kota-btn-secondary block w-full py-2 text-center text-xs text-zinc-100"
          >
            See your recommended plans →
          </a>
        </div>
      )}
    </div>
  );
}

export default function ChatPage() {
  const { profile, userId, updateProfile } = useUserProfile();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hi! I'm Futuro, your benefits assistant 👋\n\nI can help you understand your health insurance cover, compare plans, file claims, or book appointments. I'll also quietly build up your profile as we chat, so your Plan Picker and Pension Calculator come pre-filled.\n\nWhat can I help you with today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    setInput("");
    setLoading(true);

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const history = messages
        .filter((m) => m.id !== "welcome")
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await api.chat({
        message: text,
        user_id: userId,
        profile,
        chat_history: history,
      });

      updateProfile(res.profile_delta);

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: res.response,
        pending_action: res.pending_action ?? undefined,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Sorry, I had trouble connecting. Please check the backend is running and try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleActionConfirm = (msgId: string, result: ActionResult) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, action_result: result } : m))
    );
  };

  const handleActionCancel = (msgId: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, action_result: { status: "cancelled" } } : m))
    );
  };

  return (
    <div className="flex h-[calc(100vh-57px)] bg-kota-charcoal">
      {/* Chat area */}
      <div className="flex flex-1 flex-col">
        {/* Messages */}
        <div className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto px-4 py-6">
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              msg={msg}
              userId={userId}
              onActionConfirm={handleActionConfirm}
              onActionCancel={handleActionCancel}
            />
          ))}

          {loading && (
            <div className="flex justify-start mb-4">
              <div className="flex items-center gap-1.5">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-linear-to-br from-sky-500 to-blue-700 text-xs font-bold text-white">F</div>
                <div className="kota-panel rounded-bl-sm px-4 py-3">
                  <div className="flex gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="h-2 w-2 rounded-full bg-blue-400"
                        animate={{ y: [0, -6, 0] }}
                        transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Quick actions */}
        <div className="mx-auto w-full max-w-3xl border-t border-white/10 bg-[color:var(--surface)] px-4 pt-3 pb-1">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {QUICK_ACTIONS.map((q) => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                disabled={loading}
                className="kota-pill shrink-0 px-3 py-1.5 text-xs text-zinc-100 transition-colors hover:border-kota-green/50 hover:bg-kota-green/10 hover:text-kota-green disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Input */}
        <div className="mx-auto w-full max-w-3xl border-t border-white/10 bg-[color:var(--surface)] px-4 py-4">
          <form
            onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
            className="flex gap-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your health cover, file a claim, or check your plan…"
              disabled={loading}
              className="kota-input flex-1 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-400 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="kota-btn-primary px-5 py-3 text-sm disabled:opacity-40"
            >
              Send
            </button>
          </form>
        </div>
      </div>

      {/* Profile sidebar */}
      <ProfileSidebar />
    </div>
  );
}
