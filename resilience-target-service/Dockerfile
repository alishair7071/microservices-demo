FROM node:20-alpine
WORKDIR /app
COPY resilience-target-service/package*.json ./
RUN npm ci --omit=dev
COPY shared/consul-registration.js ./consul-registration.js
COPY shared/manual-tracing.js ./manual-tracing.js
COPY resilience-target-service/manual-trace.js .
COPY resilience-target-service/server.js .
CMD ["npm", "start"]
