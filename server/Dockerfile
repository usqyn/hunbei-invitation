FROM node:18-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY . .

# Ensure directories exist
RUN mkdir -p /app/uploads/fonts /app/uploads/poster/templates /app/uploads/poster/stickers /app/uploads/poster/works && \
    chown -R node:node /app

VOLUME ["/app/data.db", "/app/poster.db", "/app/uploads"]

USER node

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

CMD ["node", "index.js"]
