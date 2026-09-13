#!/usr/bin/env bash
# Credential-pattern gate — runs in CI on every push alongside gitleaks.
# Scans all TRACKED files for secret patterns that generic scanners miss:
# database URLs with embedded passwords, cloud pooler endpoints with creds,
# private key material, and common API-key shapes.
set -uo pipefail
# Scans the CURRENT git checkout (in CI: the actions/checkout workspace).
git rev-parse --show-toplevel >/dev/null 2>&1 || { echo "not inside a git repository"; exit 2; }

FAIL=0

# --- 1. Database connection strings with embedded credentials ---------------
DSN_RE='(postgres(ql)?|mysql|mongodb(\+srv)?|amqp|redis)://[^/[:space:]"]+:[^@/[:space:]"]+@'
# Safe shapes: docs placeholders, local dev defaults, scratch test fixtures,
# and credential-extraction code (code that PARSES urls, not secrets).
DSN_ALLOW_RE='user:pass@host|user:password@localhost|postgres:password@localhost|postgres:postgres@(localhost|127\.0\.0\.1)|postgres:password@\$\{?[A-Z_]+\}?|user:password@host:port|sed -E|PGPASS=\$\('

HITS=$(git grep -InE "$DSN_RE" -- . ':(exclude).env.example' ':(exclude)docker-compose*' ':(exclude)**/docker-compose*' 2>/dev/null | grep -Ev "$DSN_ALLOW_RE" || true)
if [ -n "$HITS" ]; then
  echo "LEAK: database credentials embedded in connection string:"
  echo "$HITS"
  FAIL=1
fi

# --- 2. Supabase pooler URLs with credentials (placeholders excluded) -------
HITS=$(git grep -InE 'pooler\.supabase\.(com|co):[0-9]+/postgres' -- . 2>/dev/null \
  | grep -E ':[^@/[:space:]]+@' | grep -vE '\[(project-ref|password)\]' || true)
if [ -n "$HITS" ]; then
  echo "LEAK: supabase pooler URL contains credentials:"
  echo "$HITS"
  FAIL=1
fi

# --- 3. Private key material ------------------------------------------------
HITS=$(git grep -In -- 'PRIVATE KEY-----' -- . ':(exclude)*check_secrets.sh' 2>/dev/null || true)
if [ -n "$HITS" ]; then
  echo "LEAK: private key material committed:"
  echo "$HITS"
  FAIL=1
fi

# --- 4. Secret-shaped values assigned to credential variables ---------------
KEY_RE='(AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY|STRIPE_SECRET_KEY|EASEBUZZ_SALT|EASEBUZZ_MERCHANT_KEY|JWT_SECRET|RESEND_API_KEY|DELHIVERY_API_KEY|R2_SECRET_ACCESS_KEY|GEMINI_API_KEY|OPENROUTER_API_KEY)[[:space:]]*[:=][[:space:]]*["'"'"']?[A-Za-z0-9_+/-]{16,}'
KEY_ALLOW_RE='test_webhook_secret|testkey|testsalt|test-secret-for-migrations-only|your-|<|xxx|changeme|os\.environ|getenv|env_file|SecretStr|Field\(|\$\{'

HITS=$(git grep -InE "$KEY_RE" -- . ':(exclude).env.example' ':(exclude)scripts/run_backend_tests.sh' 2>/dev/null | grep -Ev "$KEY_ALLOW_RE" || true)
if [ -n "$HITS" ]; then
  echo "LEAK: secret-shaped value assigned to a credential variable:"
  echo "$HITS"
  FAIL=1
fi

if [ "$FAIL" -eq 1 ]; then
  echo ""
  echo "FAILED: credential-pattern scan found issues above."
  echo "Move the secret to environment variables (.env, gitignored) and rotate it if it was ever pushed."
  exit 1
fi
echo "credential-pattern scan: clean"
