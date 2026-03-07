const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface UserProfile {
  age?: number;
  salary?: number;
  family_size?: number;
  health_priorities?: string[];
  has_gp_visit_card?: boolean;
  retirement_age?: number;
  risk_tolerance?: string;
  current_plan?: number;
  location?: string;
  is_pregnant?: boolean;
  is_student?: boolean;
  occupation?: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface PendingAction {
  action_id: string;
  type: "claim" | "appointment";
  status: string;
  claim_type?: string;
  claim_date?: string;
  amount?: number;
  plan_id?: number;
  appointment_type?: string;
  preferred_date?: string;
  notes?: string;
  message: string;
}

export interface ChatResponse {
  response: string;
  updated_profile: UserProfile;
  profile_delta: Partial<UserProfile>;
  pending_action?: PendingAction;
  intent: string;
  latency_ms: number;
}

export interface PensionResult {
  projected_pot: number;
  monthly_from_pot: number;
  monthly_state_pension: number;
  total_monthly_income: number;
  years_to_retire: number;
  annual_contribution: number;
  monthly_net_cost: number;
  tax_relief_rate_pct: number;
  effective_rate_pct: number;
  growth_rate_pct: number;
  pot_at_decade: Record<number, number>;
  risk: string;
  lifestyle_bucket: {
    title: string;
    description: string;
    activities: string[];
    location: string;
    emoji: string;
  };
  peer_comparison: {
    your_rate: number;
    peer_average_rate: number;
    percentile: number;
    message: string;
    age_group: string;
  };
  latte_factor_1pct: {
    daily_cost: number;
    weekly_cost: number;
    comparison: string;
    annual_gross_extra: number;
    annual_net_extra: number;
    tax_relief_pct: number;
  };
}

async function fetchAPI<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `API error ${res.status}`);
  }
  return res.json();
}

export const api = {
  chat: (body: {
    message: string;
    user_id: string;
    profile?: UserProfile;
    chat_history?: ChatMessage[];
  }) =>
    fetchAPI<ChatResponse>("/api/chat", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  confirmAction: (body: {
    action_id: string;
    user_id: string;
    confirmed: boolean;
  }) =>
    fetchAPI<{ status: string; claim_id?: string; appointment_id?: string; confirmation_number?: string; message?: string }>(
      "/api/actions/confirm",
      { method: "POST", body: JSON.stringify(body) }
    ),

  getPlans: () => fetchAPI<{ plans: any[] }>("/api/plans"),

  recommendPlan: (body: {
    health_priorities: string[];
    budget_sensitive?: boolean;
    low_healthcare_user?: boolean;
  }) =>
    fetchAPI<{
      recommended_plan: { plan_id: number; score: number; reasoning: string[] };
      runner_up: any;
      all_scores: any[];
      recommendation_reason: string;
    }>("/api/plans/recommend", { method: "POST", body: JSON.stringify(body) }),

  calculatePension: (body: {
    age: number;
    salary: number;
    contribution_rate: number;
    retirement_age: number;
    risk?: string;
    user_id?: string;
  }) =>
    fetchAPI<PensionResult>("/api/pension/calculate", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  getClaims: (userId: string) =>
    fetchAPI<{ claims: any[] }>(`/api/claims/${userId}`),

  getAppointments: (userId: string) =>
    fetchAPI<{ appointments: any[] }>(`/api/appointments/${userId}`),
};
