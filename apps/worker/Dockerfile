FROM node:20-alpine

RUN apk add --no-cache openssl

WORKDIR /app
COPY . .
RUN npm ci
RUN npm run build --workspace @jobscheduler/db \
 && npm run build --workspace @jobscheduler/shared \
 && npm run build --workspace @jobscheduler/worker

ENV NODE_ENV=production

CMD ["node", "apps/worker/dist/index.js"]
