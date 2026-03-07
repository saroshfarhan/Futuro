"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUserProfile } from "@/context/UserProfileContext";
import { api, type ChatMessage, type PendingAction } from "@/lib/api";

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
  if (key === "salary") return `€${(val as number).toLocaleString()}/yr`;
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
      className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-amber-600 text-lg">{isClaim ? "🧾" : "📅"}</span>
        <span className="font-semibold text-amber-800 text-sm">
          {isClaim ? "Review Your Claim Before Submitting" : "Review Your Appointment Request"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        {isClaim ? (
          <>
            <div className="rounded-lg bg-white p-2.5 border border-amber-100">
              <div className="text-xs text-gray-500 mb-0.5">Type</div>
              <div className="font-medium text-gray-900 text-sm capitalize">{action.claim_type?.replace("_", " ")}</div>
            </div>
            <div className="rounded-lg bg-white p-2.5 border border-amber-100">
              <div className="text-xs text-gray-500 mb-0.5">Date</div>
              <div className="font-medium text-gray-900 text-sm">{action.claim_date}</div>
            </div>
            <div className="rounded-lg bg-white p-2.5 border border-amber-100">
              <div className="text-xs text-gray-500 mb-0.5">Amount</div>
              <div className="font-medium text-gray-900 text-sm">€{action.amount?.toFixed(2)}</div>
            </div>
            <div className="rounded-lg bg-white p-2.5 border border-amber-100">
              <div className="text-xs text-gray-500 mb-0.5">Plan</div>
              <div className="font-medium text-gray-900 text-sm">Plan {action.plan_id}</div>
            </div>
          </>
        ) : (
          <>
            <div className="rounded-lg bg-white p-2.5 border border-amber-100">
              <div className="text-xs text-gray-500 mb-0.5">Type</div>
              <div className="font-medium text-gray-900 text-sm">{action.appointment_type}</div>
            </div>
            <div className="rounded-lg bg-white p-2.5 border border-amber-100">
              <div className="text-xs text-gray-500 mb-0.5">Preferred Date</div>
              <div className="font-medium text-gray-900 text-sm">{action.preferred_date}</div>
            </div>
            {action.notes && (
              <div className="col-span-2 rounded-lg bg-white p-2.5 border border-amber-100">
                <div className="text-xs text-gray-500 mb-0.5">Notes</div>
                <div className="font-medium text-gray-900 text-sm">{action.notes}</div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleConfirm}
          disabled={loading}
          className="flex-1 rounded-lg bg-amber-600 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "Submitting…" : isClaim ? "Confirm & Submit Claim" : "Confirm & Book Appointment"}
        </button>
        <button
          onClick={handleCancel}
          disabled={loading}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
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
  onActionConfirm: (msgId: string, result: any) => void;
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
            <div className="h-6 w-6 rounded-full bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">F</div>
            <span className="text-xs text-gray-500 font-medium">Futuro</span>
          </div>
        )}
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
            isUser
              ? "bg-indigo-600 text-white rounded-br-sm"
              : "bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm"
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
              ? "bg-red-50 text-red-700 border border-red-200"
              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
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
    <div className="w-72 shrink-0 border-l border-gray-200 bg-white overflow-y-auto">
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-700">Your Profile</h2>
          <span className="text-xs text-indigo-600 font-medium">{profileCompletion}% complete</span>
        </div>
        <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-linear-to-r from-indigo-500 to-purple-500"
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
            className="mx-3 mt-3 rounded-lg bg-indigo-50 border border-indigo-200 px-3 py-2"
          >
            <p className="text-xs text-indigo-700 font-medium">
              ✨ Picked up: {newFields.join(", ")}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-4 space-y-2">
        {profileEntries.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-8">
            Start chatting — your profile will build up here automatically.
          </p>
        ) : (
          profileEntries.map(([key, val]) => (
            <div key={key} className="flex items-start justify-between gap-2 py-1.5 border-b border-gray-50 last:border-0">
              <span className="text-xs text-gray-500 shrink-0">{PROFILE_LABELS[key] || key}</span>
              <span className="text-xs font-medium text-gray-900 text-right">
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
            className="block w-full rounded-lg bg-indigo-50 border border-indigo-200 py-2 text-center text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
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
    } catch (err) {
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

  const handleActionConfirm = (msgId: string, result: any) => {
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
    <div className="flex h-[calc(100vh-57px)]">
      {/* Chat area */}
      <div className="flex flex-1 flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 max-w-3xl mx-auto w-full">
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
                <div className="h-6 w-6 rounded-full bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">F</div>
                <div className="rounded-2xl rounded-bl-sm bg-white border border-gray-200 px-4 py-3 shadow-sm">
                  <div className="flex gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="h-2 w-2 rounded-full bg-indigo-400"
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
        <div className="border-t border-gray-100 bg-white px-4 pt-3 pb-1 max-w-3xl mx-auto w-full">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {QUICK_ACTIONS.map((q) => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                disabled={loading}
                className="shrink-0 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 transition-colors disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-gray-100 bg-white px-4 py-4 max-w-3xl mx-auto w-full">
          <form
            onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
            className="flex gap-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your health cover, file a claim, or check your plan…"
              disabled={loading}
              className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-400 focus:bg-white focus:outline-none transition-colors disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors"
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
