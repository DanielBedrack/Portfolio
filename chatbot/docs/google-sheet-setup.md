# Google Sheet setup for portfolio leads

Create one private native Google Sheet named `Portfolio Chatbot Leads`. Keep it owned by Daniel's Google account and do not share it.

The workbook contains one tab named `Leads`. Row 1 contains these headers in this exact order:

| A | B | C | D | E | F | G | H |
| --- | --- | --- | --- | --- | --- | --- | --- |
| createdAt | language | name | email | message | consent | requestId | emailStatus |

Allowed `emailStatus` values are `not_attempted`, `sent`, `failed`, and `unknown`.

In local n8n, connect the Google Sheets nodes with OAuth2 and select this document and the `Leads` tab. Daniel completes the Google login himself; passwords, authorization codes, refresh tokens, and credential exports must never be copied into the repository or chat.

The committed workflow intentionally contains only the spreadsheet's display name placeholder. It contains no spreadsheet ID and no credential binding.
