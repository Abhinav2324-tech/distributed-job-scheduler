FROM node:20-alpine AS build

WORKDIR /app
COPY . .
RUN npm ci

# Vite inlines VITE_* env vars at build time, so they must be passed as
# build args rather than runtime environment variables.
ARG VITE_API_URL=http://localhost:4000
ARG VITE_WS_URL=http://localhost:4000
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL

RUN npm run build --workspace @jobscheduler/shared \
 && npm run build --workspace @jobscheduler/web

FROM nginx:1.27-alpine
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
