#!/bin/bash

set -e -o pipefail

ROOT=$(cd "$(dirname "$0")" && pwd -P)

if ! command -v lsof >/dev/null; then
    echo "Cannot check development ports: lsof is required." >&2
    exit 1
fi

listeners() {
    local status=0
    lsof -nP -t -iTCP:3000 -iTCP:8000 -sTCP:LISTEN || status=$?
    if [ "$status" -gt 1 ]; then
        echo "Could not inspect development ports." >&2
        return "$status"
    fi
}

PIDS=$(listeners | sort -u)

# Validate every listener before stopping any processes.
for pid in $PIDS; do
    owner=$(ps -p "$pid" -o uid= | tr -d ' ')
    cwd=$(lsof -a -p "$pid" -d cwd -Fn | sed -n 's/^n//p')
    if [ "$owner" != "$(id -u)" ] || {
        [ "$cwd" != "$ROOT" ] &&
        [ "$cwd" != "$ROOT/backend" ] &&
        [ "$cwd" != "$ROOT/frontend" ]
    }; then
        echo "Port 3000 or 8000 is occupied by unrelated PID $pid; refusing to stop it." >&2
        exit 1
    fi
done

for pid in $PIDS; do
    echo "Stopping existing development server (PID $pid)..."
    if ! kill "$pid"; then
        if kill -0 "$pid" 2>/dev/null; then
            echo "Could not stop PID $pid." >&2
            exit 1
        fi
    fi
done

for ((attempt = 0; attempt < 50; attempt++)); do
    remaining=$(listeners)
    if [ -z "$remaining" ]; then
        exit 0
    fi
    sleep 0.1
done

echo "Development ports are still occupied; startup cancelled." >&2
exit 1
