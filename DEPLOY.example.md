# Chore Chart — Deploy Guide

Deploy Chore Chart on any Linux server (VM, VPS, cloud instance) with Docker.

## Prerequisites

- A Linux server with Docker and Docker Compose installed
- SSH access to the server
- A domain or IP address pointing to the server

## Server Setup

| Property       | Example Value                              |
|----------------|--------------------------------------------|
| Server IP      | `your-server-ip`                           |
| SSH User       | `root` (or your deploy user)               |
| App Directory  | `/opt/chore-chart`                         |
| App Port       | `80` (configurable in `docker-compose.yml`)|

## Initial Deployment

### 1. Copy the project to the server

```bash
rsync -avz --delete \
  --exclude node_modules --exclude .next --exclude .git \
  --exclude 'prisma/data' --exclude data --exclude '*.db' --exclude '.ssh' \
  -e "ssh -o StrictHostKeyChecking=no" \
  ./ user@your-server-ip:/opt/chore-chart/
```

### 2. Create the `.env` on the server

```bash
ssh user@your-server-ip 'cat > /opt/chore-chart/.env << EOF
DATABASE_URL=file:/app/data/dev.db
NEXTAUTH_SECRET=$(openssl rand -base64 32)
NEXTAUTH_URL=http://your-server-ip
SEED_ADMIN_PASSWORD=your-secure-password
EOF'
```

### 3. Build and start

```bash
ssh user@your-server-ip 'cd /opt/chore-chart && docker compose up -d --build'
```

The initial build takes ~5 minutes. On first start, the entrypoint will:
- Run `prisma db push` to create the SQLite database
- Seed with sample children, chores, and rewards

### 4. Verify

```bash
ssh user@your-server-ip 'docker compose -f /opt/chore-chart/docker-compose.yml ps'
ssh user@your-server-ip 'curl -s -o /dev/null -w "%{http_code}" http://localhost/login'
```

Expected: container `Up`, HTTP `200`.

Access the app at `http://your-server-ip`.

## Default Credentials

| Role   | Login              | Password/PIN                     |
|--------|--------------------|----------------------------------|
| Parent | `admin`            | `password123` (or your custom `SEED_ADMIN_PASSWORD`) |
| Kid    | Select name + PIN  | `1234`                           |

**Change these after first login.**

## Updating / Redeploying

### 1. Back up the database

```bash
ssh user@your-server-ip 'docker cp $(docker ps -qf name=chore-chart):/app/data/dev.db /opt/chore-chart/dev.db.backup'
```

### 2. Sync updated code

```bash
rsync -avz --delete \
  --exclude node_modules --exclude .next --exclude .git \
  --exclude 'prisma/data' --exclude data --exclude '*.db' --exclude '.ssh' \
  -e "ssh -o StrictHostKeyChecking=no" \
  ./ user@your-server-ip:/opt/chore-chart/
```

### 3. Rebuild

```bash
ssh user@your-server-ip 'cd /opt/chore-chart && docker compose up -d --build'
```

The SQLite database persists in a Docker volume (`chore-data`) and survives rebuilds.

## Operations

### View logs

```bash
ssh user@your-server-ip 'docker compose -f /opt/chore-chart/docker-compose.yml logs --tail=50'
```

### Restart

```bash
ssh user@your-server-ip 'docker compose -f /opt/chore-chart/docker-compose.yml restart'
```

### Stop / Start

```bash
ssh user@your-server-ip 'docker compose -f /opt/chore-chart/docker-compose.yml down'
ssh user@your-server-ip 'cd /opt/chore-chart && docker compose up -d'
```

### Restore database from backup

```bash
ssh user@your-server-ip 'docker cp /opt/chore-chart/dev.db.backup $(docker ps -qf name=chore-chart):/app/data/dev.db'
ssh user@your-server-ip 'docker compose -f /opt/chore-chart/docker-compose.yml restart'
```

### Clean Docker build cache

If disk space runs low:

```bash
ssh user@your-server-ip 'docker builder prune -af'
```

## Architecture

The Dockerfile uses a multi-stage build:

1. **base** — `node:20-alpine` with `openssl` (required by Prisma)
2. **deps** — `npm ci` with Prisma generate
3. **builder** — Next.js production build + seed script compilation
4. **runner** — Slim image with only standalone output + runtime dependencies

The entrypoint (`docker-entrypoint.sh`) checks if the database exists on each start. If not, it initializes and seeds it. If it does, it applies any pending schema changes.

## Important Warnings

- **NEVER** use `docker compose down -v` — the `-v` flag deletes the database volume and all data
- **NEVER** use `docker system prune -af` — this can remove needed images
- Always back up the database before redeploying
