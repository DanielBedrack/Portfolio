# Free local AI mode with automatic static fallback

This optional mode lets the portfolio use Daniel's local `qwen3:4b-instruct` model while the Windows computer, Docker, n8n, Ollama, and ngrok are all online. If any one of them is unavailable, the browser uses the built-in static portfolio answers instead. The site never needs a paid AI API.

Nothing in this guide publishes the portfolio or activates the n8n workflow automatically.

## Cost and service boundaries

The local parts—Ollama, the model, the gateway code, and the self-hosted n8n Community Edition setup—do not charge per message. The design uses ngrok's Free plan and its automatically assigned development domain. As verified against ngrok's official documentation on 2026-11-11, the Free plan is `$0`, includes one assigned dev domain, and is limited to 20,000 HTTP requests and 1 GB of outbound transfer per month. Do not select Hobbyist, Pay-as-you-go, a custom domain, or any upgrade prompt.

Official references:

- https://ngrok.com/docs/pricing-limits/free-plan-limits
- https://ngrok.com/docs/gateway/domains
- https://ngrok.com/pricing

Free-plan limits and terms can change. Recheck those pages before a future public launch. If the free quota is exhausted, local AI becomes unavailable and the browser falls back to static mode; the code does not buy more capacity.

ngrok terminates HTTPS at its edge. By default, its Traffic Inspector stores request metadata but not message bodies. Keep **Full Capture disabled** in the ngrok dashboard; enabling it would store request and response content for the plan's retention period. The website client sends ngrok's documented browser-warning bypass header only for the JSON API call.

## Prerequisites

- Docker Desktop is running.
- Ollama is running on Windows and `ollama list` includes `qwen3:4b-instruct`.
- The local n8n account at `http://localhost:5678` is available.
- The `Portfolio Chat` workflow export is imported or updated, but remains inactive until the explicit activation step.
- An ngrok Free account has an assigned dev domain and an agent authtoken. Do not paste either value into Git, chat, screenshots, or tracked files.

## Configure ignored local values

From the repository root in PowerShell:

```powershell
Copy-Item chatbot/.env.example chatbot/.env
```

Open the ignored `chatbot/.env` file locally and replace only these placeholders:

```dotenv
NGROK_AUTHTOKEN=replace_with_local_token
NGROK_DOMAIN=replace_with_free_static_domain
```

Use only the hostname assigned under ngrok Dashboard → Domains, without `https://` and without a path. Keep every other value from the example unchanged.

For a local website build, the matching public gateway URL is:

```powershell
$env:VITE_PORTFOLIO_CHAT_ENABLED='true'
$env:VITE_PORTFOLIO_CHAT_GATEWAY_URL='https://YOUR_ASSIGNED_DOMAIN'
```

Do not add these two variables to the production deployment until Daniel separately approves publishing the widget and public gateway URL.

## Prepare the local n8n workflow

Import or update [`../workflows/portfolio-chat.json`](../workflows/portfolio-chat.json) in the local n8n instance. Confirm all of the following before activation:

- Chat Trigger webhook ID is `94c404d3-766e-4a0b-906c-517ad0b0815a`.
- The model is `qwen3:4b-instruct`.
- Thinking is off, temperature is `0.2`, context is `4096`, and maximum output is `256` tokens.
- There is no `save_portfolio_lead` tool connected to the public chat.
- The prompt directs contact requests only to `danielbedrack@gmail.com` and never collects visitor details.

Activation is a separate manual action. Do not activate until the local stack is ready and Daniel approves live smoke testing.

## Build and start the local stack

```powershell
docker compose --env-file chatbot/.env -f chatbot/compose.yaml up -d --build
docker compose --env-file chatbot/.env -f chatbot/compose.yaml ps
```

Expected exposure:

- n8n: `127.0.0.1:5678` only.
- gateway: Docker network only; no Windows host port.
- Ollama: Windows host only; no public Docker port.
- ngrok: forwards the assigned HTTPS dev domain only to `portfolio-gateway:8080`.

When the local workflow is active, test the public API without personal data:

```powershell
Invoke-RestMethod "https://YOUR_ASSIGNED_DOMAIN/health"
```

The only public application routes are `GET /health`, `OPTIONS /chat`, and `POST /chat`. `/`, `/rest`, `/signin`, `/webhook`, and all arbitrary paths must return `404`; wrong methods must return `405`.

## Preview the website locally

In the same PowerShell session where the two Vite variables were set:

```powershell
npm run build
npm run preview -- --host 127.0.0.1
```

An AI response is labeled `Local AI` or `AI מקומי`. A static response is labeled `Portfolio information` or `מידע מהפורטפוליו`. Technical failures are intentionally hidden from visitors.

## Stop without cost or data loss

```powershell
docker compose --env-file chatbot/.env -f chatbot/compose.yaml down
```

Stopping Docker, n8n, ngrok, Ollama, or the computer makes local AI unavailable. The already-published static site, if enabled later, continues answering from its built-in approved portfolio content. n8n data stays in the local Docker volume; chat messages are not saved as successful execution payloads.

## Manual security and privacy checklist

- `GET /health` returns `200` only when n8n and the exact Ollama model are available.
- A harmless English and Hebrew `/chat` request returns `source: "ollama"`.
- `/rest`, `/signin`, `/webhook`, `/`, and an arbitrary path return `404`.
- A wrong method returns `405`.
- Non-JSON, malformed, over-limit, and origin-mismatched requests are rejected.
- Request 6 within one minute is rejected with `429`; the daily and job-description limits also apply.
- Stopping ngrok, Ollama, or n8n produces one static browser answer with no technical error text.
- n8n successful execution payload saving is set to `none`.
- Gateway logs contain no message, answer, job description, session ID, upstream URL, or stack trace.
- ngrok Traffic Inspector Full Capture is disabled.
- `git status --short`, the workflow secret scan, and `git grep` show no real token or assigned domain before any push.

## Automated verification without secrets

```powershell
npm run check
npm --prefix chatbot test
npm --prefix chatbot run validate:workflows
npm --prefix chatbot run check:secrets
npm --prefix chatbot/gateway test
npm --prefix chatbot/gateway run build

$env:VITE_PORTFOLIO_CHAT_ENABLED='true'
$env:VITE_PORTFOLIO_CHAT_GATEWAY_URL='https://gateway.test/'
npm run test:e2e -- e2e/chatbot-hybrid.spec.ts
```

The hybrid browser test intercepts `gateway.test`; it does not contact ngrok, n8n, or Ollama and does not prove the live tunnel is configured. Live verification requires Daniel's local ignored values and explicit workflow activation approval.
