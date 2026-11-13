# Portfolio chatbot learning log

## Save Portfolio Lead — credential-free checkpoint

The workflow is intentionally inactive and contains no Google credentials or external-service nodes at this checkpoint.

| Node | Input | Output | Why it exists |
| --- | --- | --- | --- |
| When Executed by Another Workflow | `name`, `email`, `message`, `language`, `consent`, `sessionId` | The six declared fields | Gives the parent chat workflow one narrow, documented interface. |
| Normalize and Validate Lead | Raw workflow inputs | Trimmed and normalized fields, `valid`, `validationErrors`, `requestMaterial` | Enforces explicit consent and rejects incomplete or malformed data before any adapter can run. |
| Valid Lead? | `valid` | True or false branch | Makes the safety boundary visible in the workflow graph. The false branch cannot reach storage or notification adapters. |
| Invalid Result | Invalid normalized lead | `ContactResult` with `status: invalid` | Returns a safe bilingual response without exposing validation internals. |
| Generate Request ID | `requestMaterial` | SHA-256 `requestId` | Creates a deterministic identifier from the session, normalized email and trimmed message without exposing those source values in the ID. |
| Simulation Mode | Valid lead plus `requestId` | Adds `simulationOutcome` | Keeps this learning checkpoint entirely local. Change this fixed value only while manually testing simulated outcomes. |
| Simulation Adapter | `requestId`, language and simulated outcome | Schema-shaped success, failure or unknown result | Lets us test downstream response behavior before connecting Google Sheets or Gmail. |

The next checkpoint replaces the simulated storage behavior with a duplicate lookup and append operation in Google Sheets. Google Sheets must confirm storage before Gmail is ever attempted.

## Google Sheets durability checkpoint

`Simulation Enabled?` keeps routine tests on the local adapter. Its false branch is the only route to Google Sheets.

`Lookup Existing Lead` searches the private `Leads` tab by deterministic `requestId`. `Duplicate Lead?` ends a repeated submission with `duplicate`, so neither a second row nor a later Gmail attempt can occur.

`Append Lead` maps the eight approved columns explicitly. If the append reports an error or times out, `Confirm Append Outcome` performs one lookup using the same requestId. A found row means storage succeeded despite the uncertain response. A missing row or failed confirmation returns `storage_failed`; the workflow never blindly retries the append.

`Storage Confirmed` is an internal handoff for the Gmail checkpoint. It keeps the validated lead and records `emailStatus: not_attempted`; it is not yet a visitor-facing `ContactResult`.
