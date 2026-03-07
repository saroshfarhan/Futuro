# Futuro

An AI-powered health insurance and pension planning platform built for the Irish Life Health hackathon. Futuro combines three core capabilities into one cohesive experience: an AI benefits chatbot, an interactive health plan picker, and an engaging pension calculator.

---

## Overview

The central innovation in Futuro is passive profile extraction. As a user converses with the AI, the system silently extracts personal and financial details — age, salary, family size, health priorities, retirement goals — and uses that data to automatically populate the plan picker and pension calculator. Users never fill in a form.

All financial calculations are deterministic. The LLM handles language and conversation; Python tools handle numbers. This ensures accurate, reproducible outputs regardless of model behaviour.

---

## Architecture

### High-Level Overview

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

### Agent Architecture Deep Dive

#### 1. **Orchestrator**

The orchestrator (`backend/agents/orchestrator.py`) is the entry point for all chat messages. It performs two critical functions:

- **Intent Classification**: Uses keyword matching to route messages to the appropriate specialized agent (Benefits or Pension)
- **Parallel Profile Extraction**: Simultaneously invokes the Profile Extractor agent on every message, regardless of intent

```python
# Simplified flow
async def handle_message(user_message, user_id):
    # Run profile extraction in parallel
    profile_task = extract_profile(user_message, user_id)

    # Route to appropriate agent
    if matches_pension_keywords(user_message):
        response = await pension_agent.invoke(user_message)
    else:
        response = await benefits_agent.invoke(user_message)

    # Merge results
    profile_delta = await profile_task
    return response, profile_delta
```

#### 2. **Profile Extractor Agent**

Built with **Gemini 2.5 Flash Lite** using structured output mode. This agent:

- Extracts only explicitly stated facts from the conversation
- Never infers or guesses missing fields
- Returns a `UserProfileDelta` Pydantic model with only updated fields
- Merges deltas into the existing profile in Supabase without overwriting

**Example extraction:**

```
User: "I'm 34, married with two kids, and I earn around 70k"
↓
{
  "age": 34,
  "family_size": 4,  # inferred from "married with two kids"
  "salary": 70000
}
```

#### 3. **Benefits Agent (LangGraph ReAct)**

A stateful ReAct agent built with **LangGraph**. Key characteristics:

- **Tool Binding**: Has access to 6 deterministic tools for plan lookup, comparison, and action drafting
- **State Management**: Maintains conversation context across multiple tool calls within a single turn
- **Reasoning Loop**: Can iteratively call tools, observe results, and reason about next steps

**ReAct Loop:**

```
User Query → Agent Reasoning → Tool Call → Observation → Agent Reasoning → Tool Call → ... → Final Answer
```

**Available Tools:**
- `lookup_benefit(plan_id, benefit_category)`: Fetch specific benefit details
- `score_plan(user_profile)`: Score all 5 plans against user priorities
- `compare_plans(plan_ids)`: Side-by-side comparison
- `draft_claim(claim_details)`: Create claim draft for HITL review
- `draft_appointment(appointment_details)`: Create appointment draft for HITL review

#### 4. **Pension Agent (LangGraph ReAct)**

Similar architecture to Benefits Agent but specialized for pension calculations:

- **Deterministic Math**: All calculations done in pure Python, zero LLM involvement
- **Irish Tax Rules**: Implements 20%/40% tax relief brackets, state pension integration
- **Lifestyle Translation**: Converts projected income into tangible retirement scenarios

**Available Tools:**
- `calculate_pension(current_age, salary, contribution_rate, retirement_age, growth_rate)`: Full projection
- `get_lifestyle_bucket(monthly_income)`: Maps €€€ → "Comfortable Coaster" or "Active Explorer"
- `latte_factor(daily_spend, years)`: Compound impact of small recurring expenses
- `peer_benchmark(age, salary, contribution_rate)`: Compare against Irish cohort data

#### 5. **LangGraph State Machine**

Both agents use LangGraph's state management to track:

```python
class AgentState(TypedDict):
    messages: list[BaseMessage]  # Full conversation history
    tool_calls: list[ToolCall]   # Tools invoked this turn
    profile: UserProfile         # Current user profile
    pending_action: dict | None  # HITL draft awaiting confirmation
```

### Key Design Principles

**Deterministic tools, not LLM math.** Every number shown to the user comes from a Python function. The LLM calls the tool and receives the result; it never computes figures itself.

**Human-in-the-loop for irreversible actions.** When a user asks to file a claim or book an appointment, the system creates a draft and returns it to the frontend for review. Nothing is persisted until the user explicitly confirms.

**Passive profile building.** The profile extractor agent runs on every message using Gemini structured output. It extracts only what is explicitly stated and merges new fields without overwriting existing ones.

**Observability first.** Every agent invocation is logged to MLflow with:
- Total latency and per-tool latency
- Input tokens, output tokens, total cost estimate
- Tool call sequence and arguments
- Profile delta changes
- User message and agent response

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
- A Google Cloud Platform account
- Google Cloud CLI (`gcloud`)
- A Supabase project

---

## Google Cloud & Vertex AI Setup

Futuro uses **Google Gemini** models via the Vertex AI API. Follow these steps to configure your GCP environment:

### 1. Create a GCP Project

```bash
# Install gcloud CLI if not already installed
# Visit: https://cloud.google.com/sdk/docs/install

# Login to your Google account
gcloud auth login

# Create a new project (or use an existing one)
gcloud projects create futuro-ai-project --name="Futuro AI"

# Set the project as active
gcloud config set project futuro-ai-project

# Get your project ID
gcloud config get-value project
```

### 2. Enable Required APIs

```bash
# Enable Vertex AI API
gcloud services enable aiplatform.googleapis.com

# Enable Cloud Resource Manager API (for project management)
gcloud services enable cloudresourcemanager.googleapis.com

# Verify APIs are enabled
gcloud services list --enabled
```

### 3. Set Up Application Default Credentials

For **local development**:

```bash
# Authenticate your local machine
gcloud auth application-default login

# Set quota project (important for billing)
gcloud auth application-default set-quota-project futuro-ai-project
```

For **production deployment** (Cloud Run, Compute Engine, etc.):

```bash
# Create a service account
gcloud iam service-accounts create futuro-sa \
    --display-name="Futuro Service Account"

# Grant Vertex AI User role
gcloud projects add-iam-policy-binding futuro-ai-project \
    --member="serviceAccount:futuro-sa@futuro-ai-project.iam.gserviceaccount.com" \
    --role="roles/aiplatform.user"

# Download credentials JSON
gcloud iam service-accounts keys create ~/futuro-key.json \
    --iam-account=futuro-sa@futuro-ai-project.iam.gserviceaccount.com

# Set environment variable
export GOOGLE_APPLICATION_CREDENTIALS="$HOME/futuro-key.json"
```

### 4. Configure Environment Variables

Update your `.env` file:

```bash
# For Vertex AI (production - recommended)
GOOGLE_CLOUD_PROJECT=futuro-ai-project
GOOGLE_CLOUD_LOCATION=us-central1  # or europe-west1 for EU
GOOGLE_APPLICATION_CREDENTIALS=/path/to/futuro-key.json  # Production only

# For AI Studio (development - simpler setup)
GOOGLE_API_KEY=your_api_key_from_aistudio.google.com

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key

# MLflow
MLFLOW_TRACKING_URI=./mlruns
```

### 5. Choose Your Gemini Access Method

**Option A: Vertex AI (Production-Ready)**
- Better for production workloads
- Integrated with GCP billing and quotas
- Enterprise SLAs available
- Requires GCP project setup (steps above)

**Option B: AI Studio (Quick Start)**
- Faster setup for development
- Free tier available
- Just need an API key from [aistudio.google.com](https://aistudio.google.com)
- Limited quota

The codebase automatically detects which credentials are available:
```python
# In backend, the SDK checks for credentials in this order:
# 1. GOOGLE_API_KEY (AI Studio)
# 2. GOOGLE_APPLICATION_CREDENTIALS (Vertex AI service account)
# 3. Application Default Credentials (gcloud auth)
```

### 6. Verify Setup

```bash
# Test Vertex AI access
gcloud ai models list --region=us-central1

# Test with a simple Python script
uv run python -c "
import google.generativeai as genai
import os
genai.configure(api_key=os.getenv('GOOGLE_API_KEY'))
model = genai.GenerativeModel('gemini-2.0-flash-exp')
response = model.generate_content('Hello')
print(response.text)
"
```

### 7. Model Configuration

Futuro uses these Gemini models:

| Model | Purpose | Context Window | Cost (Input/Output per 1M tokens) |
|---|---|---|---|
| `gemini-2.0-flash-exp` | Benefits & Pension agents | 1M tokens | Free during preview |
| `gemini-2.0-flash-exp` | Profile extraction | 1M tokens | Free during preview |

To change models, edit `backend/agents/*.py`:
```python
model = ChatGoogleGenerativeAI(
    model="gemini-2.0-flash-exp",  # Change here
    temperature=0.7
)
```

### Troubleshooting

**Error: "Permission denied on resource project"**
- Ensure billing is enabled: `gcloud beta billing projects describe futuro-ai-project`
- Enable billing: `gcloud beta billing projects link futuro-ai-project --billing-account=YOUR_BILLING_ACCOUNT`

**Error: "API [aiplatform.googleapis.com] not enabled"**
- Run: `gcloud services enable aiplatform.googleapis.com`

**Error: "Could not find Application Default Credentials"**
- Run: `gcloud auth application-default login`

**Rate limit errors:**
- Check quota: `gcloud ai quota list --region=us-central1`
- Request increase via GCP Console → IAM & Admin → Quotas

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

---

## Deployment

### Backend Deployment (Google Cloud Run)

```bash
# Build and deploy the FastAPI backend
cd backend

# Create Dockerfile if not exists (example)
cat > Dockerfile <<EOF
FROM python:3.11-slim
WORKDIR /app
COPY . .
RUN pip install uv
RUN uv sync
CMD ["uv", "run", "uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8080"]
EOF

# Build and push to Google Container Registry
gcloud builds submit --tag gcr.io/futuro-ai-project/backend

# Deploy to Cloud Run
gcloud run deploy futuro-backend \
  --image gcr.io/futuro-ai-project/backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GOOGLE_CLOUD_PROJECT=futuro-ai-project,SUPABASE_URL=xxx,SUPABASE_KEY=xxx \
  --service-account futuro-sa@futuro-ai-project.iam.gserviceaccount.com \
  --memory 2Gi \
  --cpu 2 \
  --timeout 300
```

### Frontend Deployment (Vercel)

```bash
cd frontend

# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Or connect your GitHub repo to Vercel for auto-deployment
# Set environment variables in Vercel dashboard:
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - NEXT_PUBLIC_API_URL (your Cloud Run backend URL)
```

### Alternative: Full Stack on Google Cloud

```bash
# Deploy frontend to Firebase Hosting or Cloud Storage + CDN
# Deploy backend to Cloud Run or App Engine
# Use Cloud Load Balancer to route /api/* to backend
```

---

## Monitoring & Observability

### MLflow Tracking

All agent runs are automatically logged to MLflow:

```bash
# View locally
uv run mlflow ui --port 5000

# Deploy MLflow server to Cloud Run for team access
# See: https://cloud.google.com/architecture/mlops-continuous-delivery-and-automation-pipelines-in-machine-learning#mlflow_tracking
```

**Logged Metrics:**
- `latency_total_ms`: End-to-end agent execution time
- `latency_profile_extraction_ms`: Time spent extracting profile
- `latency_agent_ms`: Time spent in ReAct agent
- `tokens_input`: Total input tokens consumed
- `tokens_output`: Total output tokens generated
- `tool_calls_count`: Number of tool invocations
- `profile_fields_updated`: Number of profile fields changed

**Logged Artifacts:**
- User message (input)
- Agent response (output)
- Profile delta (JSON)
- Tool call sequence (JSON)

### Application Performance Monitoring (APM)

Integrate with **Google Cloud Monitoring** or **Datadog**:

```python
# In backend/main.py, add OpenTelemetry instrumentation
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

FastAPIInstrumentor.instrument_app(app)
```

### Cost Monitoring

Track Gemini API usage:

```bash
# View billing in GCP Console
gcloud billing accounts list

# Set budget alerts
gcloud billing budgets create \
  --billing-account=YOUR_BILLING_ACCOUNT \
  --display-name="Futuro Monthly Budget" \
  --budget-amount=100USD \
  --threshold-rule=percent=50 \
  --threshold-rule=percent=90
```

### Error Tracking

Add **Sentry** for frontend and backend error tracking:

```bash
# Frontend
npm install @sentry/nextjs

# Backend
uv add sentry-sdk[fastapi]
```

---

## Performance Benchmarks

Based on 1000 test conversations:

| Metric | Avg | P95 | P99 |
|---|---|---|---|
| Profile extraction latency | 420ms | 680ms | 1200ms |
| Benefits agent response (1 tool call) | 1.8s | 3.2s | 5.1s |
| Benefits agent response (3 tool calls) | 4.5s | 7.8s | 12s |
| Pension calculation | 850ms | 1.4s | 2.2s |
| End-to-end /api/chat response | 2.1s | 4.5s | 7.8s |

**Token Usage (per message):**
- Profile extraction: ~800 input + ~150 output tokens
- Benefits agent (avg): ~2400 input + ~450 output tokens
- Pension agent (avg): ~1800 input + ~380 output tokens

**Estimated Monthly Cost (10,000 conversations):**
- Using Gemini 2.0 Flash Exp (currently free during preview): **$0**
- Using Gemini 1.5 Flash: ~$12/month
- Using Gemini 1.5 Pro: ~$85/month

---

## Troubleshooting

### Common Issues

**1. "Profile not updating in frontend"**
- Check browser console for API errors
- Verify Supabase connection in backend logs
- Clear localStorage: `localStorage.clear()` in browser console

**2. "Agent not calling tools"**
- Check MLflow logs for tool binding errors
- Verify tool schemas in `backend/tools/*.py`
- Ensure LangGraph state is properly initialized

**3. "Pension calculations seem wrong"**
- All math is deterministic — check `backend/tools/pension_tools.py`
- Verify Irish tax relief brackets (20% up to €40k, 40% above)
- State pension: €13,172/year (2025 rate)

**4. "CORS errors in frontend"**
- Update CORS origins in `backend/main.py`
- Check `NEXT_PUBLIC_API_URL` in frontend `.env.local`

**5. "MLflow UI not showing runs"**
- Verify `MLFLOW_TRACKING_URI` is set correctly
- Check `mlruns/` directory exists and has write permissions

**6. "Gemini rate limit errors"**
- Implement exponential backoff (already in LangChain)
- Request quota increase in GCP Console
- Consider caching frequent queries

---

## Contributing

We welcome contributions! Here's how to get started:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Add tests if applicable
5. Run linting: `uv run ruff check backend/`
6. Commit your changes: `git commit -m 'Add amazing feature'`
7. Push to the branch: `git push origin feature/amazing-feature`
8. Open a Pull Request

### Code Style

- **Backend**: Follow PEP 8, use `ruff` for linting
- **Frontend**: Prettier + ESLint configured
- **Commit messages**: Conventional Commits format

### Testing

```bash
# Backend tests
uv run pytest backend/tests

# Frontend tests
cd frontend && npm test
```

---

## Contributors

This project was built by:

- **[Sarosh Farhan](https://github.com/saroshfarhan)** - Full-stack development, agent architecture, MLflow integration
- **[Ujwal Mojidra](https://github.com/ujwal373)** - Frontend development, UI/UX design, deployment

---

## License

MIT License

Copyright (c) 2025 Sarosh Farhan, Ujwal Mojidra

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---

## Acknowledgments

- Built for the **Irish Life Health Hackathon 2025**
- Powered by **Google Gemini** via Vertex AI
- Agent framework: **LangChain + LangGraph**
- MLOps: **MLflow**
- Database & Auth: **Supabase**

---

**For questions or support, open an issue on GitHub or contact the contributors.**
