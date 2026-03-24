# syntax=docker/dockerfile:1
# API (Express) + painel Next.js na mesma imagem: Express :3000 faz proxy para Next em 127.0.0.1:3001.

FROM node:20-alpine AS frontend-builder

RUN apk add --no-cache libc6-compat

WORKDIR /build/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./

# Mesma origem no browser (fetch /agendamentos → Express). Rewrites SSR → API local.
ARG NEXT_PUBLIC_API_BASE_URL=
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ARG API_INTERNAL_URL=http://127.0.0.1:3000
ENV API_INTERNAL_URL=$API_INTERNAL_URL

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# --- runtime: API + artefatos standalone do Next ---

FROM node:20-alpine

RUN apk add --no-cache curl tini

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

COPY --from=frontend-builder /build/frontend/.next/standalone /app/next
COPY --from=frontend-builder /build/frontend/.next/static /app/next/.next/static
COPY --from=frontend-builder /build/frontend/public /app/next/public

EXPOSE 3000

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["/app/docker-entrypoint.sh"]
