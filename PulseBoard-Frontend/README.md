# PulseBoard — Frontend (React + TypeScript + Vite)

**Module 1: Auth + Session Lifecycle** — host register/login, create
sessions, see the join code, start/end a session.

**Module 2: Polls + Live Voting (SignalR)** — hosts build polls, activate
one at a time, and watch an animated vote bar chart update live.
Participants join via `/join`, get a poll pushed to their screen the moment
the host activates it, vote once, and see live results — no refresh, no
polling.

**Module 3: AI Poll Generation** — in the poll creation form, type a topic
and an LLM drafts a question + options, which you can edit before creating.

---

## 1. Stack and why

| Tool | Why |
|---|---|
| **Vite** | Fast dev server + build tool, effectively the standard for new React apps now (faster than CRA, which is deprecated). |
| **TypeScript** | Types the API responses (see `src/types/index.ts`) so a backend DTO rename breaks your build instead of failing silently at runtime. |
| **React Router v7** | Client-side routing; also handles the "redirect to /login if not authenticated" guard (`src/components/ProtectedLayout.tsx`). |
| **TanStack Query** | Handles server-state: loading/error states, caching, and refetching after a mutation (e.g. session list refreshes automatically after you create one) — without writing manual `useEffect` + `useState` fetch boilerplate. |
| **Zustand** | Tiny global store for auth state (JWT + host info), persisted to `localStorage` so refreshing the page doesn't log you out. |
| **Tailwind CSS v4** | Utility-first styling. Note: v4 works differently from v3 — no `tailwind.config.js` or `postcss.config.js` needed; it's a Vite plugin (`@tailwindcss/vite`) and everything is configured via the single `@import "tailwindcss";` line in `src/index.css`. |
| **Axios** | HTTP client with interceptors — see `src/api/client.ts` — automatically attaches the JWT to every request and logs you out on a 401. |
| **@microsoft/signalr** | Official SignalR client — powers the live poll/vote updates. Wrapped in a single hook (`useSessionHub`) rather than scattered connection code per page. |
| **qrcode.react** | Renders the QR code on the session detail page — encodes a direct `/join?code=XXXXXX` link so a scan skips typing the code entirely. |
| **html-to-image** | Captures the off-screen share card as a PNG for the "Share as image" button — turns a styled DOM node into a real image file, not a screenshot. |

---

## 2. Design system

The UI follows a deliberate visual identity themed around the product's
name — "pulse" as in a live signal / heartbeat:

- **Colors:** Ink `#0B0B14` background, Pulse Violet `#7C5CFF` and Pulse
  Magenta `#FF4FCB` as the primary gradient pair, Signal Mint `#2CE8A6` for
  anything "live". Defined as CSS custom properties in `src/index.css` under
  `@theme` (Tailwind v4's token system — no separate config file).
- **Type:** Space Grotesk for headings/display, Inter for body text,
  JetBrains Mono for the join code and anything code-like. Loaded via
  `@fontsource` packages (self-hosted, no external font CDN request).
- **Signature motif:** concentric "pulse rings" (see `.pulse-ring` in
  `src/index.css`) — a radar/heartbeat animation used consistently on every
  "Live" indicator and the join-code reveal, so it reads as one deliberate
  idea instead of random decoration.
- **Motion:** Framer Motion powers page transitions (`PageTransition.tsx`),
  staggered list reveals (`staggerContainer`/`staggerItem`), the rotating
  gradient border on the session detail hero, and the flip-in join-code
  digits. `prefers-reduced-motion` is respected globally (see `index.css`).

## 3. Folder structure

```
src/
├── api/               # All backend calls live here — nothing else touches axios directly
│   ├── client.ts       # axios instance + JWT interceptor + error helper
│   ├── authApi.ts      # register, login
│   └── sessionApi.ts   # list, create, start, end, join-by-code
├── store/
│   └── authStore.ts    # zustand store: token, hostId, name, email, isAuthenticated
├── types/
│   └── index.ts         # TS interfaces matching the backend's DTOs exactly
├── components/
│   ├── Navbar.tsx
│   ├── ProtectedLayout.tsx   # route guard + shared page shell
│   └── StatusBadge.tsx       # Draft/Live/Ended pill
├── pages/
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   ├── DashboardPage.tsx      # session list + create form
│   ├── SessionDetailPage.tsx  # big join code, Start/End buttons
│   └── JoinPage.tsx           # public — participant enters a code
├── App.tsx             # route table
└── main.tsx             # React root + QueryClientProvider
```

**Why `api/` is separated like this:** every network call goes through one of
three files, never scattered `fetch()` calls inside components. When Module 2
adds SignalR and polls, you add `pollApi.ts` next to `sessionApi.ts` — the
pattern already exists, so it's obvious where new code goes.

---

## 4. Prerequisites

- **Node.js 18+** (LTS recommended) — https://nodejs.org
- The **backend running first** (see `PulseBoard-Backend/README.md`) — the
  frontend has nothing to talk to otherwise.

---

## 5. Running it

```bash
cd PulseBoard-Frontend
npm install
npm run dev
```

Open **http://localhost:5173**. You'll be redirected to `/login`.

The dev server is configured (in `vite.config.ts`) to always run on port
`5173` — this matters because the backend's CORS policy in
`appsettings.json` (`AllowedOrigin`) is set to allow exactly that origin.
If you change this port, update the backend config to match, or requests
will fail with a CORS error in the browser console.

### Connecting to a backend on a different port

Edit `.env.development`:
```
VITE_API_BASE_URL=https://localhost:7050/api
```
Change the port/host to match wherever `PulseBoard.API` is actually running
(check the terminal output or `launchSettings.json` in the backend if unsure).

### Build for production
```bash
npm run build      # outputs to dist/
npm run preview    # serve the production build locally to sanity-check it
```

---

## 6. How auth actually works, end to end

1. User submits the login form -> `authApi.login()` -> `POST /api/auth/login`
2. Backend returns `{ hostId, name, email, token }`
3. `useAuthStore.setAuth(result)` stores it in Zustand, which persists it to
   `localStorage` under the key `pulseboard-auth`
4. Every subsequent axios request automatically gets
   `Authorization: Bearer <token>` attached via the request interceptor in
   `src/api/client.ts` — no component ever manually attaches the header
5. `ProtectedLayout` checks `isAuthenticated` on every route render; if false,
   it redirects to `/login` before the page even mounts
6. If the backend ever responds `401` (expired token), the response
   interceptor automatically logs the host out and redirects — you don't
   need to handle this per-page

---

## 7. How the live voting flow works, end to end

1. **`useSessionHub(sessionId)`** (`src/hooks/useSessionHub.ts`) opens a SignalR connection to the backend hub on mount, calls `JoinSession(sessionId)`, and cleans up (`LeaveSession` + `stop()`) on unmount. Both the host's `SessionDetailPage` (via `PollManager`) and the participant's `ParticipatePage` use this same hook — one connection pattern, two different UIs on top.
2. **Host activates a poll** → `pollApi.activate(pollId)` hits the backend → backend broadcasts `PollActivated` to everyone in the session's SignalR group, **including the host's own browser** (it joined the same group) → `useSessionHub`'s `PollActivated` listener updates `activePoll` state → `PollManager` re-renders showing it as Active.
3. **Participant's screen** is sitting on `ParticipatePage`, also subscribed to the same group. The moment `PollActivated` fires, their `activePoll` state updates from `null` to the poll — the "waiting for host" screen swaps to the voting screen automatically, no action needed from them.
4. **Participant votes** → `pollApi.vote(pollId, optionId, participantId)` → backend saves the vote, then broadcasts `PollResultsUpdated` with fresh tallies to the whole group → every connected screen (host's chart, every other participant who already voted) animates to the new percentages via `LiveBarChart`.
5. **`getParticipantId()`** (`src/api/participantId.ts`) generates a random UUID once per browser and stores it in `localStorage` — this is how the backend blocks the same participant voting twice on one poll, without requiring an account.
6. **Host closes the poll** → broadcasts `PollClosed` → every participant's UI clears back to a waiting state, ready for the next poll.

## 8. Component structure for Module 2

- `components/PollManager.tsx` — host-side: poll creation form, list of polls with Activate/Close controls, embeds `LiveBarChart` for the active poll's live results
- `components/LiveBarChart.tsx` — shared by both host and participant views; animates bar width via Framer Motion as `results` prop changes
- `pages/ParticipatePage.tsx` — participant-side: waiting state → voting state → live-results state, all driven by `useSessionHub`
- `hooks/useSessionHub.ts` — the one place SignalR connection logic lives
- `components/JoinQrCode.tsx` — QR code encoding `/join?code=XXXXXX`, toggled visible on the session detail page
- `components/ShareSessionCard.tsx` — an off-screen (not visible in the UI) styled card containing the QR + join code + title, sized for sharing to a phone. Never rendered on-screen — it exists purely as something `html-to-image` can snapshot cleanly, without any buttons or app chrome in the shot.
- `components/ShareSessionButton.tsx` — captures that card as a PNG and calls `navigator.share()` with the file where supported (most mobile browsers — this is what makes it show up in WhatsApp/Messages' native share sheet). Falls back to a plain file download on browsers that don't support sharing files yet (most desktop browsers as of writing).

---

## 9. Deploying to Vercel (free, no card required)

1. Push this repo to GitHub.
2. Go to [vercel.com](https://vercel.com) → sign up with GitHub → **Add New → Project** → select your repo
3. Configure:
   - **Root Directory:** `frontend` (if this repo has both `backend/` and `frontend/` folders)
   - **Framework Preset:** Vite (auto-detected)
   - **Build Command:** `npm run build` (default)
   - **Output Directory:** `dist` (default)
4. Under **Environment Variables**, add:
   - `VITE_API_BASE_URL` → your deployed Render backend URL + `/api`, e.g. `https://pulseboard-api.onrender.com/api`
   - `VITE_SIGNALR_HUB_URL` → your deployed Render backend URL + `/hubs/session`, e.g. `https://pulseboard-api.onrender.com/hubs/session`
5. **Deploy** — Vercel builds and gives you a live URL immediately (`your-app.vercel.app`)
6. Every future `git push` to `main` triggers an automatic redeploy — no extra CI setup needed on the frontend side.

`vercel.json` in this repo handles the SPA routing fallback (so refreshing
`/dashboard` or `/sessions/:id` doesn't 404 — Vercel serves `index.html` for
any unmatched route and React Router takes over from there).

**One thing to go back and fix on the backend once you have this URL:** set
the `AllowedOrigin` environment variable on Render to this Vercel URL, or
your requests will fail CORS.

## 10. Known gaps (intentional — later modules add these)

- No AI question generation, no Stripe billing — later modules
- No automated frontend tests yet — can add Vitest + React Testing Library once the UI stabilizes, so tests aren't rewritten every time a component changes shape
- No reconnection banner if a participant's SignalR connection drops — `withAutomaticReconnect()` handles reconnecting silently, but there's no UI telling them "you're offline" in the meantime

## 11. Common issues

- **Blank page / "Failed to fetch"** — backend isn't running, or
  `VITE_API_BASE_URL` doesn't match the backend's actual port.
- **CORS error in browser console** — backend's `AllowedOrigin` in
  `appsettings.json` doesn't match `http://localhost:5173` exactly.
- **Styles not applying** — make sure `src/index.css` has
  `@import "tailwindcss";` at the top and `main.tsx` imports `./index.css`.
- **Poll doesn't appear on the participant's screen** — check the browser console for SignalR connection errors first. Usually means `VITE_SIGNALR_HUB_URL` doesn't match the backend, or the backend's CORS/hub isn't reachable.
- **"You've already voted" on a poll you didn't vote on** — the participant ID in `localStorage` (`pulseboard-participant-id`) persists across sessions in the same browser profile. This is expected — clear that key, or use a private/incognito window, to simulate a "new" participant during testing.
