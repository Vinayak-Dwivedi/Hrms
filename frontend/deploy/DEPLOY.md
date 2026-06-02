# Deploying HRMS to AWS EC2

One-shot deploy of the **split** HRMS stack to a single Ubuntu EC2 box. Two
Node services share the host — both live in this monorepo:

| Service     | Port | Dir                  | Process              |
|-------------|------|----------------------|----------------------|
| `hrms-web`  | 3000 | `~/hrms/frontend`    | Next.js              |
| `hrms-api`  | 4000 | `~/hrms/hrms-api`    | Express + JWT auth   |

Postgres 16 and nginx also run on the same box. nginx is the only public
listener; it routes:

```
/        → 127.0.0.1:3000   (hrms-web)
/api/*   → 127.0.0.1:4000   (hrms-api)
```

This keeps the browser on a single origin, so the `hrms_at` / `hrms_rt`
httpOnly cookies issued by the API just work — no CORS, no third-party
cookie shenanigans.

For production-grade you'd move Postgres to RDS and put a load balancer in
front — see the **scaling notes** at the bottom.

---

## 0. Rotate your SSH key (one-time, do this first)

If your `.pem` private key has ever been pasted anywhere outside your laptop's
`~/.ssh/`, the key is compromised. Rotate it before continuing:

1. **AWS Console → EC2 → Network & Security → Key Pairs → Create key pair**.
   Name it something fresh (e.g. `hrms-key-v2`), type RSA, format `.pem`,
   download.
2. The simplest re-key path: **terminate the current instance and re-launch a
   new one** picking the new key. (AWS' "change key pair" flow doesn't fully
   replace the launch-time key on existing volumes.)
3. Locally: `chmod 400 ~/.ssh/hrms-key-v2.pem` and delete the old one.
4. Never share, paste, or commit a private key. Anywhere.

---

## 1. EC2 instance prerequisites

| Setting        | Value                                                                |
|----------------|----------------------------------------------------------------------|
| AMI            | Ubuntu Server 22.04 LTS or 24.04 LTS (x86_64)                        |
| Instance type  | **t3.small** (2 GB RAM) is comfortable for two Node services. **t3.micro** still works thanks to the swap file the script creates, but the Next.js build is the long pole. |
| Storage        | 20 GB gp3 (two `node_modules` plus a Next build cache adds up)       |
| Key pair       | The new key you just created                                         |
| Network        | Default VPC is fine                                                  |
| Security group | See below                                                            |

### Security group inbound rules

| Type  | Port | Source            | Why                       |
|-------|------|-------------------|---------------------------|
| SSH   | 22   | **My IP**         | Your laptop only          |
| HTTP  | 80   | `0.0.0.0/0`       | Public site access        |
| HTTPS | 443  | `0.0.0.0/0`       | Later, when you add TLS   |

Do **not** open ports `3000`, `4000`, or `5432` to the internet — nginx is
the only public-facing layer and only on port 80/443.

---

## 2. First-time setup (on the EC2)

SSH in:

```bash
chmod 400 ~/.ssh/hrms-key-v2.pem
ssh -i ~/.ssh/hrms-key-v2.pem ubuntu@<your-ec2-public-dns>
```

Once you have a shell, run the bootstrap script directly from GitHub. The
script lives at `frontend/deploy/setup.sh` in the monorepo:

```bash
curl -fsSL https://raw.githubusercontent.com/Vinayak-Dwivedi/Hrms/main/frontend/deploy/setup.sh -o setup.sh
chmod +x setup.sh
./setup.sh
```

It takes 6–10 minutes on a t3.micro (two `npm install` + `npm run build`
cycles plus a Next.js production build are the long parts). When it
finishes, it prints the public URL, service-control commands, and the
seeded login credentials.

### Pointing at your own fork

```bash
REPO=https://github.com/<you>/Hrms.git BRANCH=main ./setup.sh
```

The script is **idempotent** — re-running it pulls the latest commit, re-runs
migrations + seeders (both skip existing rows), rebuilds, and restarts the
two services. It also **preserves** the generated DB password and JWT
secrets across runs by reading them back from `$API_DIR/.env`, so existing
browser sessions keep working.

---

## 3. Verify

From your laptop:

```bash
# Web (Next.js)
curl -fsS http://<ec2-public-dns>/
# <!doctype html>...

# API (Express, via the same nginx host)
curl -fsS http://<ec2-public-dns>/api/health
# {"ok":true,...}
```

Then open `http://<ec2-public-dns>/login` in a browser and sign in:

| Role     | Email                    | Password         | Lands on             |
|----------|--------------------------|------------------|----------------------|
| Employee | `rahul@ileads.example`   | `Employee@12345!`| `/dashboard`         |
| Manager  | `priya@ileads.example`   | `Manager@12345!` | `/manager/dashboard` |

The other seeded employees (`aarav@…`, `kavya@…`, `rohan@…`, `ishaan@…`,
`vikram@…`) all use `Employee@12345!`.

---

## 4. Day-2 operations

```bash
# Tail logs
sudo journalctl -u hrms-api -f          # API (Express)
sudo journalctl -u hrms-web -f          # Web (Next.js)

# nginx logs
sudo tail -f /var/log/nginx/access.log /var/log/nginx/error.log

# Restart a service
sudo systemctl restart hrms-api
sudo systemctl restart hrms-web
sudo systemctl restart nginx            # after editing /etc/nginx/sites-available/hrms

# Connect to Postgres
sudo -u postgres psql hrms_prod
```

### Deploy a new commit

For code-only updates you don't need to re-run the full script. Pull once
at the monorepo root, then rebuild whichever service(s) changed:

```bash
cd ~/hrms && git pull
```

**API:**
```bash
cd ~/hrms/hrms-api
npm install --no-audit --no-fund        # only if package.json changed
npm run build
sudo systemctl restart hrms-api
```

**Web:**
```bash
cd ~/hrms/frontend
npm install --legacy-peer-deps          # only if package.json changed
npm run build
sudo systemctl restart hrms-web
```

If a new migration was added to the API (`drizzle/<timestamp>_<name>/migration.sql`)
re-run `./setup.sh` — its migration step is skip-on-exists and applies any
new files.

### Bumping the schema

`drizzle-kit` is a dev tool and lives only in the API's devDependencies.
Generate new migrations locally with `npm run db:generate` in `hrms-api/`,
commit them, push, then run `./setup.sh` on the box (or `npm run db:migrate`
inside `~/hrms/hrms-api`).

---

## 5. Adding HTTPS / a real domain (later)

1. Point an A record from your domain → EC2 public IP. (Allocate an **Elastic
   IP** in EC2 console first so the IP doesn't change on stop/start.)
2. Edit `/etc/nginx/sites-available/hrms` — change `server_name _;` to your
   domain.
3. Install certbot and request a certificate:

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

4. After TLS is on, edit `~/hrms/hrms-api/.env` and set `COOKIE_SECURE=true` so
   the auth cookies get the `Secure` flag. Optionally tighten things further:

   - `COOKIE_DOMAIN=your-domain.com`
   - `CORS_ORIGINS=` stays empty (same-origin still — the browser only ever
     talks to `https://your-domain.com`).

   Then restart:

```bash
sudo systemctl restart hrms-api hrms-web
```

If you ever decide to split the web and API onto different hostnames (e.g.
`app.example.com` / `api.example.com`), set on the API:

- `CORS_ORIGINS=https://app.example.com`
- `COOKIE_DOMAIN=.example.com`   *(leading dot so both subdomains share cookies)*

and on the web:

- `NEXT_PUBLIC_API_URL=https://api.example.com`

---

## 6. Troubleshooting

**`/api/health` returns 502 Bad Gateway**
- `sudo systemctl status hrms-api` — is it running?
- `sudo journalctl -u hrms-api -n 200 --no-pager` — what's it complaining about?
- The API listens on `127.0.0.1:4000`; `ss -lntp | grep 4000` should show node.

**`/` returns 502 Bad Gateway**
- Same drill for `hrms-web` / port 3000.

**Login succeeds but every API call returns 401**
- The browser isn't sending the cookies back. In dev that's almost always a
  CORS / `credentials: "include"` mismatch — confirm `NEXT_PUBLIC_API_URL` in
  `~/hrms-web/.env.local` is empty (so requests are same-origin via nginx).
- In prod with HTTPS, confirm `COOKIE_SECURE=true` in `~/hrms-api/.env`. If
  it's `false` and you're on HTTPS, the browser silently drops the cookie.

**Out-of-memory during build on t3.micro**
- The script already creates a 2 GB swap and caps Next.js with
  `NODE_OPTIONS=--max-old-space-size=1500`. If it's still failing, check
  `free -m` to verify swap is mounted, or upgrade to t3.small (2 GB RAM).

**DB connection refused**
- `sudo systemctl status postgresql` — is it up?
- `sudo -u postgres psql -c '\l'` — does `hrms_prod` exist?
- Re-run `./setup.sh` — the Postgres section is idempotent.

**JWT secret changed → everyone logged out**
- That's expected — old cookies can't be verified. Users sign in again. The
  script preserves the secret across runs by reading it back from
  `$API_DIR/.env`, so it should only happen if you deleted that file.

---

## 7. Notes / known limitations

- **Single box, no HA.** Both services and Postgres are on one EC2 instance.
  An instance restart is a downtime event.
- **HTTP-only by default.** The seed `COOKIE_SECURE=false` is for the initial
  EC2-DNS demo. **Flip it to `true` the moment you add TLS** so auth cookies
  stop traveling in the clear.
- **JWT revocation is best-effort.** Refresh tokens include a `jti` claim, but
  there is no server-side revocation list yet. Logging out clears the cookies
  on the client; if a refresh token leaked, it's valid until its expiry.
- **No backups configured.** For real use, schedule a daily
  `pg_dump hrms_prod | gzip > /var/backups/hrms-$(date +%F).sql.gz` via cron
  and copy off-box, or switch to RDS with automated snapshots.

---

## 8. When the demo grows up

When you want this to actually scale:

- Move Postgres to **RDS** (`db.t4g.micro` free-tier eligible). Update
  `DATABASE_URL` in `~/hrms-api/.env` and `sudo systemctl restart hrms-api`.
- Run the **API behind an ALB** with multiple EC2 instances or an ECS service;
  keep the web on its own ALB and target group. Terminate TLS at the ALBs and
  let nginx in front of the box go away.
- Move the `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` / DB password into
  **AWS Secrets Manager** and have the API pull them at boot.
- Add a **refresh-token revocation table** so `logout` can invalidate the
  `jti` server-side, not just clear the cookie.
- Move Next.js static assets to **S3 + CloudFront** by enabling
  `output: "standalone"` and `images.unoptimized` — or move the web tier to
  Vercel and keep the API on EC2 / ECS.
