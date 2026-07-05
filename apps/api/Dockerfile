FROM node:20-alpine

RUN apk add --no-cache openssl

WORKDIR /app
COPY . .
RUN npm ci
RUN npm run build --workspace @jobscheduler/db \
 && npm run build --workspace @jobscheduler/shared \
 && npm run build --workspace @jobscheduler/api

ENV NODE_ENV=production
EXPOSE 4000

CMD ["node", "apps/api/dist/index.js"]
