# SkillHive AI

A full-stack web app that builds a unified developer profile from a resume and GitHub activity. It scores the resume against a job description, verifies claimed skills against real GitHub evidence with a Trust Score, and unlocks SkillSwap teammate matching once enough claims are verified.

## Features

- **AI resume analysis** with Google's Gemma 4 (`gemma-4-26b-a4b-it`): core match scoring, ATS simulation, bullet rewrites, skill-gap roadmap, cover letter and interview prep. Six analyses run in parallel per resume.
- **Graceful fallback**: if the AI call fails (rate limit, 5xx, bad JSON), that section falls back to a local keyword-based analysis instead of failing the whole request.
- **GitHub analyzer**: reads a candidate's public repos, languages, topics, and manifest files (`package.json`, `requirements.txt`, Dockerfile, `tsconfig.json`, CI configs) to produce explainable, evidence-backed skills.
- **Trust Score**: how much of the resume is backed by verifiable evidence. A score of 50 or more unlocks SkillSwap.
- **SkillSwap matching**: matches candidates by skill complementarity (what you can teach them, what they can teach you). It currently matches against a **demo pool of 12 fictional developers** in `backend-node/mocks/skillswapProfiles.js`, flagged `isDemo: true`. Replace the pool with real registered users when you have enough of them.
- **Accounts and roles**: users register and sign in, and each user sees only their own analysis history. An admin account sees every user's history and can filter by user.
- **History**: SQLite storage of past analyses, owned per user.

## Project Structure

```
├── backend-node/
│   ├── server.js                    # Express server and endpoints
│   ├── database.js                  # SQLite setup
│   ├── aiAnalyzer.js                # Gemma 4 calls (Google direct, OpenRouter fallback) + local fallbacks
│   ├── githubAnalyzer.js            # GitHub REST API integration
│   ├── resumeParser.js              # PDF / DOCX text extraction
│   ├── ocrParser.js                 # Image OCR scaffold (not wired in)
│   ├── trustScore.js                # Trust Score calculation
│   ├── skillMatcher.js              # SkillSwap matching helpers
│   ├── services/
│   │   ├── analysisOrchestrator.js  # Single entry point: resume + GitHub -> unified result
│   │   ├── skillNormalizationService.js
│   │   ├── verificationService.js   # Cross-checks resume skills against GitHub evidence
│   │   ├── matchingEngine.js
│   │   └── profileMerger.js
│   ├── mocks/                       # Mock data used by tests
│   ├── tests/
│   └── .env.example
├── frontend/                        # React + Tailwind (pages, components, AnalysisContext, API client)
└── README.md
```

The repo has no root `package.json`. `backend-node/` and `frontend/` are separate projects, so run every npm command inside the right folder.

## Getting Started

### Prerequisites

- Node.js 16+
- A Google AI Studio API key (free): https://aistudio.google.com/app/apikey
- A GitHub personal access token (optional but recommended): https://github.com/settings/tokens. No scopes are needed for public data. It raises the limit from 60 to 5,000 requests per hour.

### Backend

```bash
cd backend-node
npm install
cp .env.example .env
```

On Windows PowerShell, use `Copy-Item .env.example .env` instead of `cp`.

Edit `backend-node/.env`:

```
PORT=8000
GOOGLE_API_KEY=your_google_ai_studio_api_key_here
GEMMA_MODEL=gemma-4-26b-a4b-it
GITHUB_TOKEN=your_github_personal_access_token_here
```

| Variable | Required | Purpose |
|---|---|---|
| `GOOGLE_API_KEY` | Yes, unless using OpenRouter | Calls Gemma directly through the Gemini API. Takes priority when set. |
| `GEMMA_MODEL` | No | Model ID. Defaults to `gemma-4-26b-a4b-it`. `gemma-4-31b-it` is also available. |
| `OPENROUTER_API_KEY` | No | Fallback provider, used only when `GOOGLE_API_KEY` is not set. |
| `AI_MODEL` | No | OpenRouter model ID. Defaults to `google/gemma-3-27b-it`. |
| `GITHUB_TOKEN` | No | Higher GitHub rate limit. |
| `PORT` | No | Defaults to 8000. |
| `JWT_SECRET` | Recommended | Long random string used to sign login tokens. If unset, a temporary one is generated and everyone is logged out on each restart. |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Yes, to have an admin | The admin account is created from these on startup and re-synced on every restart, so changing them and restarting the backend changes the admin login. Registration only ever creates normal users. |

Without any AI key the app still runs, but every section uses the local keyword fallback.

Run it:

```bash
npm run dev   # auto-restarts via nodemon
# or
npm start
```

The backend serves `http://localhost:8000`. It is API-only, so visiting `/` shows "Cannot GET /". That is expected.

### Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env`:

```
REACT_APP_API_URL=http://localhost:8000
```

```bash
npm start
```

Open `http://localhost:3000`.

## API Endpoints

All endpoints except `/api/auth/register` and `/api/auth/login` need an `Authorization: Bearer <token>` header.

### POST `/api/auth/register`
`{ username, password }`. The username is 3-32 characters (letters, numbers, `.`, `-`, `_`) and case-insensitive; the password is at least 8 characters. Creates a normal user and returns `{ token, user }`.

### POST `/api/auth/login`
`{ username, password }`. Returns `{ token, user }`. Tokens last 7 days.

### GET `/api/auth/me`
The signed-in user.

### GET `/api/admin/users`
Admin only. All accounts with their analysis counts.

### POST `/api/analyze`
Runs the full pipeline: resume parsing, AI analysis, GitHub verification, Trust Score and SkillSwap.

**Request** (`multipart/form-data`):
- `resume_file`: PDF or DOCX
- `job_description`: required
- `github_url`: optional GitHub profile URL or username

**Response**: a unified result with `coreMatch`, `atsAnalysis`, `rewrites`, `skillGap`, `coverLetter`, `interviewPrep`, `trustAnalysis`, `skillSwap`, `githubAnalysis` and `candidateProfile`, plus the saved `id`. Snake_case aliases (`core_match`, `ats`, `gaps`, and so on) are kept at the root for backward compatibility.

A full analysis takes roughly 100 seconds with Gemma 4, because the model reasons before answering and six calls run in parallel.

### GET `/api/history`
Past analyses (id, date, job title, score, owner). Users get their own; admins get everyone's. Analyses saved before accounts existed have no owner and are visible to admins only.

### GET `/api/history/:id`
One saved analysis in full. Users can open only their own (others return 404); admins can open any.

### POST `/api/github/analyze`
Analyzes a GitHub profile on its own.

**Request body**: `{ "username": "githubusername" }`

**Response**: `{ username, verifiedSkills, languages, skills, repos, repoCount, hasDocker, hasCI, lastCommitDate }`. Each verified skill carries a confidence value, the repositories it was found in, and the evidence behind it.

Errors are explicit: 404 for an unknown user, 429 with the reset time when rate limited, 502 if GitHub is unreachable.

## Technology Stack

**Backend**: Express, Gemma 4 via the Gemini API (OpenRouter fallback), GitHub REST API, pdf-parse, mammoth, sqlite3, multer, axios.

**Frontend**: React, React Router, Tailwind CSS, react-dropzone, axios, recharts, lucide-react, react-hot-toast.

## Troubleshooting

- **`npm error ENOENT ... package.json`**: you ran npm in the repo root. `cd` into `backend-node` or `frontend` first.
- **Sections look generic**: the AI call failed and the keyword fallback was used. Check the backend log for `AI call failed` and the reason. Google's Gemma 4 endpoint returns occasional 500s, and the code retries twice before falling back. Setting `GEMMA_MODEL=gemini-3.5-flash-lite` is faster and steadier if this is a problem.
- **GitHub 403/429**: you hit the rate limit. Add a `GITHUB_TOKEN`.
- **Image-based or Canva PDFs**: they are not OCR'd. Export a text-based PDF or DOCX.
- **PowerShell script-execution error on `npm install`**: run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once, or use Command Prompt.
- **Never commit `.env`**: it is in `.gitignore`. Only `.env.example` belongs in the repo.

## License

For educational purposes.
