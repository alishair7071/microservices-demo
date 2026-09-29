FROM node:20-alpine
WORKDIR /app
COPY shared/consul-registration.js ./consul-registration.js
COPY resilience-target-service/server.js .
CMD ["node", "server.js"]
