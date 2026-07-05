# One-shot image used by the docker-compose "migrate" service to run
# `prisma migrate deploy` before api/worker start. Not used as a long-running
# container.
FROM node:20-alpine

RUN apk add --no-cache openssl

WORKDIR /app
COPY . .
RUN npm ci
RUN npm run build --workspace @jobscheduler/db

CMD ["npm", "run", "migrate:deploy", "--workspace", "@jobscheduler/db"]
