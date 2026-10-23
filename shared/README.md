# Shared LLM definitions

Following aidungeoncrawl's layout, each call has files in `llm/` named after
the call:

- `<name>.md`: system prompt
- `<name>.input.md`: user-message template with exactly one `{{input}}`
- `<name>.json`: structured response schema

`invent_drink` produces a title, description, and nonempty ingredient list.
Each ingredient has a name, a quantity string including units, and an approximate
six-digit hex color. A supported glass ID selects the illustration. At least
one ingredient must have a positive ml volume; liquid volumes are capped at
1000 ml per ingredient for a single serving. These fields drive the existing
glass renderer without inventing catalog ingredient identities.

The backend reads the files on every call, sends the schema to the provider,
and includes it in the system prompt. The call implementation in
`backend/llm_calls/invent_drink.py` validates the complete recipe shape and
rejects empty strings before returning data. Keep its validation in sync with
schema changes.

Definitions are backend-owned runtime inputs, not frontend prompt imports.
`LLM_DEFINITIONS_DIR` optionally overrides this directory for backend startup.
Local definition edits apply on the next request without restarting Flask.
Deployment copies `shared/` beside `backend/`; `.htaccess` denies direct HTTP
access. Redeploy after editing definitions on a deployed site.
