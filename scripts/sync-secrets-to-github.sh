#!/usr/bin/env bash
# Sync all environment variables from .env to GitHub Repository Secrets
# Usage: ./scripts/sync-secrets-to-github.sh

set -e

ENV_FILE=".env"

if [ ! -f "$ENV_FILE" ]; then
  echo "Error: $ENV_FILE not found."
  exit 1
fi

if ! command -v gh &> /dev/null; then
  echo "GitHub CLI (gh) is not installed."
  echo "Install it via: brew install gh"
  echo "Then authenticate: gh auth login"
  exit 1
fi

if ! gh auth status &> /dev/null; then
  echo "Not authenticated with GitHub CLI. Please run: gh auth login"
  exit 1
fi

echo "Syncing variables from $ENV_FILE to GitHub repository secrets..."

while IFS='=' read -r key val || [ -n "$key" ]; do
  # Trim leading/trailing whitespace
  key=$(echo "$key" | xargs)
  val=$(echo "$val" | xargs)

  # Skip empty lines or comments
  if [[ -z "$key" || "$key" =~ ^# ]]; then
    continue
  fi

  echo "Setting secret: $key"
  gh secret set "$key" --body "$val"
done < "$ENV_FILE"

echo "All secrets successfully pushed to GitHub repository!"
