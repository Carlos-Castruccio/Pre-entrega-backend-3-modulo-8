FROM node:24-bookworm-slim

WORKDIR /app
ENV NODE_ENV=production PORT=8080 UPLOAD_DIR=/data/uploads

COPY package.json package-lock.json ./
RUN npm ci --omit=dev \
    && mkdir -p /data/uploads /app/logs \
    && chown -R node:node /data/uploads /app/logs

COPY src ./src

USER node
EXPOSE 8080
CMD ["node", "src/server.js"]
