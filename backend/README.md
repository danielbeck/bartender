# Backend README

## Overview

This backend provides account authentication and per-user bar settings using Python Flask and SQLite. It runs both as a Flask server (for local development) and as a CGI application (for shared hosting environments). The public cocktail library uses frontend-bundled JSON and does not need an API endpoint.

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
- **config_helper.py**: Utility for reading deployment configuration from config.json and determining backend paths.
- **init_db.py**: Script to initialize the SQLite database and create the users and user_bar tables without changing existing records.
- **logging_helper.py**: Helper for logging exceptions from CGI scripts to backend/logs/cgi_error.log.
- **requirements.txt**: Python dependencies for the backend (Flask, Flask-CORS, etc).
- **endpoints/**: Directory containing modularized Flask Blueprints for each API endpoint.
    - **auth.py**: Blueprint for registration, login, logout, and current-user endpoints.
    - **bar.py**: Authenticated, per-user ingredient inventory and availability-mode settings.
- **bar_storage.py**: Non-destructive creation of the `user_bar` settings table.
- **database/**: Contains the SQLite database file (app.db).
- **logs/**: Stores log files for Flask and CGI error logging.
    - **flask_error.log**: Logs unhandled exceptions from Flask app.
    - **cgi_error.log**: Logs exceptions from CGI scripts.
    - **server.log**: (Optional) General server logs.
- **__pycache__/**: Python bytecode cache (auto-generated).

## Setup

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
- `POST /auth/register` - Register with a username and password
- `POST /auth/login` - Log in with a username and password
- `POST /auth/logout` - Clear the current session
- `GET /auth/me` - Return the current username, or `null` when logged out
- `GET /bar` - Return `ingredientIds`, `stockOnly`, and `csrfToken` for the logged-in user
- `PUT /bar` - Save `{ "ingredientIds": ["gin", "tonic-water"], "stockOnly": true }`;
  requires login and the `X-CSRFToken` header from `GET /bar`

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
