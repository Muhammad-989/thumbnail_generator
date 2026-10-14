FROM node:22-bookworm-slim

WORKDIR /app

COPY server/package*.json ./
RUN npm ci --omit=dev
COPY server/index.js server/seed.js ./
COPY client/src/assets ./client/src/assets

EXPOSE 5000
CMD ["npm", "start"]
