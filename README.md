# Futuro

An AI-powered health insurance and pension planning platform built for the Irish Life Health hackathon. Futuro combines three core capabilities into one cohesive experience: an AI benefits chatbot, an interactive health plan picker, and an engaging pension calculator.

---

## Overview

The central innovation in Futuro is passive profile extraction. As a user converses with the AI, the system silently extracts personal and financial details — age, salary, family size, health priorities, retirement goals — and uses that data to automatically populate the plan picker and pension calculator. Users never fill in a form.

All financial calculations are deterministic. The LLM handles language and conversation; Python tools handle numbers. This ensures accurate, reproducible outputs regardless of model behaviour.

---

## Architecture

```
User Chat Input
      |
      v
Orchestrator (intent routing via keyword matching)
      |
      +-----> Profile Extractor Agent (runs in parallel on every message)
      |       Gemini structured output -> UserProfile delta -> Supabase
      |
      +-----> Benefits Agent (LangGraph ReAct)
      |       Tools: lookup_benefit, score_plan, compare_plans,
      |               draft_claim, draft_appointment
      |
      +-----> Pension Agent (LangGraph ReAct)
              Tools: calculate_pension, get_lifestyle_bucket,
                     latte_factor, peer_benchmark

All agent runs logged to MLflow: latency, tool calls, profile deltas, tokens
```
![Alt text](./architechture.png)

### Key Design Principles

**Deterministic tools, not LLM math.** Every number shown to the user comes from a Python function. The LLM calls the tool and receives the result; it never computes figures itself.

**Human-in-the-loop for irreversible actions.** When a user asks to file a claim or book an appointment, the system creates a draft and returns it to the frontend for review. Nothing is persisted until the user explicitly confirms.

**Passive profile building.** The profile extractor agent runs on every message using Gemini structured output. It extracts only what is explicitly stated and merges new fields without overwriting existing ones.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind CSS v4, Framer Motion, Recharts |
| Backend | FastAPI, Python 3.11 |
| LLM | Google Gemini (gemini-2.5-flash-lite) |
| Agent Orchestration | LangChain + LangGraph (ReAct agents, tool binding) |
| MLOps | MLflow (experiment tracking, latency, tool call traces) |
| Auth + Database | Supabase (PostgreSQL, auth) |
| Package Manager | uv |

---

## Project Structure

```
Futuro/
├── backend/
│   ├── main.py                    # FastAPI app, CORS, all API routes
│   ├── agents/
│   │   ├── orchestrator.py        # Intent routing, parallel profile extraction
│   │   ├── benefits_agent.py      # LangGraph ReAct agent for plan questions
│   │   ├── pension_agent.py       # LangGraph ReAct agent for pension questions
│   │   └── profile_extractor.py  # Silent profile extraction from chat messages
│   ├── tools/
│   │   ├── plan_tools.py          # Deterministic plan lookup, scoring, comparison
│   │   ├── pension_tools.py       # Irish pension math, lifestyle bucketing
│   │   └── action_tools.py        # Draft/submit claim and appointment (HITL)
│   ├── models/
│   │   ├── user_profile.py        # UserProfile + UserProfileDelta Pydantic models
│   │   └── plan.py                # Plan data models
│   ├── data/
│   │   └── plans.py               # Loads and indexes the 5 plan JSON files
│   ├── db.py                      # Supabase client helpers
│   └── mlflow_logger.py           # MLflow tracking wrappers
├── frontend/
│   ├── app/
│   │   ├── layout.tsx             # Shared layout with UserProfile context
│   │   ├── page.tsx               # Landing dashboard
│   │   ├── chat/page.tsx          # AI chatbot with live profile sidebar
│   │   ├── plans/page.tsx         # Plan picker with AI recommendation
│   │   └── pension/page.tsx       # Pension calculator with lifestyle cards
│   ├── context/
│   │   └── UserProfileContext.tsx # Shared profile state across all pages
│   └── lib/
│       └── api.ts                 # Typed API client
├── data/
│   ├── 4d_health_1.json           # Plan 1: Basic
│   ├── 4d_health_2.json           # Plan 2: Essential
│   ├── 4d_health_3.json           # Plan 3: Standard
│   ├── 4d_health_4.json           # Plan 4: Plus
│   └── 4d_health_5.json           # Plan 5: Premium
└── pyproject.toml
```

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/chat` | Main chat endpoint; returns response, profile delta, pending action |
| POST | `/api/actions/confirm` | HITL confirmation — persists claim or appointment after user approval |
| GET | `/api/plans` | Returns all 5 plan summaries |
| POST | `/api/plans/recommend` | Deterministic plan scoring against user priorities |
| POST | `/api/pension/calculate` | Pure Python pension projection, no LLM involved |
| GET | `/api/claims/{user_id}` | User claim history |
| GET | `/api/appointments/{user_id}` | User appointment history |

---

## Pension Calculator

All pension figures use Irish-specific rules:

- **Tax relief**: 20% for income up to EUR 40,000; 40% above that threshold
- **State pension**: EUR 13,172 per year (2025 full contributory rate)
- **Growth rates**: Conservative 4%, Moderate 6%, Aggressive 8% (compound annual)
- **Safe withdrawal**: 4% annually from the personal pot at retirement

Lifestyle buckets translate a projected monthly income into a tangible retirement description — for example, "Active Explorer: two to three holidays per year, dining out regularly, West Cork or Galway coast" — rather than presenting a raw number.

---

## Human-in-the-Loop Flow

```
User: "File a claim for my physio visit last Tuesday for 60 euro"
  |
  v  Benefits agent calls draft_claim() -> pending object created in memory
  |
  v  API returns:
     { response: "I've prepared your claim for review...",
       pending_action: { type: "claim", draft: {...}, action_id: "uuid" } }
  |
  v  Frontend renders inline review card with [Confirm] and [Cancel] buttons
  |
  v  User clicks Confirm -> POST /api/actions/confirm { action_id, confirmed: true }
  |
  v  Backend calls submit_claim() -> persisted to Supabase
  |
  v  Returns claim ID and confirmation
```

The same pattern applies to appointment booking, plan upgrade requests, and profile corrections.

---

## User Personas

**Aisha, 24 — International Student**
Recently arrived from Nigeria for a two-year MSc at UCD. Tight monthly budget, no prior experience with the Irish healthcare system. Futuro helps her understand HSE entitlement versus private cover and recommends Plan 1 based on her budget and need for GP and digital doctor access.

**Sarah, 32 — Pregnant Professional**
Senior software engineer, 18 weeks pregnant, currently on Plan 2 and concerned about maternity cover ahead of her due date. Futuro compares maternity benefits across plans, explains waiting periods, and shows the pension impact of a six-month career break.

**Michael, 58 — Almost-Retiree**
Secondary school principal in Cork, seven years from retirement. Wants to understand his pension projections in real terms and evaluate whether upgrading from Plan 3 to Plan 5 makes sense before retirement. Futuro shows him the lifestyle his pension translates to and books a GP health screening through the chat.

---

## Setup

### Prerequisites

- Python 3.11 or higher
- Node.js 18 or higher
- uv (`pip install uv` or `brew install uv`)
- A Google AI Studio API key (from aistudio.google.com)
- A Supabase project

### Backend

```bash
# Install dependencies
uv sync

# Configure environment
cp .env.example .env
# Set GOOGLE_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY

# Start the server
uv run uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend

```bash
cd frontend

# Configure environment
cp .env.local.example .env.local
# Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_API_URL

npm install
npm run dev
```

### MLflow UI

```bash
uv run mlflow ui
# Open http://localhost:5000
```

### Supabase Tables

```sql
create table user_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id text unique not null,
  age int, salary int, family_size int,
  health_priorities text[],
  retirement_age int, risk_tolerance text,
  current_plan int, location text,
  is_pregnant boolean, is_student boolean, occupation text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table claims (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  claim_type text, date text, amount numeric,
  description text, status text default 'submitted',
  created_at timestamptz default now()
);

create table appointments (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  appointment_type text, preferred_date text,
  notes text, confirmation_number text, status text default 'confirmed',
  created_at timestamptz default now()
);

create table chat_history (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  role text, content text,
  created_at timestamptz default now()
);
```

---

## Demo Walkthrough

1. Start both servers (`uvicorn` on port 8000, `npm run dev` on port 3000)
2. Open `http://localhost:3000/chat`
3. Send: "Hi, I am 34, married with one kid, trying to understand physio cover on Plan 3"
4. Observe the profile sidebar populate: age 34, family size 3, priority physio, current plan 3
5. Send: "Can you file a claim for my physio visit last Tuesday for 60 euro?"
6. Review the inline claim card and click Confirm — claim persists to Supabase
7. Navigate to `/plans` — Plan 3 and 4 are highlighted based on the extracted profile
8. Navigate to `/pension` — age and salary are pre-filled; drag the sliders to explore scenarios
9. Open `http://localhost:5000` (MLflow UI) to inspect agent run traces and tool call logs
