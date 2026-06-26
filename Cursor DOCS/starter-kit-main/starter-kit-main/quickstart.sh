#!/usr/bin/env bash
# Abu Dhabi AI PropTech Challenge — one command to a running AI agent.
#
#   ./quickstart.sh
#
# Creates a local virtualenv, installs the few dependencies, and runs the
# land-intelligence example end to end. No API keys needed.
set -euo pipefail
cd "$(dirname "$0")"

PY="${PYTHON:-python3}"
if ! command -v "$PY" >/dev/null 2>&1; then
  echo "❌ python3 not found. Install Python 3.10+ from https://python.org and retry."
  exit 1
fi
if ! "$PY" -c 'import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)'; then
  echo "❌ Python 3.10+ required (you have $($PY -V 2>&1)). Install a newer Python and retry."
  exit 1
fi

echo "▸ Creating virtualenv (.venv)…"
"$PY" -m venv .venv
echo "▸ Installing dependencies (pandas, matplotlib, jupyter)…"
.venv/bin/pip install --quiet --upgrade pip
.venv/bin/pip install --quiet pandas matplotlib jupyter

echo "▸ Running the Land Intelligence example agent…"
echo
(cd examples/land-intelligence-agent && ../../.venv/bin/python main.py)

cat <<'EOF'
✅ You're set. Next moves:

  ▸ Explore the data:    .venv/bin/jupyter notebook notebooks/explore_sample_data.ipynb
  ▸ Try the other agents: examples/investment-matching-agent · examples/decision-copilot
  ▸ Build a web UI:       https://github.com/abu-dhabi-ai-proptech-challenge/project-template
  ▸ Stuck? Discord:       https://discord.gg/jy3QDxQ3jK
EOF
