# Backend README

## Overview

This backend provides account authentication using Python Flask and SQLite. It runs both as a Flask server (for local development) and as a CGI application (for shared hosting environments). The public cocktail library uses frontend-bundled JSON and does not need an API endpoint.

## Directory Structure and File Explanations

- **app.py**: Main Flask application. Sets up the app, logging, error handling, database helpers, and registers all endpoints (via Blueprints).
- **api.cgi**: CGI entry point for running the Flask app under CGI. Handles environment setup and error logging for CGI deployments.
- **config_helper.py**: Utility for reading deployment configuration from config.json and determining backend paths.
- **init_db.py**: Script to initialize the SQLite database and create the users table without changing existing records.
- **logging_helper.py**: Helper for logging exceptions from CGI scripts to backend/logs/cgi_error.log.
- **requirements.txt**: Python dependencies for the backend (Flask, Flask-CORS, etc).
- **endpoints/**: Directory containing modularized Flask Blueprints for each API endpoint.
    - **auth.py**: Blueprint for registration, login, logout, and current-user endpoints.
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
    - The users table (no sample records)

3. Start the Flask development server:
    ```bash
    python3 app.py
    ```

## API

- `GET /` - API information
- `POST /auth/register` - Register with a username and password
- `POST /auth/login` - Log in with a username and password
- `POST /auth/logout` - Clear the current session
- `GET /auth/me` - Return the current username, or `null` when logged out

The todo endpoints have been removed. Existing database tables and records are
not deleted, but are no longer used by the app. Fresh databases only create the
users table.

## CORS

CORS is enabled using Flask-CORS for the configured `ALLOWED_ORIGINS` (or the local development defaults), with credentials support.
