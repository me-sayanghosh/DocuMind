#!/usr/bin/env bash
# ==============================================================================
# DocuMind VPS / Production Deployment Script
# ==============================================================================
set -euo pipefail

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BOLD}======================================================${NC}"
echo -e "${BOLD}       DocuMind Production Deployment Setup          ${NC}"
echo -e "${BOLD}======================================================${NC}"

# 1. Check Docker & Docker Compose
echo -e "\n[1/5] Checking Docker installation..."
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed.${NC}"
    echo "Install Docker: https://docs.docker.com/engine/install/"
    exit 1
fi

if ! docker compose version &> /dev/null; then
    echo -e "${RED}Error: Docker Compose plugin is not installed.${NC}"
    echo "Install Compose: https://docs.docker.com/compose/install/"
    exit 1
fi
echo -e "${GREEN}✓ Docker & Docker Compose detected.${NC}"

# 2. Check / Setup .env file
echo -e "\n[2/5] Checking environment configuration..."
if [ ! -f .env ]; then
    echo -e "${YELLOW}No .env file found. Creating from .env.production.example...${NC}"
    cp .env.production.example .env

    # Generate cryptographically secure JWT secret
    RANDOM_JWT=$(openssl rand -hex 32 2>/dev/null || python3 -c "import secrets; print(secrets.token_hex(32))")
    sed -i.bak "s/replace-with-openssl-rand-hex-32-output/${RANDOM_JWT}/" .env

    # Generate secure Postgres password
    RANDOM_PG_PASS=$(openssl rand -hex 16 2>/dev/null || python3 -c "import secrets; print(secrets.token_hex(16))")
    sed -i.bak "s/replace-with-a-strong-generated-database-password/${RANDOM_PG_PASS}/g" .env
    rm -f .env.bak

    echo -e "${GREEN}✓ Generated fresh .env with unique JWT_SECRET and POSTGRES_PASSWORD.${NC}"
    echo -e "${YELLOW}⚠️  IMPORTANT: Please edit .env to set your GEMINI_API_KEY and DOMAIN:${NC}"
    echo "   nano .env"
    exit 0
fi

# Verify GEMINI_API_KEY is present
if grep -q "your-gemini-api-key-here" .env || ! grep -q "GEMINI_API_KEY=" .env; then
    echo -e "${RED}⚠️  GEMINI_API_KEY is not configured in .env!${NC}"
    echo "   Please add your Google Gemini API key to .env before continuing:"
    echo "   GEMINI_API_KEY=AIza..."
    exit 1
fi
echo -e "${GREEN}✓ .env configuration verified.${NC}"

# 3. Build containers
echo -e "\n[3/5] Building production container images..."
docker compose -f docker-compose.prod.yml build

# 4. Launch stack
echo -e "\n[4/5] Starting services (Postgres, Redis, API, Worker, Web)..."
docker compose -f docker-compose.prod.yml up -d

# 5. Verify health
echo -e "\n[5/5] Waiting for system initialization and healthchecks..."
sleep 5

docker compose -f docker-compose.prod.yml ps

echo -e "\n${GREEN}======================================================${NC}"
echo -e "${GREEN}      DocuMind deployed successfully!               ${NC}"
echo -e "${GREEN}======================================================${NC}"
echo -e "Access the web UI at: ${BOLD}http://localhost${NC} (or your server's public IP / domain)"
echo -e "Check logs anytime with:  ${BOLD}make prod-logs${NC} or ${BOLD}docker compose -f docker-compose.prod.yml logs -f${NC}"
