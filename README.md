# Bartender

A small React frontend paired with a Python/Flask backend (SQLite) — configured to run locally for development and as a CGI-backed app on shared hosting.

The app includes a public cocktail library and account authentication.

## Cocktail library

The landing page opens `/cocktails`. Browse all cocktails, search by name,
ingredient, garnish, or metadata, and combine filters for category, base spirit,
flavor, method, glass, strength, difficulty, sweetness, sourness, bitterness,
carbonation, and temperature. Results are alphabetical. Filters collapse on
mobile and can be reset together.

Each cocktail has a shareable detail page at `/cocktails/:cocktailId`, with
ingredient quantities, garnish, a cocktail description, mixing instructions,
serving metadata, category descriptions, and
characteristics. Click a metadata tag to find matching cocktails. Search and
filters are stored in the URL and retained when returning from a detail page.
Browsing is public; favourites and personal notes are not included.

The source is `data/cocktails.json`, imported directly by the frontend. Data
changes are picked up during development and included in the next production
build; no database import or backend change is required. The existing deployment
script builds and deploys the bundled data alongside the frontend.
Duplicate cocktail IDs are preserved as numbered recipe variants, each with its
own detail URL (the second recipe uses an `-variant-2` suffix). The source JSON is
not modified.

Authentication is available at `/auth`. The boilerplate todo UI and API have
been removed. Existing database records are left untouched; new databases
contain only the users table.

Login and registration use email addresses. The "Forgot my password" link opens
an email request form; emailed single-use links let users enter and confirm a new
password and expire after 15 minutes. Successful resets revoke existing sessions.
Set SMTP values in `.env`; see [the email configuration guide](CONFIG.md#password-recovery-email).
Legacy username-only accounts are preserved in the database but cannot log in;
create new email-based accounts.

Modify .env to deploy to different subdirectories or domains (see .env.example)

## Quick links
- Backend: backend/app.py
- User DB schema: backend/init_db.py
- Deploy script: deploy.sh
- Config: .env (template: .env.example)

## Run locally

Backend (development)

```bash
cd backend
# optional: python3 -m venv .venv && source .venv/bin/activate
pip3 install -r requirements.txt
python3 init_db.py    # creates database/app.db and the users table
DEBUG=1 python3 app.py
```

Service listens on http://127.0.0.1:8000 by default.

Frontend (development)

```bash
cd frontend
npm install
npm run dev
```

Dev frontend runs on http://localhost:3000 and proxies API requests to the backend.  `npm run dev` will also start the backend server.

Both `npm run dev` (from `frontend`) and `./dev.sh` first stop existing listeners
on ports 3000 and 8000 owned by the current user and running from this project's
root, frontend, or backend directory. Unrelated listeners are not stopped;
startup fails with their PID instead. This cleanup requires `lsof`.

## API (current)

- GET / — root info
- POST /auth/register and POST /auth/login — `{"email":"person@example.com","password":"YourPassword123"}`
- POST /auth/logout — log out
- GET /auth/me — fetch the current email (returns `{ user: ... }`)
- POST /auth/forgot-password — `{"email":"person@example.com"}`; returns the same generic confirmation for known and unknown emails
- POST /auth/reset-password — `{"token":"<emailed-token>","password":"NewPassword123","confirm_password":"NewPassword123"}`


See `backend/app.py` for authoritative endpoint behavior.

## Database

SQLite DB: `backend/database/app.db`.
To create missing user tables without resetting existing data:

```bash
python3 backend/init_db.py
```

## Deployment

The deployment process is managed by the `deploy.sh` script, which uses `.env` for all environment and path settings.

### Setup

Before deploying, create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
# Edit .env with your deployment settings
```

### Standard Deploy

```bash
./deploy.sh
```
- Syncs backend and frontend code to the configured remote directory.
- Copies the session key, SMTP settings, and reset URL to private server configuration
  outside the web root, without printing secrets. No `.env` upload is needed;
  see [backend/README.md](backend/README.md).
- Installs backend Python dependencies in a virtual environment (if not already present).
- Initializes the backend database **only if** this is the first deploy (i.e., the backend directory did not previously exist).
- Does **not** overwrite an existing database on redeploys.
- Applies additive account-schema migrations on every deploy.

### Force Fresh Deploy (reset database)

```bash
./deploy.sh --force-fresh
```
- Performs all steps of a standard deploy.
- **Always** (re)initializes the backend database by running `init_db.py` on the server, even if the backend directory already exists.
- **Deletes the existing database**, including accounts, and recreates the users table.

**Note:**
- The deploy script uses SSH and rsync. You must have SSH access to the configured host.
- The backend virtual environment and dependencies are managed automatically on the server.
- The frontend is built locally and deployed to the correct subdirectory as configured.

See `deploy.sh` for full details and customization options.
