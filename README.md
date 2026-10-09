# PulseBoard

A real-time polling and quiz application with a .NET 8 API, React/TypeScript frontend, SignalR updates, and optional AI-generated questions.

## Current features

- Host registration/login, draft/live/ended sessions, six-digit join codes, and QR sharing.
- Draft polls, optional correct answers, anonymous voting, and live results.
- Session end closes active polls and notifies participants. Refresh/reconnect recovers the ended state.
- AI question suggestions through the configured Groq provider.
- Layered backend, EF Core with **SQLite**, and a Vite frontend.

See [COMPLETION.md](COMPLETION.md) for remaining work and the acceptance checklist. This is an evolving portfolio project.

For AI setup and the retired-model migration, see [AI setup](docs/AI_SETUP.md).
For the proposed commercial module and validation plan, see [Product direction](docs/PRODUCT_DIRECTION.md).

## Run locally

Prerequisites: .NET 8 SDK and Node.js 22.12+ (CI uses Node 22).

### Backend

From the repository root:

```bash
cd PulseBoard-Backend/src/PulseBoard.API
dotnet user-secrets set "Jwt:Secret" "replace-with-your-own-random-secret-of-at-least-32-characters"
# Optional: only needed for AI suggestions.
dotnet user-secrets set "Ai:GroqApiKey" "your-provider-api-key"
dotnet dev-certs https --trust
dotnet run
```

The API is at https://localhost:7050 and Swagger is at https://localhost:7050/swagger.
EF Core applies migrations on startup. The default database is a local SQLite file.
Manual poll creation and voting do not require an AI key.

### Frontend

In another terminal, from the repository root:

```bash
cd PulseBoard-Frontend
npm ci
npm run dev
```

Open http://localhost:5173. The development API/hub URLs are configured in
`PulseBoard-Frontend/.env.development`; use `.env.example` as a reference.
If you change the frontend origin, update the backend `AllowedOrigin` setting.

## Verify

From the repository root:

```bash
dotnet test PulseBoard-Backend/PulseBoard.sln --configuration Release
cd PulseBoard-Frontend
npm ci
npm run lint
npm test
npm run build
```

The root `.github/workflows/ci.yml` builds and tests both applications on pull requests,
pushes to main, and work branches. Backend tests include SQLite-backed session lifecycle
regressions; frontend tests cover reconnects, end notifications, missed notifications,
and stale HTTP responses.

## Deployment configuration

- Frontend project root: `PulseBoard-Frontend`; build: `npm run build`; output: `dist`.
- Backend Docker build context: `PulseBoard-Backend`.
- Set backend `Jwt__Secret`, `AllowedOrigin`, and optionally `Ai__GroqApiKey` through the host.
- Set frontend `VITE_API_BASE_URL` and `VITE_SIGNALR_HUB_URL` to the deployed backend.
- Give SQLite persistent storage and set `ConnectionStrings__DefaultConnection` to that path.
- Validate the host/participant flow and both CI jobs before deploying changes.
