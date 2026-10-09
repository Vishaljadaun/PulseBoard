# AI generation: diagnosis and deployment

## Why the old default fails

PulseBoard previously selected `llama-3.1-8b-instant`. Groq's deprecation notice lists its shutdown for free/developer accounts on August 16, 2026, and recommends `openai/gpt-oss-20b`. Enterprise committed-spend accounts are an exception.

Source: https://console.groq.com/docs/deprecations

The screenshot's generic message proves that the provider returned an unsuccessful response, but does not identify its HTTP status. A retired model is a likely cause when the server uses the repository default. Invalid credentials, model permissions, rate limits, and provider outages can also cause a failure. Production logs/settings are needed to confirm the deployed cause.

## Backend settings

Set these in the backend host's environment settings:

```text
Ai__Model=openai/gpt-oss-20b
Ai__GroqApiKey=<your real Groq API key>
```

Do not put the key in React `VITE_` variables or commit it. For local development, use .NET user secrets from `PulseBoard-Backend/src/PulseBoard.API`.

The repository default is updated, but an existing `Ai__Model` environment override still wins. Update an old override as well, then redeploy the backend. Deploy the frontend changes too to get the new editor/recovery UI.

## Error contract

| Code | API status | Host action |
| --- | --- | --- |
| `ai_configuration` | 503 | Workspace owner checks key, model ID, and model access. |
| `ai_rate_limited` | 429 | Wait, then retry; check provider usage limits if persistent. |
| `ai_timeout` | 504 | Retry; check backend/provider latency if persistent. |
| `ai_unavailable` | 502 | Retry after the connection or provider recovers. |
| `ai_invalid_response` | 502 | Retry or write manually; the app refuses to guess the correct answer. |

Responses include `error`, `code`, and `retryable`. Logs include HTTP status and model ID, without provider bodies, prompts, or API keys. A 400/404 from the provider is treated as a configuration/request problem; inspect the configured model and supported request format rather than assuming every 400 means model retirement.

## Smoke test after deployment

1. Sign in, create a session, and open New question.
2. Generate a question for “async and await in C#”.
3. Verify four nonblank distinct answers, a valid correct-answer selection, and a sensible question.
4. Review the facts, save it, start the session, and activate it.
5. Vote from another browser and confirm the results.

Automated provider tests use a fake HTTP handler; they do not prove that the production key/model is enabled. A real authenticated smoke test is still required after deployment. JSON mode is a formatting aid, not a factual accuracy guarantee; keep human review before publishing.

Provider format reference: https://console.groq.com/docs/structured-outputs
