# Local Portfolio Chatbot

This directory contains the free, local learning environment for Daniel's portfolio chatbot. It is not a public deployment.

## What runs where

- **Ollama runs natively on Windows.** It uses the computer's CPU, memory and available GPU support to run the local `qwen3:4b` model.
- **n8n runs inside Docker Desktop.** Docker isolates the automation service and keeps its state in the named `n8n_data` volume.
- **`host.docker.internal` connects the two.** From inside the n8n container, `localhost` means the container itself. The special hostname reaches Ollama on the Windows host.

## Local configuration

Copy `.env.example` to `.env` only when a local override is needed. The `.env` file is ignored by Git. Do not put passwords, tokens, OAuth codes or other credentials in either file; credentials belong in n8n's Credentials screen.

The local instance:

- listens only on `http://localhost:5678`;
- keeps workflow state in a Docker named volume;
- mounts `workflows/` and `knowledge/` read-only;
- removes stored execution payloads after 24 hours;
- disables optional diagnostics, personalization and version notifications.

## Start and stop

Start n8n without deleting saved state:

```powershell
docker compose up -d
```

Stop n8n without deleting saved state:

```powershell
docker compose down
```

Do not add `--volumes` to the stop command. That flag deletes the named volume containing the local n8n account, credentials and workflows.

## Verify the environment

After Ollama and n8n are running:

```powershell
npm run check:environment
```

The check passes only when n8n and Ollama respond and Ollama lists `qwen3:4b`.

## Importing the public workflow exports

The JSON files in `workflows/` are safe learning exports. They are inactive and do not contain credential bindings. The lead workflow also starts in simulation mode, so it does not write to Google Sheets or send Gmail messages.

After importing `save-portfolio-lead.json`, select your own Google Sheet in every Google Sheets node. The public export intentionally uses `REPLACE_WITH_YOUR_GOOGLE_SHEET_ID` instead of Daniel's private spreadsheet ID. Connect Google and Ollama credentials only through n8n's Credentials screen; never add secrets to the JSON files or commit them to Git.
