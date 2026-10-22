# Portfolio lead manual test matrix

Use only fictional details whose message begins with `LOCAL TEST`. Keep the workflows inactive throughout setup.

| Case | Expected storage | Expected notification | Expected result |
| --- | --- | --- | --- |
| Consent declined | No Sheets call | No Gmail call | `invalid` |
| Missing required field | No Sheets call | No Gmail call | `invalid` |
| Invalid email | No Sheets call | No Gmail call | `invalid` |
| First valid requestId | One new row | Exactly one Gmail attempt after confirmed storage | `stored_and_notified`; row has `emailStatus: sent` |
| Repeated requestId | No additional row | No additional attempt | `duplicate` |
| Confirmed Sheets failure | No row | No Gmail call | `storage_failed` |
| Unknown append outcome, row found by requestId | No retry and exactly one row | Exactly one Gmail attempt | Storage is treated as confirmed |
| Unknown append outcome, row not found | No retry | No Gmail call | `storage_failed` |
| Confirmed Gmail failure | Existing row remains | No retry | `stored_notification_failed`; row has `emailStatus: failed` |
| Unknown Gmail outcome | Existing row remains | No retry | `stored_notification_unknown`; row has `emailStatus: unknown` |
| Email-status update failure | Existing row remains | No retry | `stored_notification_unknown`; manual reconciliation required |

Before the first real test email, obtain action-time confirmation. After the run, inspect the `Leads` tab and verify all eight columns, the deterministic requestId, and the final `emailStatus`. The Gmail body must contain only name, email, message, language and requestId.
