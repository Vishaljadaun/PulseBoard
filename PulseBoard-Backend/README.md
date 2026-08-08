# PulseBoard — Backend (.NET 8 / Clean Architecture)

**Module 1: Auth + Session Lifecycle** — host signup/login, session
create/start/end with a 6-digit join code.

**Module 2: Polls + Live Voting (SignalR)** — hosts create polls under a
session, activate one at a time, participants vote anonymously (no login),
and everyone watching sees vote counts update live via SignalR — no
polling, no refresh.

**Module 3: AI Poll Generation** — host types a topic, an LLM (Groq, free
tier) drafts a question + 4 options + a suggested correct answer, host
reviews/edits before creating the poll. Any poll (AI-drafted or manual) can
optionally have a correct answer marked — participants find out if they
got it right immediately after voting, but never before (the correct
answer is never sent to anyone who hasn't voted on that poll yet).

> **Upgrading an existing local copy?** This update added a new column
> (`PollOptions.IsCorrect`) — you need to run one more migration. See
> section 3, Step 5, or just run:
> ```powershell
> Add-Migration AddCorrectAnswerToPollOption -StartupProject PulseBoard.API
> Update-Database -StartupProject PulseBoard.API
> ```
> in the Package Manager Console (Default project: `PulseBoard.Infrastructure`).

---

## 1. Why the project is split into 4 projects

This follows **Clean Architecture**. The rule is: dependencies only point
inward. Outer layers know about inner layers; inner layers know nothing
about outer ones.

```
PulseBoard.API            (outermost — controllers, Program.cs, HTTP concerns)
      |
      v
PulseBoard.Infrastructure  (EF Core, SQLite, JWT, password hashing)
      |
      v
PulseBoard.Application     (business logic — MediatR commands/queries, validation)
      |
      v
PulseBoard.Domain          (innermost — entities, no dependencies on anything)
```

**Why bother?** `PulseBoard.Application` (where all your business rules live)
never references Entity Framework, SQLite, or ASP.NET Core. It only
depends on interfaces (`IApplicationDbContext`, `IPasswordHasher`, etc.).
That means:
- You could swap SQLite for PostgreSQL/SQL Server by rewriting only
  `PulseBoard.Infrastructure` — the business logic doesn't change.
- You can unit-test business rules (like "a session can't be started twice")
  with zero database, zero HTTP server. See `tests/PulseBoard.Application.Tests`.
- It's the #1 thing interviewers look for when they say "clean architecture"
  on your resume — so being able to explain *why* each project exists, not
  just that it exists, matters.

### What's inside each project

| Project | Contains |
|---|---|
| `PulseBoard.Domain` | `Host`, `Session` entities. `Session.Start()`/`End()` contain the actual state-machine rules (Draft→Live→Ended). This is intentional — the rule lives on the entity, not scattered across command handlers. |
| `PulseBoard.Application` | One folder per feature (`Auth/`, `Sessions/`). Each command/query is a single file with the request, its FluentValidation validator, and its MediatR handler together — easy to find, easy to delete cleanly if a feature goes away. |
| `PulseBoard.Infrastructure` | `ApplicationDbContext` (EF Core), `JwtTokenGenerator`, `PasswordHasher`, `JoinCodeGenerator` — the concrete implementations of the interfaces Application depends on. |
| `PulseBoard.API` | Thin controllers that just call `_mediator.Send(command)`. `Program.cs` is the composition root — where all four layers get wired together via dependency injection. `Middleware/ExceptionHandlingMiddleware.cs` turns exceptions into proper HTTP status codes so controllers stay clean. |

### Request flow example (Create Session)

```
POST /api/sessions
  → SessionsController.Create()
  → _mediator.Send(new CreateSessionCommand(...))
  → FluentValidation validates the command automatically (MediatR pipeline)
  → CreateSessionCommandHandler.Handle()
      → IJoinCodeGenerator generates a unique 6-digit code
      → new Session { ... } created (Domain entity, starts in Draft)
      → IApplicationDbContext saves it
  → returns SessionDto → 201 Created
```

---

## 2. Prerequisites

- **.NET 8 SDK** — https://dotnet.microsoft.com/download/dotnet/8.0
- **That's it for the database** — this uses **SQLite**, a single file
  (`pulseboard.db`), created automatically on first run. No SQL Server, no
  LocalDB, no external service to install or provision.
- **Visual Studio 2022** (17.8+) — Community edition is free, or VS Code +
  C# Dev Kit if you prefer CLI-first

---

## 3. Running it — Visual Studio UI walkthrough (step by step)

This is the "click buttons, not the terminal" path, since that's how you'll
demo this in interviews or to yourself day-to-day.

### Step 1 — Open the solution
Double-click `PulseBoard.sln`. Visual Studio opens all 5 projects in
**Solution Explorer** on the right: `PulseBoard.Domain`, `PulseBoard.Application`,
`PulseBoard.Infrastructure`, `PulseBoard.API`, `PulseBoard.Application.Tests`.

### Step 2 — Restore NuGet packages
Visual Studio usually does this automatically on open (you'll see a "Restoring
packages..." notification bottom-left). If not:
**Right-click the solution** (top of Solution Explorer) → **Restore NuGet Packages**.

### Step 3 — Set the startup project
Right-click **`PulseBoard.API`** in Solution Explorer → **Set as Startup Project**.
(It should already show in **bold** once selected — that's what tells VS which
project to run when you hit the green Run button.)

### Step 4 — Connection string is already set
Open `src/PulseBoard.API/appsettings.json` — the connection string is just:
```json
"DefaultConnection": "Data Source=pulseboard.db"
```
This creates a file called `pulseboard.db` right next to the running app the
first time it starts. Nothing to configure — skip straight to Step 5.

**Do set a real JWT secret** — don't leave the placeholder in `appsettings.json`
for anything beyond local testing. The easiest UI-only way:
**Right-click `PulseBoard.API`** → **Manage User Secrets**. This opens a
`secrets.json` file (kept outside your repo, never committed). Paste:
```json
{
  "Jwt:Secret": "paste-a-long-random-string-here-at-least-32-characters"
}
```
This overrides `appsettings.json` automatically — no code changes needed.

### Step 5 — Create the database (EF Core migrations) via the UI
Since you don't have `dotnet-ef` installed as a CLI tool yet, the easiest UI
path is the **Package Manager Console**:

1. **Tools → NuGet Package Manager → Package Manager Console**
2. At the top of the console, set:
   - **Default project:** `PulseBoard.Infrastructure`
3. Run:
   ```powershell
   Add-Migration InitialCreate -StartupProject PulseBoard.API
   Update-Database -StartupProject PulseBoard.API
   ```
   `Add-Migration` generates the migration files (creates a `Migrations/`
   folder inside `PulseBoard.Infrastructure`). `Update-Database` creates
   `pulseboard.db` and applies the schema.

   *(Note: `Program.cs` also calls `db.Database.Migrate()` automatically on
   every startup — so once the migration exists, just running the app will
   apply it, including on Render. You still need to run `Add-Migration` once
   by hand to generate the migration files themselves.)*

### Step 6 — Run it
Press **F5** (or the green ▶ **PulseBoard.API** button in the toolbar).
- A browser opens automatically to the Swagger UI (`https://localhost:7050/swagger`)
  — that's set via `launchUrl` in `Properties/launchSettings.json`.
- Swagger lists every endpoint. Try `POST /api/auth/register` — click it,
  **Try it out**, fill in the JSON body, **Execute**. You'll get back a JWT.
- To call an `[Authorize]` endpoint (like `POST /api/sessions`): click the
  green **Authorize** button top-right of Swagger, type `Bearer <paste your token>`,
  **Authorize**. Now every request includes it automatically.

### Step 7 — Run the tests via the UI
**Test → Test Explorer** (or `Ctrl+E, T`). You'll see all 6 tests from
`SessionStateTransitionTests`. Click **Run All Tests** at the top of the panel.
Green checkmarks = passing. This is genuinely worth screenshotting for your
portfolio README — it shows you test business logic, not just "it compiles."

---

## 4. Running it via CLI (if you prefer terminal over Visual Studio)

```bash
# from the PulseBoard-Backend/ folder
dotnet restore
dotnet tool install --global dotnet-ef   # one-time, only if not already installed
cd src/PulseBoard.Infrastructure
dotnet ef migrations add InitialCreate --startup-project ../PulseBoard.API
dotnet ef database update --startup-project ../PulseBoard.API
cd ../PulseBoard.API
dotnet run
```
Then open `https://localhost:7050/swagger`.

Run tests:
```bash
cd tests/PulseBoard.Application.Tests
dotnet test
```

---

## 5. API endpoints

| Method | Route | Auth? | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | No | Create a host account, returns JWT |
| POST | `/api/auth/login` | No | Authenticate, returns JWT |
| GET | `/api/sessions` | Yes | List the logged-in host's sessions |
| GET | `/api/sessions/{id}` | Yes | Get one session's detail |
| POST | `/api/sessions` | Yes | Create a session (Draft status, generates join code) |
| POST | `/api/sessions/{id}/start` | Yes | Draft → Live |
| POST | `/api/sessions/{id}/end` | Yes | Live → Ended |
| GET | `/api/sessions/join/{joinCode}` | No | Public — participant validates a join code |
| GET | `/api/sessions/{sessionId}/polls` | Yes | List all polls in a session |
| POST | `/api/sessions/{sessionId}/polls` | Yes | Create a poll (Draft) — body: `{ question, options[] }` |
| POST | `/api/polls/{pollId}/activate` | Yes | Draft → Active, broadcasts `PollActivated` over SignalR |
| POST | `/api/polls/{pollId}/close` | Yes | Active → Closed, broadcasts `PollClosed` over SignalR |
| GET | `/api/sessions/{sessionId}/polls/active` | No | Public — fetch whatever poll is currently active |
| GET | `/api/polls/{pollId}/results` | No | Public — current vote tallies |
| POST | `/api/polls/{pollId}/vote` | No | Public — cast a vote, body: `{ optionId, participantId }`, broadcasts `PollResultsUpdated` |
| POST | `/api/sessions/{sessionId}/polls/generate` | Yes | AI drafts a `{ question, options[] }` suggestion from a topic — nothing is saved, host reviews/edits then calls Create |

---

## 6. How the real-time layer works (SignalR)

- **Hub:** `PulseBoard.API/Hubs/SessionHub.cs`, mapped at `/hubs/session`
- **Grouping:** every session gets its own SignalR group (`session-{sessionId}`). Both the host's browser and every participant's browser call `JoinSession(sessionId)` on connect — same group, so one broadcast reaches everyone watching that session.
- **The Clean Architecture trick:** `PulseBoard.Application` never references `Microsoft.AspNetCore.SignalR` directly — that would break the dependency rule. Instead:
  - `Application` defines `ISessionHubNotifier` (methods like `PollActivated`, `PollResultsUpdated`)
  - `API` implements it (`Services/SessionHubNotifier.cs`) using `IHubContext<SessionHub>`
  - Command handlers (`ActivatePollCommandHandler`, `CastVoteCommandHandler`, `ClosePollCommandHandler`) call `ISessionHubNotifier` after saving to the database — they have no idea SignalR is what's actually broadcasting
- **Events the client listens for:** `PollActivated(PollDto)`, `PollResultsUpdated(PollResultsDto)`, `PollClosed(pollId)`
- **Auth over WebSocket:** browsers can't set an `Authorization` header on a WebSocket handshake, so the JWT is passed as `?access_token=...` on the hub URL instead — see the `OnMessageReceived` handler in `Program.cs`.

## 7. What's deliberately NOT in this module

- Stripe billing — later module
- Docker/YARP microservices split — still a monolith by design
- No reconnection UX beyond SignalR's built-in `withAutomaticReconnect()` — a participant who disconnects and reconnects rejoins the group automatically, but won't see votes cast while disconnected until the next broadcast
- AI generation has no automated tests yet — the existing test project only covers pure domain logic (no mocking framework is installed); adding a test here would mean either mocking `IPollAiGenerator` or introducing Moq/NSubstitute, which felt like a bigger addition than this module warranted on its own

## 8. AI poll generation setup (Module 3)

Uses [Groq](https://console.groq.com) — an LLM API with a genuinely free
tier, good fit for a portfolio project that shouldn't cost anything to run.
The integration is provider-agnostic in code (`IPollAiGenerator` in
`Application`, implemented by `GroqPollAiGenerator` in `Infrastructure`) —
swapping to OpenAI/Azure OpenAI/Gemini later only means writing a new class
against that interface.

**Getting a free API key:**
1. Sign up at [console.groq.com](https://console.groq.com) (free, no card required)
2. **API Keys** → **Create API Key** → copy it

**Local dev — add it via User Secrets** (never commit it to `appsettings.json`):
Right-click `PulseBoard.API` → **Manage User Secrets** → add:
```json
{
  "Jwt:Secret": "...",
  "Ai:GroqApiKey": "paste-your-groq-key-here"
}
```

**On Render** — add an environment variable: `Ai__GroqApiKey` → your key (note the double underscore — that's how ASP.NET Core reads nested config keys from environment variables).

If the key is missing or the API call fails for any reason, the endpoint
returns a friendly 400 error rather than crashing — the host just types the
poll manually instead. See `GroqPollAiGenerator.cs` for the exact error
handling.

## 9. Deploying to Render (free, no card required)

Render's free tier hosts .NET Web Services directly from your GitHub repo,
redeploying automatically on every push to `main`. No Azure account, no
billing details, no card on file.

**One-time setup:**
1. Push this repo to GitHub (see the main project's git setup steps).
2. Go to [render.com](https://render.com) → sign up with GitHub → **New +** → **Web Service**
3. Connect your repo, then configure:
   - **Root Directory:** `backend` (if this repo has both backend/ and frontend/ folders)
   - **Runtime:** Docker, **or** if Render's native .NET runtime is available, use that with:
     - **Build Command:** `dotnet publish src/PulseBoard.API/PulseBoard.API.csproj -c Release -o out`
     - **Start Command:** `dotnet out/PulseBoard.API.dll`
   - **Instance type:** Free
4. Under **Environment**, add:
   - `Jwt__Secret` → a long random string (never reuse the placeholder in `appsettings.json`)
   - `AllowedOrigin` → your deployed frontend's URL (e.g. `https://your-app.vercel.app`)
   - `ASPNETCORE_ENVIRONMENT` → `Production`
5. Click **Create Web Service** — Render builds and deploys automatically. Migrations apply themselves on startup (see `Program.cs`) — no manual step needed.
6. Every future `git push` to `main` triggers an automatic redeploy — this is Render's own GitHub integration, separate from `.github/workflows/ci.yml` (which just runs build+test as a safety check, doesn't deploy).

**Important limitation to know about:** Render's free tier has an
**ephemeral filesystem** — the `pulseboard.db` SQLite file resets whenever
the service restarts or redeploys (free-tier services also spin down after
15 minutes of inactivity and cold-start on the next request). That means
demo data you create can disappear after a while. This is expected and
fine for a portfolio demo — just re-register/re-create a session if you
come back to a "reset" instance. If you ever need data to persist for real,
that's the point where you'd move to a real hosted database (see the Azure
SQL free-tier path if you want that later).

Note: `appsettings.json`'s `Jwt:Secret` is a placeholder for **local dev
only**. In Render, the Environment variable you set overrides it
automatically — nothing in `appsettings.json` needs to change for deployment.

## 10. Common issues

- **"no such table" errors** — the SQLite database migration hasn't been applied yet. Re-run Step 5 (`Update-Database`), or just restart the app since `Program.cs` auto-migrates on every startup.
- **401 on every authorized endpoint** — check the `Jwt:Secret` in User
  Secrets matches between token generation and validation (it always will,
  since both use the same `IConfiguration` — this only breaks if you changed
  the secret *after* getting a token; just log in again).
- **CORS error from the React app** — confirm `AllowedOrigin` in
  `appsettings.json` matches the React dev server URL exactly, including port
  (default Vite port is `5173`).
- **"AI poll generation isn't configured on this server yet"** — you haven't set `Ai:GroqApiKey` in User Secrets (local) or the `Ai__GroqApiKey` environment variable (Render). This is expected until you add a key — see section 8.
