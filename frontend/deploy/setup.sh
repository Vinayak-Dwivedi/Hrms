#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# HRMS — one-shot bootstrap for Ubuntu 22.04+ EC2 (monorepo edition).
#
#   • hrms-web (Next.js) on :3000   ← ./frontend in the monorepo
#   • hrms-api (Express) on :4000   ← ./hrms-api in the monorepo
#   • Postgres 16 + nginx on the same box
#   • nginx routes:
#         /        → :3000  (Next.js frontend)
#         /api/*   → :4000  (Express API with JWT in httpOnly cookies)
#
# Run AS THE `ubuntu` USER on a fresh instance. Idempotent — safe to re-run.
#
#   curl -fsSL https://raw.githubusercontent.com/Vinayak-Dwivedi/Hrms/main/frontend/deploy/setup.sh -o setup.sh
#   chmod +x setup.sh
#   ./setup.sh
#
# Override the repo / branch / install dir by exporting REPO / BRANCH /
# ROOT_DIR before running.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# Single monorepo containing both services.
REPO="${REPO:-https://github.com/Vinayak-Dwivedi/Hrms.git}"
BRANCH="${BRANCH:-main}"
ROOT_DIR="${ROOT_DIR:-$HOME/hrms}"

WEB_DIR="$ROOT_DIR/frontend"
WEB_PORT="${WEB_PORT:-3000}"

API_DIR="$ROOT_DIR/hrms-api"
API_PORT="${API_PORT:-4000}"

DB_NAME="${DB_NAME:-hrms_prod}"
DB_USER="${DB_USER:-hrms}"

log() { printf "\n\033[1;36m▶ %s\033[0m\n" "$*"; }
fail() { printf "\n\033[1;31m✗ %s\033[0m\n" "$*" >&2; exit 1; }

[[ "$(id -un)" == "root" ]] && fail "Run as the 'ubuntu' user, not root."
command -v sudo >/dev/null || fail "sudo is required."

# ── 1. swap (t3.micro RAM is tight for next build) ──────────────────────────
if ! swapon --show | awk '{print $1}' | grep -qx '/swapfile'; then
  log "Creating 2 GB swap file"
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
fi

# ── 2. system packages ──────────────────────────────────────────────────────
log "Installing system packages"
sudo apt-get update -y
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
  curl ca-certificates gnupg git build-essential nginx postgresql-16 postgresql-contrib-16

if ! command -v node >/dev/null 2>&1 || ! node -v | grep -q '^v22\.'; then
  log "Installing Node 22 (NodeSource)"
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
log "Node version: $(node -v)"

# ── 3. Postgres ─────────────────────────────────────────────────────────────
log "Configuring Postgres"
sudo systemctl enable --now postgresql

# Preserve DB password across runs by reading it back from the API env file.
if [[ -z "${DB_PASSWORD:-}" ]] && [[ -f "$API_DIR/.env" ]] && grep -q '^DATABASE_URL=' "$API_DIR/.env"; then
  DB_PASSWORD="$(grep '^DATABASE_URL=' "$API_DIR/.env" | sed -E 's|.*://[^:]+:([^@]+)@.*|\1|')"
fi
DB_PASSWORD="${DB_PASSWORD:-$(openssl rand -hex 16)}"

sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" >/dev/null
sudo -u postgres psql -c "ALTER USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" >/dev/null

sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1 || \
  sudo -u postgres createdb -O "$DB_USER" "$DB_NAME"
sudo -u postgres psql -d "$DB_NAME" -c "CREATE EXTENSION IF NOT EXISTS citext;" >/dev/null
sudo -u postgres psql -d "$DB_NAME" -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;" >/dev/null

DATABASE_URL="postgres://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME"

# ── 4. detect public hostname ───────────────────────────────────────────────
log "Detecting EC2 public hostname"
IMDS_TOKEN="$(curl -fsS -X PUT 'http://169.254.169.254/latest/api/token' -H 'X-aws-ec2-metadata-token-ttl-seconds: 60' || true)"
PUBLIC_DNS="$(curl -fsS -H "X-aws-ec2-metadata-token: $IMDS_TOKEN" http://169.254.169.254/latest/meta-data/public-hostname || echo localhost)"
APP_URL="http://$PUBLIC_DNS"
log "Public URL: $APP_URL"

# ── 5. Monorepo clone (frontend + hrms-api) ─────────────────────────────────
log "Fetching HRMS monorepo into $ROOT_DIR"
if [[ ! -d "$ROOT_DIR/.git" ]]; then
  git clone -b "$BRANCH" "$REPO" "$ROOT_DIR"
else
  cd "$ROOT_DIR" && git fetch origin "$BRANCH" && git checkout "$BRANCH" && git pull --ff-only origin "$BRANCH"
fi
[[ -d "$API_DIR" ]] || fail "API subdir missing: $API_DIR"
[[ -d "$WEB_DIR" ]] || fail "Web subdir missing: $WEB_DIR"

# ── 5a. API service ─────────────────────────────────────────────────────────
log "Configuring hrms-api"
cd "$API_DIR"

# Preserve JWT secrets across runs so existing cookies remain valid.
ACCESS_SECRET="$(grep '^JWT_ACCESS_SECRET=' .env 2>/dev/null | cut -d= -f2- || true)"
REFRESH_SECRET="$(grep '^JWT_REFRESH_SECRET=' .env 2>/dev/null | cut -d= -f2- || true)"
[[ -z "$ACCESS_SECRET" ]]  && ACCESS_SECRET="$(openssl rand -hex 48)"
[[ -z "$REFRESH_SECRET" ]] && REFRESH_SECRET="$(openssl rand -hex 48)"

cat > .env <<EOF
# generated by deploy/setup.sh — do not commit
DATABASE_URL=$DATABASE_URL
PORT=$API_PORT
NODE_ENV=production
# Same-origin in prod via nginx → CORS allow-list not needed.
CORS_ORIGINS=
BODY_LIMIT_BYTES=1048576
JWT_ACCESS_SECRET=$ACCESS_SECRET
JWT_REFRESH_SECRET=$REFRESH_SECRET
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d
COOKIE_SECURE=false
COOKIE_DOMAIN=
ACCESS_COOKIE_NAME=hrms_at
REFRESH_COOKIE_NAME=hrms_rt
AUTH_RATE_LIMIT_WINDOW_MS=60000
AUTH_RATE_LIMIT_MAX=10
SEED_EMPLOYEE_PASSWORD=Employee@12345!
SEED_MANAGER_PASSWORD=Manager@12345!
EOF
chmod 600 .env

log "API: npm install"
npm install --no-audit --no-fund

log "API: applying migrations (idempotent)"
node - <<'NODE'
const fs = require('node:fs');
const path = require('node:path');
const postgres = require('postgres');
const drizzleDir = path.resolve('drizzle');
if (!fs.existsSync(drizzleDir)) { console.log('no drizzle/ dir'); process.exit(0); }
const dirs = fs.readdirSync(drizzleDir).filter(d => /^\d/.test(d)).sort();
if (!dirs.length) { console.log('no migrations'); process.exit(0); }
const env = fs.readFileSync('.env','utf8').split('\n');
const dbUrl = env.find(l => l.startsWith('DATABASE_URL=')).split('=').slice(1).join('=');
const sql = postgres(dbUrl, { max: 1, connect_timeout: 10 });
(async () => {
  for (const dir of dirs) {
    const file = path.join(drizzleDir, dir, 'migration.sql');
    if (!fs.existsSync(file)) continue;
    const stmts = fs.readFileSync(file,'utf8').split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean);
    let ok=0, skip=0;
    for (const s of stmts) {
      try { await sql.unsafe(s); ok++; }
      catch (e) { if (/already exists|duplicate/i.test(e.message)) skip++; else throw e; }
    }
    console.log(dir, 'applied=', ok, 'skipped=', skip);
  }
  // Ensure post-init schema bits exist
  await sql.unsafe('ALTER TABLE IF EXISTS employees ADD COLUMN IF NOT EXISTS user_id text');
  await sql.unsafe('CREATE INDEX IF NOT EXISTS idx_emp_user_id ON employees(user_id)');
  await sql.end();
})().catch(e => { console.error(e.message); process.exit(1); });
NODE

log "API: seeding HRMS demo + users (idempotent)"
npm run seed:hrms || true
npm run seed:users || true

log "API: build"
npm run build

sudo tee /etc/systemd/system/hrms-api.service >/dev/null <<UNIT
[Unit]
Description=HRMS API (Express)
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=ubuntu
WorkingDirectory=$API_DIR
EnvironmentFile=$API_DIR/.env
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
UNIT

sudo systemctl daemon-reload
sudo systemctl enable hrms-api
sudo systemctl restart hrms-api

# ── 5b. Web service ─────────────────────────────────────────────────────────
log "Configuring hrms-web"
cd "$WEB_DIR"

# Empty NEXT_PUBLIC_API_URL = "use same origin", which in prod is what nginx
# provides via the /api/* proxy below.
cat > .env.local <<EOF
NEXT_PUBLIC_API_URL=
NODE_ENV=production
EOF
chmod 600 .env.local

log "WEB: npm install"
npm install --legacy-peer-deps --no-audit --no-fund

log "WEB: build"
NODE_OPTIONS="--max-old-space-size=1500" npm run build

sudo tee /etc/systemd/system/hrms-web.service >/dev/null <<UNIT
[Unit]
Description=HRMS web (Next.js)
After=network.target hrms-api.service
Wants=hrms-api.service

[Service]
Type=simple
User=ubuntu
WorkingDirectory=$WEB_DIR
Environment=NODE_ENV=production
Environment=PORT=$WEB_PORT
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
UNIT

sudo systemctl daemon-reload
sudo systemctl enable hrms-web
sudo systemctl restart hrms-web

# ── 7. nginx — single virtual host that splits paths ────────────────────────
log "Installing nginx site (/ → :$WEB_PORT, /api → :$API_PORT)"
sudo tee /etc/nginx/sites-available/hrms >/dev/null <<NGINX
upstream hrms_web { server 127.0.0.1:$WEB_PORT; }
upstream hrms_api { server 127.0.0.1:$API_PORT; }

server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    client_max_body_size 10m;

    location /api/ {
        proxy_pass http://hrms_api;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 75s;
    }

    location / {
        proxy_pass http://hrms_web;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 75s;
    }
}
NGINX

sudo ln -sf /etc/nginx/sites-available/hrms /etc/nginx/sites-enabled/hrms
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl enable --now nginx
sudo systemctl restart nginx

# ── Summary ─────────────────────────────────────────────────────────────────
log "Deployment complete"
cat <<SUMMARY

  Public URL  : $APP_URL
  API service : sudo systemctl status hrms-api   (logs: journalctl -u hrms-api -f)
  Web service : sudo systemctl status hrms-web   (logs: journalctl -u hrms-web -f)
  DB          : postgres://$DB_USER@localhost:5432/$DB_NAME
  Env files   : $API_DIR/.env, $WEB_DIR/.env.local  (chmod 600)

  Login credentials (seeded):
    Employee  rahul@ileads.example   Employee@12345!
    Manager   priya@ileads.example   Manager@12345!

  To redeploy after pushing changes:
    cd $ROOT_DIR && git pull
    cd $API_DIR && npm install && npm run build && sudo systemctl restart hrms-api
    cd $WEB_DIR && npm install --legacy-peer-deps && \\
        npm run build && sudo systemctl restart hrms-web

SUMMARY
