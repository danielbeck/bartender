# Backend README

## Overview

This backend provides account authentication, per-user bar settings, and LLM connectivity using Python Flask and SQLite. It runs both as a Flask server (for local development) and as a CGI application (for shared hosting environments). The public cocktail library uses frontend-bundled JSON and does not need an API endpoint.

## Directory Structure and File Explanations

- **app.py**: Main Flask application. Sets up the app, logging, error handling, database helpers, and registers all endpoints (via Blueprints).
- **api.cgi**: Shell CGI launcher that invokes the adjacent `venv/bin/python`
  and `cgi_app.py`. This avoids Python-shebang startup failures under the
  hosting Apache environment and uses the deployed dependencies.
- **cgi_app.py**: Python CGI entry point. Resolves backend paths from its own
  location, initializes logging, and runs Flask. Import/startup exceptions are
  recorded in `logs/cgi_error.log`. No deploy-time path substitution is needed.
  The launcher uses Apache's `SCRIPT_FILENAME` to locate its files because
  the CGI working directory and shell `$0` are not reliable backend paths.
- **session_secret.py**: Loads private account configuration and the session signing key without a hardcoded fallback.
- **account_schema.py**: Additive, idempotent email-account and password-reset migrations.
- **reset_email.py**: Sends password reset emails using authenticated TLS-protected SMTP.
- **config_helper.py**: Utility for reading deployment configuration from config.json and determining backend paths.
- **init_db.py**: Script to initialize the SQLite database and create the users and user_bar tables without changing existing records.
- **logging_helper.py**: Helper for logging exceptions from CGI scripts to backend/logs/cgi_error.log.
- **requirements.txt**: Python dependencies for the backend (Flask, Flask-CORS, etc).
- **endpoints/**: Directory containing modularized Flask Blueprints for each API endpoint.
    - **auth.py**: Email registration/login, logout, current-user, and password recovery endpoints.
    - **bar.py**: Authenticated, per-user ingredient inventory and availability-mode settings.
    - **llm.py**: Generic chat and provider-configuration endpoints.
- **llm_provider.py**: Ollama/OpenRouter transport with optional JSON-schema output.
- **llm_calls/**: Registered structured calls; `invent_drink` loads prompt/schema
  definitions from `../shared/llm/` and validates the generated recipe.
- **bar_storage.py**: Non-destructive creation of the `user_bar` settings table.
- **database/**: Contains the SQLite database file (app.db).
- **logs/**: Stores log files for Flask and CGI error logging.
    - **flask_error.log**: Logs unhandled exceptions from Flask app.
    - **cgi_error.log**: Logs exceptions from CGI scripts.
    - **server.log**: (Optional) General server logs.
- **__pycache__/**: Python bytecode cache (auto-generated).

## Setup

Set `SECRET_KEY` in the project-root `.env` before starting the backend.
Direct Flask startup reads that key (an explicit process `SECRET_KEY` takes
precedence). There is no hardcoded fallback; missing or empty keys stop startup.

Deployment copies `SECRET_KEY`, SMTP settings, LLM settings, the reset URL, and the
production cookie setting to `~/.config/bartender/session.json`, outside the
web root, using an encrypted SSH connection without printing secrets. The
directory is mode 700 and the file is mode 600. CGI loads this private file
before starting Flask; it does not require the project `.env` on the server.
Keep the key stable across redeploys. Changing it logs out existing sessions
but preserves accounts and inventories. `APP_SECRET_FILE` can override the
private configuration path. Do not commit or serve either secrets file.
`FLASK_ENV=production` enables secure-only cookies and is only set automatically
during deployment when `PRODUCTION_DOMAIN` uses HTTPS; plain-HTTP deployments
keep non-secure cookies so sessions still work. A secret key does not encrypt
HTTP traffic.

1. Install Python dependencies:
    ```bash
    pip3 install -r requirements.txt
    ```
2. Initialize the database:
    ```bash
    python3 init_db.py
    ```
    This will create:
    - `database/app.db` - SQLite database file
    - The users and user_bar tables (no sample records)

3. Start the Flask development server:
    ```bash
    python3 app.py
    ```

## API

Authentication endpoints rely on Flask-Limiter's automatic request hook for
the configured API limits. They do not manually invoke the limiter extension;
newer Flask-Limiter releases store that extension as a set, not an object with
a `check()` method.

The Vite development frontend uses `<BASE_URL>api` (for example `/bar/api`),
proxied to Flask on port 8000. Production builds use the generated CGI URL.
The API client selects the development route using Vite's runtime mode, so
running a production build while the development server is open cannot switch
local authentication requests to CGI. JSON error messages from the backend
are displayed on the authentication form.

- `GET /` - API information
- `POST /auth/register` and `POST /auth/login`: `{"email":"person@example.com","password":"YourPassword123"}`
- `POST /auth/logout` - Clear the current session
- `GET /auth/me` - Return the current email, or `null` when logged out
- `POST /auth/forgot-password`: `{"email":"person@example.com"}`; returns the same generic confirmation for known and unknown emails
- `POST /auth/reset-password`: `{"token":"<emailed-token>","password":"NewPassword123","confirm_password":"NewPassword123"}`
- `GET /bar` - Return `ingredientIds`, `stockOnly`, and `csrfToken` for the logged-in user
- `PUT /bar` - Save `{ "ingredientIds": ["gin", "tonic-water"], "stockOnly": true }`;
  requires login and the `X-CSRFToken` header from `GET /bar`
- `GET /llm/health` - Provider configuration (not a live connectivity probe)
- `POST /llm/chat` - Send `{ "prompt": "...", "response_format": { ... }, "schema_name": "response" }`;
  schema and name are optional; returns `{provider, model, response}` with raw text.
  See [LLM connectivity](../docs/llm-connectivity.md) for setup and limitations.
- `POST /llm/calls/invent_drink` - Send `{ "input": "<JSON search preferences>" }`;
  returns `{data, provider, model}`. `data` contains `title`, `description`, and
  a supported `glass` ID and a nonempty `ingredients` array of
  `{name, quantity, color}` for the recipe illustration. Invalid model output
  returns 502 rather than a partial recipe. Definitions are read per request
  from `../shared/llm/`, or `LLM_DEFINITIONS_DIR` when configured.

Password reset links expire exactly 900 seconds after issuance, are single-use,
and are stored only as SHA-256 hashes. A replacement link invalidates the previous
link; requests for the same account within 60 seconds do not resend. This cooldown
is stored in SQLite and works across CGI processes. SMTP errors are logged and
return HTTP 503 rather than claiming delivery succeeded. Password validation and
confirmation failures do not consume the link. Successful resets invalidate all
existing sessions for that account and require a fresh login.

Links use `/reset-password#token=...` so the token is not sent in HTTP URLs or
access logs; the UI removes the fragment after capturing it. Opening the email
link does not consume it; only submitting the new password does.

Existing databases are migrated at startup and deployment without deleting users
or bar settings. Legacy username-only accounts have no email and cannot log in or
request recovery; register new email-based accounts. The legacy database
`username` column remains for schema compatibility and stores the email for new
accounts.

Configure SMTP and link destinations as described in [CONFIG.md](../CONFIG.md).
To run the account regression suite from the repository root:

```bash
python3 -m unittest backend.test_password_reset
```

Your Bar settings are stored in `user_bar`, keyed by the session's user ID.
Existing databases acquire this table on first use without changing user records.
Fresh database initialization creates both `users` and `user_bar`. Restart a
development backend running without debug reload after adding these endpoints.
The bar blueprint uses a 120-requests-per-minute rate limit in place of the
general API limits to support saving individual checkbox selections.

The todo endpoints have been removed. Existing database tables and records are
not deleted, but are no longer used by the app. Fresh databases only create the
users and user_bar tables.

## CORS

CORS is enabled using Flask-CORS for the configured `ALLOWED_ORIGINS` (or the local development defaults), with credentials support.
