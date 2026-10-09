# ---- 1. Build the React frontend -------------------------------------------
FROM node:20-alpine AS frontend
WORKDIR /app/frontend
COPY backend/frontend/package*.json ./
RUN npm ci
COPY backend/frontend/ ./
# API is same-origin in this deployment
ENV VITE_API_URL=/api
RUN npm run build

# ---- 2. Install production backend deps -------------------------------------
FROM node:20-alpine AS deps
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --omit=dev

# ---- 3. Runtime image ----------------------------------------------------------
FROM node:20-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY backend/ ./
COPY --from=frontend /app/frontend/dist ./frontend/dist
RUN mkdir -p /data/uploads && chown -R node:node /app /data
ENV UPLOAD_DIR=/data/uploads
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/api/health || exit 1
CMD ["node", "server.js"]
